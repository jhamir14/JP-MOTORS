/**
 * Metodología de financiamiento de celulares de Inversiones JP (cuotas semanales, interés simple mensual).
 *
 *   Tasa mensual según el precio al contado (plazo sugerido · plazo máximo):
 *     · menos de S/ 1,000 ........ 15 %   (16 · hasta 24 semanas)
 *     · S/ 1,000 a S/ 1,500 ...... 10 %   (20 · hasta 28 semanas)
 *     · S/ 1,501 a S/ 2,000 ......  8 %   (20 · hasta 28 semanas)
 *     · S/ 2,001 a S/ 3,000 ...... 7.5 %  (24 · hasta 36 semanas)
 *     · más de S/ 3,000 ..........  5 %   (28 · hasta 48 semanas; iPhones y gama premium)
 *
 *   Plazos que se ofrecen: desde 12 semanas, de 4 en 4, solo los que dejan la cuota en S/ 200 por semana
 *   o menos (CUOTA_MAXIMA_SEMANAL). El sugerido es el primero desde el plazo sugerido de la gama que cumple
 *   ese tope: cuotas pequeñas para que el cliente se anime a comprar.
 *
 *   Saldo = Precio − Inicial · Meses = Semanas / 4 · Interés = round(Saldo × Tasa × Meses)
 *   Cuota semanal = round((Saldo + Interés) / Semanas) · Total pagado = Inicial + Cuota × Semanas
 *
 * (En la lista oficial los equipos de S/ 1,000 exactos llevan 10 %, por eso el primer tramo es «menos de S/ 1,000».)
 *
 * Lo usan la web (cotizador y tarjetas), el panel (planes del catálogo) y la migración que cargó el catálogo.
 * En la base, un plan JP se guarda como SEMANAL + FLAT con `tasa_porcentaje` = interés total del plazo
 * y `monto_cuota` = la cuota redondeada, así el cronograma del crédito cobra exactamente esa cuota.
 */

export interface GamaCelular {
  nombre: string;
  tasaMensual: number;
  inicial: number;
  /** Plazo sugerido de la gama (semanas). */
  semanas: number;
  /** Plazo más largo que se ofrece (semanas). */
  semanasMax: number;
}

/** Cuota semanal más alta que se ofrece en la web: los plazos que la superan no se muestran. */
export const CUOTA_MAXIMA_SEMANAL = 200;
/** Plazo más corto y salto entre plazos (semanas). */
export const PLAZO_MINIMO = 12;
export const PASO_PLAZO = 4;

/** Gama, tasa mensual, inicial y plazos según el precio al contado. */
export function gamaCelular(precio: number): GamaCelular {
  if (precio < 1000) return { nombre: "Gama económica", tasaMensual: 15, inicial: 150, semanas: 16, semanasMax: 24 };
  if (precio <= 1500) return { nombre: "Gama media", tasaMensual: 10, inicial: 150, semanas: 20, semanasMax: 28 };
  if (precio <= 2000) return { nombre: "Gama media-alta", tasaMensual: 8, inicial: 200, semanas: 20, semanasMax: 28 };
  if (precio <= 3000) return { nombre: "Gama alta", tasaMensual: 7.5, inicial: 300, semanas: 24, semanasMax: 36 };
  return { nombre: "Gama premium", tasaMensual: 5, inicial: 500, semanas: 28, semanasMax: 48 };
}

/**
 * Plazos (semanas) que se ofrecen para un celular con esa inicial: 12, 16, 20… hasta el máximo de su gama,
 * sin los que dejan la cuota por encima de S/ 200 (si ninguno cumple, queda el más largo).
 * Subir la inicial solo baja las cuotas, así que con la inicial mínima la lista vale para cualquier inicial.
 */
export function plazosCelular(precio: number, inicial: number, tasaMensual = gamaCelular(precio).tasaMensual): { plazos: number[]; sugerido: number } {
  const g = gamaCelular(precio);
  const todos: number[] = [];
  for (let s = PLAZO_MINIMO; s <= g.semanasMax; s += PASO_PLAZO) todos.push(s);
  const caben = todos.filter((s) => cotizarCelularJP(precio, inicial, s, tasaMensual).cuota <= CUOTA_MAXIMA_SEMANAL);
  const plazos = caben.length ? caben : [todos[todos.length - 1]];
  const sugerido = plazos.find((s) => s >= g.semanas) ?? plazos[plazos.length - 1];
  return { plazos, sugerido };
}

export interface CotizacionJP {
  precio: number;
  inicial: number;
  semanas: number;
  tasaMensual: number;
  saldo: number;
  /** Interés total del plazo, en % del saldo (tasa mensual × meses). */
  interesTotalPct: number;
  interes: number;
  totalFinanciado: number;
  cuota: number;
  /** Inicial + cuota × semanas (lo que realmente paga el cliente). */
  totalPagado: number;
}

const redondearSol = (n: number) => Math.round(n + 1e-9);

/** Cotiza un celular con la metodología JP. `tasaMensual` permite fijar la tasa (por defecto, la de su gama). */
export function cotizarCelularJP(precio: number, inicial: number, semanas: number, tasaMensual = gamaCelular(precio).tasaMensual): CotizacionJP {
  const saldo = Math.max(precio - inicial, 0);
  const interesTotalPct = Math.round(tasaMensual * (semanas / 4) * 1000) / 1000;
  const interes = redondearSol((saldo * interesTotalPct) / 100);
  const totalFinanciado = saldo + interes;
  const cuota = semanas > 0 ? redondearSol(totalFinanciado / semanas) : 0;
  return {
    precio,
    inicial,
    semanas,
    tasaMensual,
    saldo,
    interesTotalPct,
    interes,
    totalFinanciado,
    cuota,
    totalPagado: inicial + cuota * semanas,
  };
}

/** Fila de `plan_credito` que corresponde a una cotización JP. */
export function planJP(c: CotizacionJP) {
  return {
    nombre: `Plan JP · ${c.semanas} semanas`,
    cuota_inicial: c.inicial,
    numero_cuotas: c.semanas,
    frecuencia: "SEMANAL" as const,
    tipo_calculo: "FLAT" as const,
    tasa_porcentaje: c.interesTotalPct,
    monto_cuota: c.cuota,
  };
}

/** Los planes creados con la metodología llevan este prefijo (se recalculan si cambia el precio). */
export const PREFIJO_PLAN_JP = "Plan JP";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

/** «8GB RAM | 128GB | 5G | …» → especificaciones de la ficha (RAM, Almacenamiento, Red…). */
export function specsCelular(texto: string, marca: string): Record<string, string> {
  const out: Record<string, string> = { Sistema: marca === "Apple" ? "iOS" : "Android" };
  const extra: string[] = [];
  const poner = (k: string, v: string) => (out[k] ? extra.push(v) : (out[k] = v));
  for (const t of texto.split("|").map((x) => x.trim()).filter(Boolean)) {
    if (/RAM/i.test(t)) poner("RAM", t.replace(/\s*RAM/i, ""));
    else if (/^\d+\s*(GB|TB)$/i.test(t)) poner("Almacenamiento", t);
    else if (/^[45]G$/i.test(t)) poner("Red", t);
    else if (/mAh/i.test(t)) poner("Batería", t);
    else if (/^\d+W$/i.test(t)) poner("Carga rápida", t);
    else if (/^IP\d/i.test(t)) poner("Resistencia", t);
    else if (/Bionic|Snapdragon|Helio|Dimensity|Exynos|Unisoc|^A\d+ Pro$/i.test(t)) poner("Procesador", t);
    else if (/MP/.test(t)) poner("Cámara", t);
    else if (/Hz|OLED|AMOLED|"|FHD/i.test(t)) poner("Pantalla", t);
    else extra.push(t);
  }
  if (extra.length) out["Destacado"] = extra.join(" · ");
  return out;
}

/** Enlace (slug) del modelo: marca + nombre, salvo que el catálogo ya tenga uno (`slug`). */
export const slugCelular = (c: { marca: string; nombre: string; slug?: string }) =>
  c.slug ?? slugify(c.nombre.toLowerCase().startsWith(c.marca.toLowerCase()) ? c.nombre : `${c.marca} ${c.nombre}`);
