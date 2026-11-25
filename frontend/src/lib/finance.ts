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
