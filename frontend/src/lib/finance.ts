/**
 * Cálculos financieros compartidos por la web pública (simuladores), el panel y los tests.
 *
 * Convenciones (las mismas de la base de datos, tabla tasa_servicio / plan_credito):
 *   · FRANCES: `tasaPorcentaje` es la tasa POR PERIODO (2 = 2 % mensual si la frecuencia es mensual).
 *   · FLAT:    `tasaPorcentaje` es el % TOTAL sobre el capital para todo el plazo (20 = 20 % flat).
 */

export const FRECUENCIAS = ["DIARIO", "SEMANAL", "QUINCENAL", "MENSUAL"] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number];

export const TIPOS_CALCULO = ["FRANCES", "FLAT"] as const;
export type TipoCalculo = (typeof TIPOS_CALCULO)[number];

/** Periodos de pago en un año. El diario se cobra de lunes a sábado (≈ 312 días). */
export const PERIODOS_POR_ANIO: Record<Frecuencia, number> = {
  DIARIO: 312,
  SEMANAL: 52,
  QUINCENAL: 24,
  MENSUAL: 12,
};

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, { adjetivo: string; singular: string; plural: string; abrev: string }> = {
  DIARIO: { adjetivo: "diaria", singular: "día", plural: "días", abrev: "día" },
  SEMANAL: { adjetivo: "semanal", singular: "semana", plural: "semanas", abrev: "sem" },
  QUINCENAL: { adjetivo: "quincenal", singular: "quincena", plural: "quincenas", abrev: "quinc." },
  MENSUAL: { adjetivo: "mensual", singular: "mes", plural: "meses", abrev: "mes" },
};

/**
 * Cuota de un préstamo con amortización francesa (cuota fija).
 * Cuota = P · i(1+i)^n / ((1+i)^n − 1). Con i = 0 se reparte el capital en partes iguales.
 */
export function cuotaFrancesa(principal: number, tasaPeriodo: number, periodos: number): number {
  if (principal <= 0 || periodos <= 0) return 0;
  if (tasaPeriodo === 0) return principal / periodos;
  const f = Math.pow(1 + tasaPeriodo, periodos);
  return (principal * tasaPeriodo * f) / (f - 1);
}

/** Tasa efectiva anual equivalente a una tasa por periodo (p. ej. mensual → 12 periodos). */
export function tasaEfectivaAnual(tasaPeriodo: number, periodosPorAnio: number): number {
  return Math.pow(1 + tasaPeriodo, periodosPorAnio) - 1;
}

/**
 * Tasa por periodo implícita (TIR) de un crédito: la tasa i tal que `periodos` cuotas iguales de
 * `cuota` amortizan exactamente `principal`. Se resuelve por bisección (monótona en i).
 * Devuelve 0 si la cuota no genera intereses y NaN si la cuota no alcanza a cubrir el capital.
 */
export function tasaImplicita(principal: number, cuota: number, periodos: number): number {
  if (principal <= 0 || periodos <= 0 || cuota <= 0) return NaN;
  const total = cuota * periodos;
  if (total < principal - 1e-9) return NaN;
  if (Math.abs(total - principal) < 1e-9) return 0;
  let lo = 0;
  let hi = 1;
  while (cuotaFrancesa(principal, hi, periodos) < cuota && hi < 1e6) hi *= 2;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (cuotaFrancesa(principal, mid, periodos) < cuota) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

const redondear2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CondicionesCredito {
  /** Precio del bien o capital del préstamo. */
  monto: number;
  cuotaInicial?: number;
  numeroCuotas: number;
  frecuencia: Frecuencia;
  tipoCalculo: TipoCalculo;
  /** Ver convenciones arriba. Obligatoria salvo que se indique `montoCuota`. */
  tasaPorcentaje?: number | null;
  /** Cuota fija definida por el admin: el sistema deduce la tasa. Tiene prioridad sobre la tasa. */
  montoCuota?: number | null;
}

export interface ResultadoCredito {
  financiado: number;
  cuota: number;
  totalIntereses: number;
  totalPagar: number;
  /** Tasa efectiva por periodo (TIR del flujo). */
  tasaPeriodo: number;
  /** TEA equivalente en porcentaje (p. ej. 26.82). NaN si no se puede calcular. */
  teaPorcentaje: number;
  /** Tasa en la convención del tipo de cálculo (por periodo en FRANCES, total en FLAT), en %. */
  tasaPorcentaje: number;
}

/**
 * Calcula cuota, intereses y TEA de unas condiciones de crédito. Es la misma función que usan
 * los simuladores públicos, la ficha de producto (planes) y el panel al definir un plan.
 */
export function calcularCredito(c: CondicionesCredito): ResultadoCredito {
  const inicial = Math.min(Math.max(c.cuotaInicial ?? 0, 0), Math.max(c.monto, 0));
  const financiado = Math.max(c.monto - inicial, 0);
  const n = Math.max(Math.floor(c.numeroCuotas), 0);
  const periodosAnio = PERIODOS_POR_ANIO[c.frecuencia];

  if (financiado === 0 || n === 0) {
    return { financiado, cuota: 0, totalIntereses: 0, totalPagar: 0, tasaPeriodo: 0, teaPorcentaje: 0, tasaPorcentaje: 0 };
  }

  let cuota: number;
  let tasaPorcentaje: number;
  if (c.montoCuota != null && c.montoCuota > 0) {
    cuota = c.montoCuota;
    const i = tasaImplicita(financiado, cuota, n);
    tasaPorcentaje =
      c.tipoCalculo === "FRANCES" ? i * 100 : ((cuota * n - financiado) / financiado) * 100;
  } else {
    const t = Math.max(c.tasaPorcentaje ?? 0, 0);
    tasaPorcentaje = t;
    cuota = c.tipoCalculo === "FRANCES" ? cuotaFrancesa(financiado, t / 100, n) : (financiado * (1 + t / 100)) / n;
  }

  const totalPagar = cuota * n;
  const tasaPeriodo = tasaImplicita(financiado, cuota, n);
  return {
    financiado,
    cuota,
    totalIntereses: totalPagar - financiado,
    totalPagar,
    tasaPeriodo,
    teaPorcentaje: Number.isNaN(tasaPeriodo) ? NaN : tasaEfectivaAnual(tasaPeriodo, periodosAnio) * 100,
    tasaPorcentaje,
  };
}

export interface CuotaCronograma {
  numero: number;
  cuota: number;
  capital: number;
  interes: number;
  saldo: number;
}

/**
 * Cronograma referencial redondeado a céntimos. La última cuota absorbe la diferencia de redondeo
 * para que capital + intereses cuadren exactamente con lo pactado.
 */
export function cronograma(c: CondicionesCredito): CuotaCronograma[] {
  const r = calcularCredito(c);
  const n = Math.floor(c.numeroCuotas);
  if (r.cuota === 0) return [];
  const cuota = redondear2(r.cuota);
  const filas: CuotaCronograma[] = [];
  let saldo = r.financiado;
  const interesFlat = redondear2(r.totalIntereses / n);
  for (let k = 1; k <= n; k++) {
    const ultima = k === n;
    let interes = c.tipoCalculo === "FLAT" && c.montoCuota == null ? interesFlat : redondear2(saldo * r.tasaPeriodo);
    let capital = redondear2(cuota - interes);
    if (ultima) {
      capital = redondear2(saldo);
      const interesesPrevios = filas.reduce((s, f) => s + f.interes, 0);
      interes = redondear2(redondear2(r.totalPagar) - r.financiado - interesesPrevios);
    }
    saldo = redondear2(saldo - capital);
    filas.push({ numero: k, cuota: redondear2(capital + interes), capital, interes, saldo: Math.max(saldo, 0) });
  }
  return filas;
}
