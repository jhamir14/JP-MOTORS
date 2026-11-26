/**
 * Motor de créditos (Fase 4): valida unas condiciones y arma el cronograma definitivo
 * (montos con `cronograma()` y fechas con `fechasCronograma()`), listo para insertar en `credito` + `cuota`.
 *
 * Lo usan la vista previa del panel (navegador) y la Server Action que registra el crédito (servidor):
 * ambos calculan exactamente lo mismo, y el servidor vuelve a calcular todo antes de guardar.
 */
import { fechasCronograma, esFechaIso, siguienteDiaHabil, sumarDias, sumarMeses } from "./calendario";
import { calcularCredito, cronograma, FRECUENCIAS, PERIODOS_POR_ANIO, TIPOS_CALCULO, type Frecuencia, type TipoCalculo } from "./finance";

export const TIPOS_CREDITO_NUEVO = ["CREDITO_VEHICULAR", "CREDITO_CELULAR"] as const;
export type TipoCreditoNuevo = (typeof TIPOS_CREDITO_NUEVO)[number];
/** Todo lo que se puede registrar desde el panel: créditos de productos y préstamos de dinero. */
export const TIPOS_CREDITO_ALTA = [...TIPOS_CREDITO_NUEVO, "PRESTAMO_EFECTIVO"] as const;
export type TipoCreditoAlta = (typeof TIPOS_CREDITO_ALTA)[number];

/** Roles que registran y anulan créditos (igual que las políticas RLS de `credito` y `cuota`). */
export const ROLES_CREDITOS = ["SUPERADMIN", "ADMIN_CREDITOS"] as const;
export const puedeGestionarCreditos = (rol: string) => (ROLES_CREDITOS as readonly string[]).includes(rol);

/** Estados en los que el crédito sigue vivo (se cobra). */
export const ESTADOS_CREDITO_ACTIVO = ["VIGENTE", "EN_MORA", "APROBADO", "REFINANCIADO"] as const;

export const MAX_CUOTAS: Record<Frecuencia, number> = { DIARIO: 600, SEMANAL: 156, QUINCENAL: 72, MENSUAL: 48 };

export interface EntradaCredito {
  tipo: TipoCreditoAlta;
  /** Precio del bien (o monto prestado en un préstamo de dinero). */
  precio: number;
  cuotaInicial: number;
  numeroCuotas: number;
  frecuencia: Frecuencia;
  tipoCalculo: TipoCalculo;
  /** FRANCES: % por periodo · FLAT: % total del plazo. Se ignora si hay `montoCuota`. */
  tasaPorcentaje?: number | null;
  /** Cuota fija pactada: el sistema deduce la tasa. */
  montoCuota?: number | null;
  penalidadDiaria: number;
  /** AAAA-MM-DD */
  fechaDesembolso: string;
  /** AAAA-MM-DD; si cae en domingo o feriado pasa al siguiente día hábil. */
  primerVencimiento: string;
}

export interface ReglasCredito {
  /** Tope de TEA (%), p. ej. el fijado por el BCRP. null = sin tope. */
  topeTea?: number | null;
  cuotasMin?: number | null;
  cuotasMax?: number | null;
}

export interface CuotaPlan {
  numero: number;
  fecha: string;
  cuota: number;
  capital: number;
  interes: number;
  saldo: number;
}

export interface PlanCredito {
  financiado: number;
  /** Cuota pactada (la última puede variar unos céntimos por redondeo). */
  valorCuota: number;
  totalIntereses: number;
  totalPagar: number;
  /** En la convención del tipo de cálculo (por periodo en FRANCES, total en FLAT). */
  tasaPorcentaje: number;
  teaPorcentaje: number;
  ultimoVencimiento: string;
  cuotas: CuotaPlan[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const conDosDecimales = (n: number) => Number.isFinite(n) && Math.abs(r2(n) - n) < 1e-9;

/** Primer vencimiento por defecto: un periodo después del desembolso, en día hábil. */
export function primerVencimientoSugerido(desembolso: string, frecuencia: Frecuencia, feriados: ReadonlySet<string>): string {
  const nominal =
    frecuencia === "DIARIO" ? sumarDias(desembolso, 1)
    : frecuencia === "SEMANAL" ? sumarDias(desembolso, 7)
    : frecuencia === "QUINCENAL" ? sumarDias(desembolso, 15)
    : sumarMeses(desembolso, 1);
  return siguienteDiaHabil(nominal, feriados);
}

/**
 * Errores de las condiciones, por campo (vacío = válidas). No incluye las reglas que dependen
 * de la base (unidad disponible, cliente bloqueado, garante), que verifica el servidor.
 */
export function validarCredito(e: EntradaCredito, reglas: ReglasCredito = {}): Record<string, string> {
  const err: Record<string, string> = {};
  if (!(TIPOS_CREDITO_ALTA as readonly string[]).includes(e.tipo)) err.tipo = "Tipo de crédito no válido";
  const prestamo = e.tipo === "PRESTAMO_EFECTIVO";
  if (!(FRECUENCIAS as readonly string[]).includes(e.frecuencia)) err.frecuencia = "Frecuencia no válida";
  if (!(TIPOS_CALCULO as readonly string[]).includes(e.tipoCalculo)) err.tipoCalculo = "Tipo de cálculo no válido";

  if (!(e.precio > 0) || !conDosDecimales(e.precio)) err.precio = prestamo ? "Monto mayor que 0, con hasta 2 decimales" : "Precio mayor que 0, con hasta 2 decimales";
  else if (e.precio > 1_000_000) err.precio = prestamo ? "Revisa el monto" : "Revisa el precio";
  if (prestamo && e.cuotaInicial !== 0) err.cuotaInicial = "Un préstamo de dinero no lleva inicial";
  if (!(e.cuotaInicial >= 0) || !conDosDecimales(e.cuotaInicial)) err.cuotaInicial = "Inicial de 0 o más, con hasta 2 decimales";
  else if (e.precio > 0 && e.cuotaInicial >= e.precio) err.cuotaInicial = "La inicial debe ser menor que el precio";

  const maxFrecuencia = MAX_CUOTAS[e.frecuencia] ?? 48;
  const min = Math.max(1, reglas.cuotasMin ?? 1);
  const max = Math.min(maxFrecuencia, reglas.cuotasMax ?? maxFrecuencia);
  if (!Number.isInteger(e.numeroCuotas) || e.numeroCuotas < 1) err.numeroCuotas = "Número de cuotas entero mayor que 0";
  else if (e.numeroCuotas < min || e.numeroCuotas > max) err.numeroCuotas = `Entre ${min} y ${max} cuotas para esta tasa y frecuencia`;

  const conCuotaFija = e.montoCuota != null;
  if (conCuotaFija) {
    if (!(e.montoCuota! > 0) || !conDosDecimales(e.montoCuota!)) err.montoCuota = "Cuota mayor que 0, con hasta 2 decimales";
    else if (!err.precio && !err.cuotaInicial && !err.numeroCuotas && e.montoCuota! * e.numeroCuotas < e.precio - e.cuotaInicial - 1e-9)
      err.montoCuota = "Las cuotas no alcanzan a cubrir el monto financiado";
  } else if (e.tasaPorcentaje == null || !Number.isFinite(e.tasaPorcentaje) || e.tasaPorcentaje < 0) {
    err.tasaPorcentaje = "Ingresa la tasa (0 o más) o una cuota fija";
  } else if (e.tasaPorcentaje > (e.tipoCalculo === "FLAT" ? 500 : 50)) {
    err.tasaPorcentaje = e.tipoCalculo === "FLAT" ? "Tasa flat demasiado alta (máx. 500 %)" : "Tasa por periodo demasiado alta (máx. 50 %)";
  }

  if (!(e.penalidadDiaria >= 0) || !conDosDecimales(e.penalidadDiaria) || e.penalidadDiaria > 1000)
    err.penalidadDiaria = "Penalidad de 0 a 1000, con hasta 2 decimales";

  if (!esFechaIso(e.fechaDesembolso)) err.fechaDesembolso = "Fecha no válida";
  if (!esFechaIso(e.primerVencimiento)) err.primerVencimiento = "Fecha no válida";
  else if (!err.fechaDesembolso) {
    if (e.primerVencimiento <= e.fechaDesembolso) err.primerVencimiento = "Debe ser posterior a la fecha de entrega";
    else if (e.primerVencimiento > sumarMeses(e.fechaDesembolso, 3)) err.primerVencimiento = "Máximo 3 meses después de la entrega";
  }

  if (Object.keys(err).length === 0 && reglas.topeTea != null) {
    const r = calcularCredito({ ...e, monto: e.precio });
    if (Number.isFinite(r.teaPorcentaje) && r.teaPorcentaje > reglas.topeTea + 1e-9)
      err[conCuotaFija ? "montoCuota" : "tasaPorcentaje"] = `La TEA resultante (${r.teaPorcentaje.toFixed(2)} %) supera el tope de ${reglas.topeTea} %`;
  }
  return err;
}

/** Cronograma definitivo (montos redondeados + fechas hábiles). Lanza si las condiciones no son válidas. */
export function planCredito(e: EntradaCredito, feriados: ReadonlySet<string>, reglas: ReglasCredito = {}): PlanCredito {
  const err = validarCredito(e, reglas);
  if (Object.keys(err).length) throw new Error(Object.values(err)[0]);
  const condiciones = {
    monto: e.precio,
    cuotaInicial: e.cuotaInicial,
    numeroCuotas: e.numeroCuotas,
    frecuencia: e.frecuencia,
    tipoCalculo: e.tipoCalculo,
    tasaPorcentaje: e.montoCuota != null ? null : e.tasaPorcentaje,
    montoCuota: e.montoCuota,
  };
  const r = calcularCredito(condiciones);
  const filas = cronograma(condiciones);
  const fechas = fechasCronograma(e.primerVencimiento, e.numeroCuotas, e.frecuencia, feriados);
  const financiado = r2(e.precio - e.cuotaInicial);
  const totalIntereses = r2(filas.reduce((s, f) => s + f.interes, 0));
  const tasaPeriodo = r.tasaPeriodo;
  return {
    financiado,
    valorCuota: filas[0]?.cuota ?? 0,
    totalIntereses,
    totalPagar: r2(financiado + totalIntereses),
    tasaPorcentaje: Math.round(r.tasaPorcentaje * 1000) / 1000,
    teaPorcentaje: Number.isFinite(tasaPeriodo) ? r2((Math.pow(1 + tasaPeriodo, PERIODOS_POR_ANIO[e.frecuencia]) - 1) * 100) : NaN,
    ultimoVencimiento: fechas[fechas.length - 1],
    cuotas: filas.map((f, i) => ({ ...f, fecha: fechas[i] })),
  };
}

/** Lee la lista de feriados guardada en configuracion.feriados (jsonb con fechas AAAA-MM-DD). */
export function feriadosDesdeConfig(valor: unknown): Set<string> {
  return new Set(Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string" && esFechaIso(v)) : []);
}

/** Motivo de anulación: obligatorio y con algo de detalle (queda en auditoría). */
export function errorMotivoAnulacion(motivo: string): string | null {
  const t = motivo.trim();
  if (t.length < 10) return "Explica el motivo (mínimo 10 caracteres)";
  if (t.length > 500) return "Máximo 500 caracteres";
  return null;
}
