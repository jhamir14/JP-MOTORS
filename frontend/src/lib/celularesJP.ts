/**
 * Metodología de financiamiento de celulares de Inversiones JP (cuotas semanales, interés simple mensual).
 *
 *   Tasa mensual según el precio al contado:
 *     · menos de S/ 1,000 ........ 15 %   (16 semanas)
 *     · S/ 1,000 a S/ 1,500 ...... 10 %   (16 semanas)
 *     · S/ 1,501 a S/ 2,000 ......  8 %   (16 semanas)
 *     · S/ 2,001 a S/ 3,000 ...... 7.5 %  (16 semanas)
 *     · más de S/ 3,000 ..........  5 %   (30 a 40 semanas)
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
  semanas: number;
  /** Plazos (semanas) que se ofrecen en la web. */
  plazos: number[];
}

/** Gama, tasa mensual, inicial y plazo por defecto según el precio al contado. */
export function gamaCelular(precio: number): GamaCelular {
  if (precio < 1000) return { nombre: "Gama económica", tasaMensual: 15, inicial: 150, semanas: 16, plazos: [16] };
  if (precio <= 1500) return { nombre: "Gama media", tasaMensual: 10, inicial: 150, semanas: 16, plazos: [16] };
  if (precio <= 2000) return { nombre: "Gama media-alta", tasaMensual: 8, inicial: 200, semanas: 16, plazos: [16] };
  if (precio <= 3000) return { nombre: "Gama alta", tasaMensual: 7.5, inicial: 300, semanas: 16, plazos: [16] };
  return { nombre: "Gama premium", tasaMensual: 5, inicial: 500, semanas: 32, plazos: [30, 32, 35, 38, 40] };
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
