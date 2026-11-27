/**
 * Fase 8 · Reportes y KPIs (lógica pura, sin base de datos).
 * Las filas vienen de las funciones SQL rep_* (database/migrations/20261203000100_fase8_reportes.sql);
 * aquí se validan los filtros y se calculan totales y porcentajes. La usan la página /admin/reportes,
 * el inicio del panel y la exportación (/api/reportes/[tipo]).
 */

export const ROLES_REPORTES = ["SUPERADMIN", "ADMIN_CREDITOS", "ADMIN_MOTOS", "ADMIN_CELULARES"] as const;

export const TIPOS_REPORTE = ["colocaciones", "cobranzas", "mora", "cancelados"] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];
export const ETIQUETA_REPORTE: Record<TipoReporte, string> = {
  colocaciones: "Colocaciones",
  cobranzas: "Cobranzas",
  mora: "Mora por tramo",
  cancelados: "Créditos cancelados",
};
/** El reporte de mora es una foto de hoy: no usa el rango de fechas. */
export const usaRango = (t: TipoReporte) => t !== "mora";

export const TIPOS_CREDITO_REPORTE = ["CREDITO_VEHICULAR", "CREDITO_CELULAR", "PRESTAMO_EFECTIVO"] as const;
export type TipoCreditoReporte = (typeof TIPOS_CREDITO_REPORTE)[number];

export const TRAMOS_MORA = ["MORA_1_7", "MORA_8_15", "MORA_16_30", "MORA_MAS_30"] as const;
export type TramoMora = (typeof TRAMOS_MORA)[number];
export const ETIQUETA_TRAMO: Record<TramoMora, string> = {
  MORA_1_7: "1 a 7 días",
  MORA_8_15: "8 a 15 días",
  MORA_16_30: "16 a 30 días",
  MORA_MAS_30: "Más de 30 días",
};

/** Rango máximo para no generar reportes gigantes por error (≈ 2 años). */
export const MAX_DIAS_RANGO = 731;

export interface FiltrosReporte {
  desde: string;
  hasta: string;
  tipo: TipoCreditoReporte | null;
  asesor: string | null;
  sucursal: string | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fechaValida = (s: string) => {
  if (!FECHA.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

export const inicioDeMes = (hoy: string) => `${hoy.slice(0, 7)}-01`;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const leer = (p: Params, k: string): string => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
};

/**
 * Filtros a partir de la URL. Lo inválido se ignora (vuelve al valor por defecto) y se informa en `avisos`:
 * por defecto, del 1 del mes a hoy. Si las fechas vienen invertidas se intercambian.
 */
export function parsearFiltros(p: Params, hoy: string): { filtros: FiltrosReporte; avisos: string[] } {
  const avisos: string[] = [];
  let desde = leer(p, "desde");
  let hasta = leer(p, "hasta");
  if (desde && !fechaValida(desde)) { avisos.push("La fecha «desde» no es válida."); desde = ""; }
  if (hasta && !fechaValida(hasta)) { avisos.push("La fecha «hasta» no es válida."); hasta = ""; }
  desde ||= inicioDeMes(hoy);
  hasta ||= hoy;
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  if (diasEntre(desde, hasta) > MAX_DIAS_RANGO) {
    avisos.push(`El rango máximo es de ${MAX_DIAS_RANGO} días: se ajustó la fecha «desde».`);
    const d = new Date(`${hasta}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - MAX_DIAS_RANGO);
    desde = d.toISOString().slice(0, 10);
  }
  const tipoRaw = leer(p, "tipo");
  const tipo = (TIPOS_CREDITO_REPORTE as readonly string[]).includes(tipoRaw) ? (tipoRaw as TipoCreditoReporte) : null;
  const asesor = UUID.test(leer(p, "asesor")) ? leer(p, "asesor").toLowerCase() : null;
  const sucursal = UUID.test(leer(p, "sucursal")) ? leer(p, "sucursal").toLowerCase() : null;
  return { filtros: { desde, hasta, tipo, asesor, sucursal }, avisos };
}

/** Query string para enlaces (pestañas, exportar) conservando los filtros. */
export function queryFiltros(f: FiltrosReporte, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({ desde: f.desde, hasta: f.hasta });
  if (f.tipo) q.set("tipo", f.tipo);
  if (f.asesor) q.set("asesor", f.asesor);
  if (f.sucursal) q.set("sucursal", f.sucursal);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

// ───────────────────────── redondeo y porcentajes ─────────────────────────
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const suma = <T>(filas: T[], f: (x: T) => number) => r2(filas.reduce((a, x) => a + (Number(f(x)) || 0), 0));

/** Porcentaje con 1 decimal; 0 si el denominador es 0. */
export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);

// ───────────────────────── filas de cada reporte ─────────────────────────
export interface FilaColocacion {
  codigo: string; tipo: string; fecha_desembolso: string; cliente: string; documento: string; asesor: string | null; sucursal: string | null;
  monto_total: number; cuota_inicial: number; monto_financiado: number; total_intereses: number; monto_total_pagar: number;
  numero_cuotas: number; frecuencia: string; tasa_porcentaje: number; estado: string;
}
export interface FilaCobranza {
  numero_recibo: number; fecha_pago: string; codigo: string; tipo: string; cliente: string; metodo: string; numero_operacion: string | null;
  registrado_por: string; asesor: string | null; sucursal: string | null; monto: number; mora: number; interes: number; capital: number;
}
export interface FilaMora {
  credito_id?: string; codigo: string; tipo: string; cliente: string; telefono: string | null; asesor: string | null; sucursal: string | null;
  cuotas_vencidas: number; primera_vencida: string; dias_atraso: number; tramo: TramoMora; saldo_vencido: number; mora_pendiente: number; saldo_total: number;
}
export interface FilaCancelado {
  codigo: string; tipo: string; cliente: string; asesor: string | null; sucursal: string | null; fecha_desembolso: string; fecha_cancelacion: string;
  dias_credito: number; monto_financiado: number; total_intereses: number; total_pagado: number; mora_cobrada: number;
  cuotas_con_atraso: number; numero_cuotas: number;
}

// ───────────────────────── totales ─────────────────────────
export function totalesColocaciones(filas: FilaColocacion[]) {
  const financiado = suma(filas, (f) => f.monto_financiado);
  return {
    creditos: filas.length,
    ventas: suma(filas, (f) => f.monto_total),
    inicial: suma(filas, (f) => f.cuota_inicial),
    financiado,
    intereses: suma(filas, (f) => f.total_intereses),
    totalPagar: suma(filas, (f) => f.monto_total_pagar),
    ticketPromedio: filas.length ? r2(financiado / filas.length) : 0,
    porTipo: agrupar(filas, (f) => f.tipo, (g) => ({ creditos: g.length, financiado: suma(g, (f) => f.monto_financiado) })),
    porAsesor: agrupar(filas, (f) => f.asesor ?? "Sin asesor", (g) => ({ creditos: g.length, financiado: suma(g, (f) => f.monto_financiado) })),
  };
}

export function totalesCobranzas(filas: FilaCobranza[]) {
  const total = suma(filas, (f) => f.monto);
  const efectivo = suma(filas.filter((f) => f.metodo === "EFECTIVO"), (f) => f.monto);
  const mora = suma(filas, (f) => f.mora);
  const interes = suma(filas, (f) => f.interes);
  const capital = suma(filas, (f) => f.capital);
  return {
    pagos: filas.length,
    total,
    efectivo,
    digital: r2(total - efectivo),
    mora,
    interes,
    capital,
    /** Ingresos de la empresa: interés + mora (el capital es recuperación). */
    ingresos: r2(mora + interes),
    /** Diferencia entre el monto de los pagos y su reparto (debería ser 0; los migrados sin reparto la explican). */
    sinAplicar: r2(total - mora - interes - capital),
    porMetodo: agrupar(filas, (f) => f.metodo, (g) => ({ pagos: g.length, total: suma(g, (f) => f.monto) })),
    porCobrador: agrupar(filas, (f) => f.registrado_por, (g) => ({ pagos: g.length, total: suma(g, (f) => f.monto) })),
  };
}

export interface TramoResumen { tramo: TramoMora; creditos: number; saldoVencido: number; porcentajeCreditos: number; porcentajeCartera: number }

/**
 * Mora por tramo. `carteraVigente` = saldo por cobrar de todos los créditos activos; el % de cartera
 * de cada tramo es su saldo vencido sobre ese total (indicador de riesgo).
 */
export function resumenMora(filas: FilaMora[], carteraVigente: number, creditosActivos: number) {
  const tramos: TramoResumen[] = TRAMOS_MORA.map((tramo) => {
    const g = filas.filter((f) => f.tramo === tramo);
    const saldoVencido = suma(g, (f) => f.saldo_vencido);
    return {
      tramo,
      creditos: g.length,
      saldoVencido,
      porcentajeCreditos: porcentaje(g.length, creditosActivos),
      porcentajeCartera: porcentaje(saldoVencido, carteraVigente),
    };
  });
  const saldoVencido = suma(filas, (f) => f.saldo_vencido);
  return {
    tramos,
    creditos: filas.length,
    saldoVencido,
    moraPendiente: suma(filas, (f) => f.mora_pendiente),
    saldoTotalEnRiesgo: suma(filas, (f) => f.saldo_total),
    porcentajeCartera: porcentaje(saldoVencido, carteraVigente),
    porcentajeCreditos: porcentaje(filas.length, creditosActivos),
  };
}

export function totalesCancelados(filas: FilaCancelado[]) {
  const sinAtraso = filas.filter((f) => f.cuotas_con_atraso === 0).length;
  return {
    creditos: filas.length,
    financiado: suma(filas, (f) => f.monto_financiado),
    intereses: suma(filas, (f) => f.total_intereses),
    pagado: suma(filas, (f) => f.total_pagado),
    moraCobrada: suma(filas, (f) => f.mora_cobrada),
    sinAtraso,
    porcentajeSinAtraso: porcentaje(sinAtraso, filas.length),
    diasPromedio: filas.length ? Math.round(filas.reduce((a, f) => a + f.dias_credito, 0) / filas.length) : 0,
  };
}

function agrupar<T, R>(filas: T[], clave: (x: T) => string, resumir: (g: T[]) => R): ({ clave: string } & R)[] {
  const m = new Map<string, T[]>();
  for (const f of filas) {
    const k = clave(f);
    m.set(k, [...(m.get(k) ?? []), f]);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "es")).map(([k, g]) => ({ clave: k, ...resumir(g) }));
}

// ───────────────────────── KPIs del inicio ─────────────────────────
export interface KpisCrudos {
  hoy: string; creditos_activos: number; creditos_en_mora: number; cartera_vigente: number; saldo_vencido: number; capital_pendiente: number;
  colocado_mes: number; creditos_mes: number; cobrado_hoy: number; pagos_hoy: number; cobrado_mes: number; interes_cobrado_mes: number;
  mora_cobrada_mes: number; capital_cobrado_mes: number; intereses_pactados_activos: number; intereses_cobrados_activos: number;
}

export function indicadores(k: KpisCrudos) {
  return {
    ...k,
    /** % de la cartera vigente que ya está vencida (saldo en mora / saldo por cobrar). */
    porcentajeMoraCartera: porcentaje(k.saldo_vencido, k.cartera_vigente),
    porcentajeCreditosEnMora: porcentaje(k.creditos_en_mora, k.creditos_activos),
    /** Avance de los intereses pactados de los créditos activos que ya se cobraron. */
    porcentajeInteresCobrado: porcentaje(k.intereses_cobrados_activos, k.intereses_pactados_activos),
    ingresosMes: r2(k.interes_cobrado_mes + k.mora_cobrada_mes),
  };
}

/** Distribución de clientes por score (5…1 y sin historial) con porcentajes. */
export function distribucionScore(filas: { score: number | null; clientes: number }[]) {
  const total = filas.reduce((a, f) => a + f.clientes, 0);
  const niveles: (number | null)[] = [5, 4, 3, 2, 1, null];
  return niveles.map((score) => {
    const clientes = filas.filter((f) => f.score === score).reduce((a, f) => a + f.clientes, 0);
    return { score, clientes, porcentaje: porcentaje(clientes, total) };
  });
}

// ───────────────────────── columnas de exportación ─────────────────────────
export type TipoColumna = "texto" | "numero" | "soles" | "fecha";
export interface Columna<T> { titulo: string; tipo: TipoColumna; valor: (f: T) => string | number | null }

const s = (v: string | null | undefined) => v ?? "";

export const COLUMNAS: { [K in TipoReporte]: Columna<FilaPorTipo[K]>[] } = {
  colocaciones: [
    { titulo: "Código", tipo: "texto", valor: (f) => f.codigo },
    { titulo: "Tipo", tipo: "texto", valor: (f) => f.tipo },
    { titulo: "Fecha de desembolso", tipo: "fecha", valor: (f) => f.fecha_desembolso },
    { titulo: "Cliente", tipo: "texto", valor: (f) => f.cliente },
    { titulo: "Documento", tipo: "texto", valor: (f) => f.documento },
    { titulo: "Asesor", tipo: "texto", valor: (f) => s(f.asesor) },
    { titulo: "Sucursal", tipo: "texto", valor: (f) => s(f.sucursal) },
    { titulo: "Precio (S/)", tipo: "soles", valor: (f) => f.monto_total },
    { titulo: "Inicial (S/)", tipo: "soles", valor: (f) => f.cuota_inicial },
    { titulo: "Financiado (S/)", tipo: "soles", valor: (f) => f.monto_financiado },
    { titulo: "Intereses pactados (S/)", tipo: "soles", valor: (f) => f.total_intereses },
    { titulo: "Total a pagar (S/)", tipo: "soles", valor: (f) => f.monto_total_pagar },
    { titulo: "Cuotas", tipo: "numero", valor: (f) => f.numero_cuotas },
    { titulo: "Frecuencia", tipo: "texto", valor: (f) => f.frecuencia },
    { titulo: "Tasa (%)", tipo: "numero", valor: (f) => f.tasa_porcentaje },
    { titulo: "Estado", tipo: "texto", valor: (f) => f.estado },
  ],
  cobranzas: [
    { titulo: "Recibo", tipo: "numero", valor: (f) => f.numero_recibo },
    { titulo: "Fecha", tipo: "fecha", valor: (f) => f.fecha_pago },
    { titulo: "Crédito", tipo: "texto", valor: (f) => f.codigo },
    { titulo: "Tipo", tipo: "texto", valor: (f) => f.tipo },
    { titulo: "Cliente", tipo: "texto", valor: (f) => f.cliente },
    { titulo: "Método", tipo: "texto", valor: (f) => f.metodo },
    { titulo: "N.º de operación", tipo: "texto", valor: (f) => s(f.numero_operacion) },
    { titulo: "Registrado por", tipo: "texto", valor: (f) => f.registrado_por },
    { titulo: "Asesor del crédito", tipo: "texto", valor: (f) => s(f.asesor) },
    { titulo: "Sucursal", tipo: "texto", valor: (f) => s(f.sucursal) },
    { titulo: "Monto (S/)", tipo: "soles", valor: (f) => f.monto },
    { titulo: "Mora (S/)", tipo: "soles", valor: (f) => f.mora },
    { titulo: "Interés (S/)", tipo: "soles", valor: (f) => f.interes },
    { titulo: "Capital (S/)", tipo: "soles", valor: (f) => f.capital },
  ],
  mora: [
    { titulo: "Crédito", tipo: "texto", valor: (f) => f.codigo },
    { titulo: "Tipo", tipo: "texto", valor: (f) => f.tipo },
    { titulo: "Cliente", tipo: "texto", valor: (f) => f.cliente },
    { titulo: "Teléfono", tipo: "texto", valor: (f) => s(f.telefono) },
    { titulo: "Asesor", tipo: "texto", valor: (f) => s(f.asesor) },
    { titulo: "Sucursal", tipo: "texto", valor: (f) => s(f.sucursal) },
    { titulo: "Cuotas vencidas", tipo: "numero", valor: (f) => f.cuotas_vencidas },
    { titulo: "Primera vencida", tipo: "fecha", valor: (f) => f.primera_vencida },
    { titulo: "Días de atraso", tipo: "numero", valor: (f) => f.dias_atraso },
    { titulo: "Tramo", tipo: "texto", valor: (f) => ETIQUETA_TRAMO[f.tramo] ?? f.tramo },
    { titulo: "Saldo vencido (S/)", tipo: "soles", valor: (f) => f.saldo_vencido },
    { titulo: "Mora pendiente (S/)", tipo: "soles", valor: (f) => f.mora_pendiente },
    { titulo: "Saldo total (S/)", tipo: "soles", valor: (f) => f.saldo_total },
  ],
  cancelados: [
    { titulo: "Crédito", tipo: "texto", valor: (f) => f.codigo },
    { titulo: "Tipo", tipo: "texto", valor: (f) => f.tipo },
    { titulo: "Cliente", tipo: "texto", valor: (f) => f.cliente },
    { titulo: "Asesor", tipo: "texto", valor: (f) => s(f.asesor) },
    { titulo: "Sucursal", tipo: "texto", valor: (f) => s(f.sucursal) },
    { titulo: "Desembolso", tipo: "fecha", valor: (f) => f.fecha_desembolso },
    { titulo: "Cancelación", tipo: "fecha", valor: (f) => f.fecha_cancelacion },
    { titulo: "Días", tipo: "numero", valor: (f) => f.dias_credito },
    { titulo: "Financiado (S/)", tipo: "soles", valor: (f) => f.monto_financiado },
    { titulo: "Intereses (S/)", tipo: "soles", valor: (f) => f.total_intereses },
    { titulo: "Total pagado (S/)", tipo: "soles", valor: (f) => f.total_pagado },
    { titulo: "Mora cobrada (S/)", tipo: "soles", valor: (f) => f.mora_cobrada },
    { titulo: "Cuotas con atraso", tipo: "numero", valor: (f) => f.cuotas_con_atraso },
    { titulo: "Cuotas", tipo: "numero", valor: (f) => f.numero_cuotas },
  ],
};

export interface FilaPorTipo { colocaciones: FilaColocacion; cobranzas: FilaCobranza; mora: FilaMora; cancelados: FilaCancelado }

export const nombreArchivo = (t: TipoReporte, f: FiltrosReporte, ext: "csv" | "xlsx") =>
  `reporte-${t}-${usaRango(t) ? `${f.desde}_a_${f.hasta}` : `al-${f.hasta}`}.${ext}`;
