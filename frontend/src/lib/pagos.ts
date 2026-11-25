/**
 * Pagos y cobranzas (Fase 5): reparto de un pago entre las cuotas, mora, deuda del día y caja.
 *
 * Funciones puras (sin base de datos): las usan la vista previa del formulario de pago (navegador),
 * la Server Action que registra el pago (servidor) y los tests. Todo se calcula en céntimos enteros
 * para no arrastrar errores de redondeo.
 *
 * Regla de aplicación: las cuotas se pagan en orden de vencimiento y, dentro de cada cuota,
 * primero la mora, luego el interés y al final el capital. Lo que sobra pasa a la siguiente cuota
 * (pago adelantado). Un pago no puede superar la deuda total del crédito.
 */

export const METODOS_PAGO = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "DEPOSITO", "OTRO"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];
export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  OTRO: "Otro",
};
/** Métodos digitales: exigen n.º de operación (la base también lo exige). */
export const requiereOperacion = (m: MetodoPago) => m !== "EFECTIVO" && m !== "OTRO";

/** Roles que anulan pagos y reabren cajas (igual que las políticas RLS). */
export const ROLES_ANULAN_PAGOS = ["SUPERADMIN", "ADMIN_CREDITOS"] as const;
export const puedeAnularPagos = (rol: string) => (ROLES_ANULAN_PAGOS as readonly string[]).includes(rol);

export const MIN_MOTIVO_ANULACION_PAGO = 10;
export function errorMotivoAnulacionPago(motivo: string): string | null {
  const m = motivo.trim();
  if (m.length < MIN_MOTIVO_ANULACION_PAGO) return `Explica el motivo (mínimo ${MIN_MOTIVO_ANULACION_PAGO} caracteres)`;
  if (m.length > 500) return "Máximo 500 caracteres";
  return null;
}

const cts = (n: number) => Math.round((n + Math.sign(n) * Number.EPSILON) * 100);
const sol = (c: number) => c / 100;

/** Cuota con lo pactado y lo ya cobrado (de pagos no anulados). Montos en soles. */
export interface CuotaCobro {
  id: string;
  numero: number;
  /** AAAA-MM-DD */
  fechaVencimiento: string;
  interes: number;
  capital: number;
  /** Mora vigente de la cuota (ya calculada para hoy). */
  mora: number;
  moraPagada: number;
  interesPagado: number;
  capitalPagado: number;
  /** true si la cuota ya figura como pagada (p. ej. migrada del sistema anterior). */
  pagada?: boolean;
}

export interface Aplicacion {
  cuotaId: string;
  numero: number;
  mora: number;
  interes: number;
  capital: number;
  total: number;
  /** La cuota queda totalmente pagada con este pago. */
  cancela: boolean;
}

interface Pendiente {
  mora: number;
  interes: number;
  capital: number;
  total: number;
}

/** Lo que falta pagar de una cuota, por concepto, en céntimos. */
function pendienteCts(c: CuotaCobro): Pendiente {
  if (c.pagada) return { mora: 0, interes: 0, capital: 0, total: 0 };
  const mora = Math.max(cts(c.mora) - cts(c.moraPagada), 0);
  const interes = Math.max(cts(c.interes) - cts(c.interesPagado), 0);
  const capital = Math.max(cts(c.capital) - cts(c.capitalPagado), 0);
  return { mora, interes, capital, total: mora + interes + capital };
}

/** Saldo de una cuota en soles (mora + interés + capital pendientes). */
export const saldoCuota = (c: CuotaCobro) => sol(pendienteCts(c).total);

const ordenar = (cuotas: readonly CuotaCobro[]) =>
  [...cuotas].sort((a, b) => (a.fechaVencimiento === b.fechaVencimiento ? a.numero - b.numero : a.fechaVencimiento < b.fechaVencimiento ? -1 : 1));

/** Deuda total del crédito (todas las cuotas con saldo), en soles. */
export const deudaTotal = (cuotas: readonly CuotaCobro[]) => sol(cuotas.reduce((s, c) => s + pendienteCts(c).total, 0));

export interface Distribucion {
  aplicaciones: Aplicacion[];
  /** Lo que no se pudo aplicar (sobrepago). Un pago válido tiene sobrante 0. */
  sobrante: number;
  /** Cuotas que quedan totalmente pagadas. */
  cuotasCanceladas: number[];
}

/** Reparte `monto` (soles) entre las cuotas: orden de vencimiento y mora → interés → capital. */
export function distribuirPago(cuotas: readonly CuotaCobro[], monto: number): Distribucion {
  let resto = Math.max(cts(monto), 0);
  const aplicaciones: Aplicacion[] = [];
  for (const c of ordenar(cuotas)) {
    if (resto <= 0) break;
    const p = pendienteCts(c);
    if (p.total <= 0) continue;
    const mora = Math.min(resto, p.mora);
    resto -= mora;
    const interes = Math.min(resto, p.interes);
    resto -= interes;
    const capital = Math.min(resto, p.capital);
    resto -= capital;
    const total = mora + interes + capital;
    aplicaciones.push({
      cuotaId: c.id,
      numero: c.numero,
      mora: sol(mora),
      interes: sol(interes),
      capital: sol(capital),
      total: sol(total),
      cancela: total === p.total,
    });
  }
  return { aplicaciones, sobrante: sol(resto), cuotasCanceladas: aplicaciones.filter((a) => a.cancela).map((a) => a.numero) };
}

export interface ResumenDeuda {
  /** Saldo de las cuotas vencidas (antes de hoy), mora incluida. */
  vencido: number;
  cuotasVencidas: number;
  /** Mora pendiente de todas las cuotas. */
  mora: number;
  /** Saldo de la cuota que vence hoy (0 si ninguna). */
  hoy: number;
  /** Lo exigible hoy: vencido + cuota de hoy. */
  exigible: number;
  /** Para cancelar todo el crédito hoy. */
  total: number;
  /** Próxima cuota con saldo que vence después de hoy. */
  proxima: { numero: number; fecha: string; saldo: number } | null;
  /** Días de atraso de la cuota vencida más antigua. */
  diasAtraso: number;
}

const dias = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

export function resumenDeuda(cuotas: readonly CuotaCobro[], hoy: string): ResumenDeuda {
  let vencido = 0, cuotasVencidas = 0, mora = 0, deHoy = 0, total = 0;
  let proxima: ResumenDeuda["proxima"] = null;
  let masAntigua: string | null = null;
  for (const c of ordenar(cuotas)) {
    const p = pendienteCts(c);
    if (p.total <= 0) continue;
    total += p.total;
    mora += p.mora;
    if (c.fechaVencimiento < hoy) {
      vencido += p.total;
      cuotasVencidas++;
      masAntigua ??= c.fechaVencimiento;
    } else if (c.fechaVencimiento === hoy) deHoy += p.total;
    else proxima ??= { numero: c.numero, fecha: c.fechaVencimiento, saldo: sol(p.total) };
  }
  return {
    vencido: sol(vencido),
    cuotasVencidas,
    mora: sol(mora),
    hoy: sol(deHoy),
    exigible: sol(vencido + deHoy),
    total: sol(total),
    proxima,
    diasAtraso: masAntigua ? dias(masAntigua, hoy) : 0,
  };
}

/**
 * Mora de una cuota (misma fórmula que `actualizar_mora()` en la base):
 * penalidad diaria × días de atraso que pasan los días de gracia, con tope opcional (% de la cuota).
 */
export function calcularMora(o: { penalidadDiaria: number; vencimiento: string; hoy: string; diasGracia: number; montoCuota?: number; topePorcentaje?: number | null }): number {
  const atraso = Math.max(dias(o.vencimiento, o.hoy) - o.diasGracia, 0);
  let mora = Math.round(cts(o.penalidadDiaria) * atraso);
  if (o.topePorcentaje != null && o.montoCuota != null) mora = Math.min(mora, Math.round((cts(o.montoCuota) * o.topePorcentaje) / 100));
  return sol(mora);
}

export type TramoMora = "1-7" | "8-15" | "16-30" | "30+";
export const TRAMOS_MORA: { id: TramoMora; etiqueta: string }[] = [
  { id: "1-7", etiqueta: "1–7 días" },
  { id: "8-15", etiqueta: "8–15 días" },
  { id: "16-30", etiqueta: "16–30 días" },
  { id: "30+", etiqueta: "+30 días" },
];
export const tramoMora = (diasAtraso: number): TramoMora => (diasAtraso <= 7 ? "1-7" : diasAtraso <= 15 ? "8-15" : diasAtraso <= 30 ? "16-30" : "30+");

export interface EntradaPago {
  monto: number;
  metodo: MetodoPago;
  numeroOperacion?: string | null;
}

/** Errores de un pago por campo (vacío = válido). `deuda` es la deuda total del crédito hoy. */
export function validarPago(p: EntradaPago, deuda: number): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Number.isFinite(p.monto) || p.monto <= 0) e.monto = "Ingresa un monto mayor a 0";
  else if (Math.abs(cts(p.monto) - p.monto * 100) > 1e-6) e.monto = "Máximo dos decimales";
  else if (cts(p.monto) > cts(deuda))
    e.monto = deuda > 0 ? `El monto supera la deuda total del crédito (S/ ${deuda.toFixed(2)})` : "El crédito no tiene deuda pendiente";
  if (!METODOS_PAGO.includes(p.metodo)) e.metodo = "Elige el método de pago";
  else if (requiereOperacion(p.metodo) && !(p.numeroOperacion ?? "").trim()) e.numeroOperacion = "Indica el n.º de operación";
  if ((p.numeroOperacion ?? "").length > 60) e.numeroOperacion = "Máximo 60 caracteres";
  return e;
}

export interface PagoCaja {
  monto: number;
  metodo: MetodoPago;
  anulado?: boolean;
}

/** Totales de caja (como el trigger de `cierre_caja`): efectivo vs. digital, sin pagos anulados. */
export function resumenCaja(pagos: readonly PagoCaja[]) {
  let efectivo = 0, digital = 0, cantidad = 0;
  const porMetodo: Partial<Record<MetodoPago, number>> = {};
  for (const p of pagos) {
    if (p.anulado) continue;
    const c = cts(p.monto);
    cantidad++;
    if (p.metodo === "EFECTIVO") efectivo += c;
    else digital += c;
    porMetodo[p.metodo] = sol(cts(porMetodo[p.metodo] ?? 0) + c);
  }
  return { efectivo: sol(efectivo), digital: sol(digital), total: sol(efectivo + digital), cantidad, porMetodo };
}

/** Diferencia de caja: efectivo contado − efectivo según sistema (negativo = falta dinero). */
export const diferenciaCaja = (efectivoContado: number, efectivoSistema: number) => sol(cts(efectivoContado) - cts(efectivoSistema));

/** Acciones de bloqueo/GPS que admite cada tipo de crédito. */
export const ACCIONES_BLOQUEO = {
  CREDITO_CELULAR: [
    { value: "BLOQUEAR", label: "Bloquear celular por mora" },
    { value: "DESBLOQUEAR", label: "Desbloquear celular" },
    { value: "LIBERAR", label: "Liberar definitivamente (crédito pagado)" },
  ],
  CREDITO_VEHICULAR: [
    { value: "CORTAR_GPS", label: "Cortar corriente por GPS (mora)" },
    { value: "RESTABLECER_GPS", label: "Restablecer GPS" },
  ],
} as const;
export const ROLES_BLOQUEO = ["SUPERADMIN", "ADMIN_CREDITOS", "COBRADOR"] as const;
