/**
 * Reglas del cotizador público, compartidas por el navegador (cálculo en vivo) y por
 * /api/cotizaciones (que vuelve a calcular todo con los datos del servidor: no se confía en el cliente).
 *
 * La tasa sale de tasa_servicio (las tasas públicas que se administran en /admin/tasas), así que
 * la cuota de la web es la misma que el panel usa al abrir un crédito.
 */
import { z } from "zod";
import { esVehiculo, planDestacado, servicioDeProducto, type Producto, type TasaPublica } from "./catalogo";
import { cotizarCelularJP, gamaCelular, PREFIJO_PLAN_JP } from "./celularesJP";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, calcularCredito, type Frecuencia } from "./finance";
import { formatSoles } from "./format";

/** Plazos que se ofrecen como botones rápidos (se filtran al rango de cada tasa). */
const PLAZOS_SUGERIDOS: Record<Frecuencia, number[]> = {
  DIARIO: [60, 90, 120, 180, 200, 300, 400],
  SEMANAL: [8, 12, 16, 24, 32, 52],
  QUINCENAL: [4, 6, 8, 12, 18, 24],
  MENSUAL: [6, 12, 18, 24, 36],
};

export interface ReglasCotizacion {
  tasas: TasaPublica[];
  inicialMin: number;
  inicialMax: number;
  paso: number;
}

/** Cuota inicial mínima de motos, motokar y toritos. */
export const INICIAL_MINIMA_VEHICULO = 1000;

const redondear = (v: number, paso: number) => Math.round(v / paso) * paso;

/**
 * Límites de la cuota inicial y tasas disponibles para un producto.
 * Vehículos: inicial desde S/ 1,000 hasta el 70 % del precio. Celulares: desde S/ 0 hasta 60 %.
 */
export function reglasCotizacion(producto: Producto, tasasPublicas: TasaPublica[]): ReglasCotizacion {
  if (!esVehiculo(producto)) return reglasCelularJP(producto);
  const servicio = servicioDeProducto(producto);
  const tasas = tasasPublicas
    .filter((t) => t.servicio === servicio && t.cuotasMax >= t.cuotasMin)
    .sort((a, b) => FRECUENCIAS.indexOf(a.frecuencia) - FRECUENCIAS.indexOf(b.frecuencia));
  const paso = producto.precio >= 5000 ? 100 : 50;
  const vehiculo = esVehiculo(producto);
  const inicialMin = vehiculo ? INICIAL_MINIMA_VEHICULO : 0;
  const inicialMax = Math.max(inicialMin, Math.floor((producto.precio * (vehiculo ? 0.7 : 0.6)) / paso) * paso);
  return { tasas, inicialMin, inicialMax, paso };
}

/**
 * Celulares: metodología JP. Tasa mensual de su gama, cuotas semanales y la inicial del plan JP del
 * producto (o la de su gama) como mínimo; el plazo es el del plan (16 semanas, o 30–40 en gama premium).
 */
function reglasCelularJP(producto: Producto): ReglasCotizacion {
  const g = gamaCelular(producto.precio);
  const plan = producto.planes.find((p) => p.nombre?.startsWith(PREFIJO_PLAN_JP) && p.frecuencia === "SEMANAL");
  const plazos = Array.from(new Set([...g.plazos, ...(plan ? [plan.numeroCuotas] : [])])).sort((a, b) => a - b);
  const paso = 10;
  const inicialMin = Math.min(plan?.cuotaInicial ?? g.inicial, Math.floor(producto.precio / 2));
  const inicialMax = Math.max(inicialMin, Math.floor((producto.precio * 0.6) / paso) * paso);
  const tasa: TasaPublica = {
    servicio: "CREDITO_CELULAR",
    frecuencia: "SEMANAL",
    tipoCalculo: "FLAT",
    tasaPorcentaje: g.tasaMensual,
    cuotasMin: plazos[0],
    cuotasMax: plazos[plazos.length - 1],
    metodoJP: true,
    plazos,
  };
  return { tasas: producto.precio > 0 ? [tasa] : [], inicialMin, inicialMax, paso };
}

export function plazosSugeridos(tasa: TasaPublica): number[] {
  if (tasa.plazos?.length) return tasa.plazos;
  const lista = PLAZOS_SUGERIDOS[tasa.frecuencia].filter((n) => n >= tasa.cuotasMin && n <= tasa.cuotasMax);
  return lista.length ? lista : [tasa.cuotasMin, tasa.cuotasMax].filter((n, i, a) => a.indexOf(n) === i);
}

export interface Seleccion {
  inicial: number;
  numeroCuotas: number;
  frecuencia: Frecuencia;
}

/** Punto de partida: el plan publicado más conveniente del producto, ajustado a las reglas. */
export function seleccionInicial(producto: Producto, reglas: ReglasCotizacion): Seleccion | null {
  const plan = planDestacado(producto)?.plan;
  const tasa = reglas.tasas.find((t) => t.frecuencia === plan?.frecuencia) ?? reglas.tasas[0];
  if (!tasa) return null;
  const sugeridos = plazosSugeridos(tasa);
  const vehiculo = esVehiculo(producto);
  // Vehículos: se parte de la inicial mínima y el plazo más largo (como se ofrece en tienda).
  const n = vehiculo
    ? tasa.cuotasMax
    : plan && plan.frecuencia === tasa.frecuencia ? plan.numeroCuotas : sugeridos[Math.floor(sugeridos.length / 2)];
  const inicialBase = vehiculo ? reglas.inicialMin : plan ? plan.cuotaInicial : 0;
  return {
    frecuencia: tasa.frecuencia,
    numeroCuotas: Math.min(Math.max(n, tasa.cuotasMin), tasa.cuotasMax),
    inicial: Math.min(Math.max(redondear(inicialBase, reglas.paso), reglas.inicialMin), reglas.inicialMax),
  };
}

export interface ResultadoCotizacion extends Seleccion {
  precio: number;
  financiado: number;
  cuota: number;
  totalCuotas: number;
  tasaPorcentaje: number;
}

/** Valida la selección contra las reglas y calcula la cuota. Devuelve null si algo está fuera de rango. */
export function cotizar(producto: Producto, reglas: ReglasCotizacion, s: Seleccion): ResultadoCotizacion | null {
  const tasa = reglas.tasas.find((t) => t.frecuencia === s.frecuencia);
  if (!tasa) return null;
  if (!Number.isInteger(s.numeroCuotas) || s.numeroCuotas < tasa.cuotasMin || s.numeroCuotas > tasa.cuotasMax) return null;
  if (!Number.isFinite(s.inicial) || s.inicial < reglas.inicialMin || s.inicial > reglas.inicialMax) return null;
  if (tasa.metodoJP) {
    if (tasa.plazos && !tasa.plazos.includes(s.numeroCuotas)) return null;
    const jp = cotizarCelularJP(producto.precio, s.inicial, s.numeroCuotas, tasa.tasaPorcentaje);
    return { ...s, precio: producto.precio, financiado: jp.saldo, cuota: jp.cuota, totalCuotas: jp.cuota * s.numeroCuotas, tasaPorcentaje: tasa.tasaPorcentaje };
  }
  const r = calcularCredito({
    monto: producto.precio,
    cuotaInicial: s.inicial,
    numeroCuotas: s.numeroCuotas,
    frecuencia: tasa.frecuencia,
    tipoCalculo: tasa.tipoCalculo,
    tasaPorcentaje: tasa.tasaPorcentaje,
  });
  const cuota = Math.ceil(r.cuota * 10) / 10;
  return {
    ...s,
    precio: producto.precio,
    financiado: r.financiado,
    cuota,
    totalCuotas: Math.round(cuota * s.numeroCuotas * 100) / 100,
    tasaPorcentaje: tasa.tasaPorcentaje,
  };
}

export const textoPlazo = (n: number, f: Frecuencia) => `${n} ${n === 1 ? ETIQUETA_FRECUENCIA[f].singular : ETIQUETA_FRECUENCIA[f].plural}`;
export const textoCuota = (r: Pick<ResultadoCotizacion, "cuota" | "frecuencia">) =>
  `${formatSoles(r.cuota, true)} ${ETIQUETA_FRECUENCIA[r.frecuencia].adjetivo}`;

/** Mensaje que el cliente envía por WhatsApp al terminar su cotización. */
export function mensajeWhatsAppCotizacion(nombreProducto: string, r: ResultadoCotizacion, nombre?: string) {
  return [
    `Hola, ${nombre ? `soy ${nombre} y ` : ""}acabo de cotizar en la web de Inversiones JP:`,
    `• Producto: ${nombreProducto} (${formatSoles(r.precio)})`,
    `• Inicial: ${r.inicial > 0 ? formatSoles(r.inicial) : "sin inicial"}`,
    `• Plazo: ${textoPlazo(r.numeroCuotas, r.frecuencia)}`,
    `• Cuota referencial: ${textoCuota(r)}`,
    "¿Me ayudan con los requisitos?",
  ].join("\n");
}

/* ───────────────────────── Formulario ───────────────────────── */

export const cotizacionSchema = z.object({
  productoSlug: z.string().trim().min(1).max(160),
  inicial: z.coerce.number().min(0).max(1_000_000),
  numeroCuotas: z.coerce.number().int().min(1).max(400),
  frecuencia: z.enum(FRECUENCIAS),
  nombre: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre")
    .max(80, "El nombre es demasiado largo")
    .refine((v) => /\p{L}/u.test(v), "Escribe tu nombre"),
  celular: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?51/, ""))
    .refine((v) => /^9\d{8}$/.test(v), "Escribe un celular de 9 dígitos que empiece con 9"),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .max(120, "El correo es demasiado largo")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Revisa el correo"),
  aceptaDatos: z.literal(true, { errorMap: () => ({ message: "Marca la casilla para poder contactarte" }) }),
});

export type CotizacionInput = z.input<typeof cotizacionSchema>;
