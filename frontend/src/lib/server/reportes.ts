import "server-only";
import type postgres from "postgres";
import type { FilaPorTipo, FiltrosReporte, KpisCrudos, TipoReporte } from "@/lib/reportes";

/** Consultas de la Fase 8: llaman a las funciones SQL rep_* con los filtros ya validados. */

type Db = postgres.Sql | postgres.TransactionSql;

/** Tope de filas en pantalla y en la exportación (protege a la base y al navegador). */
export const MAX_FILAS_REPORTE = 20_000;

export async function filasReporte<T extends TipoReporte>(db: Db, tipo: T, f: FiltrosReporte): Promise<FilaPorTipo[T][]> {
  const { desde, hasta, tipo: tc, asesor, sucursal } = f;
  switch (tipo) {
    case "colocaciones":
      return (await db`
        select codigo, tipo::text, fecha_desembolso::text, cliente, documento, asesor, sucursal,
               monto_total::float8, cuota_inicial::float8, monto_financiado::float8, total_intereses::float8, monto_total_pagar::float8,
               numero_cuotas, frecuencia::text, tasa_porcentaje::float8, estado::text
        from public.rep_colocaciones(${desde}::date, ${hasta}::date, ${tc}::public.tipo_credito, ${asesor}::uuid, ${sucursal}::uuid)
        limit ${MAX_FILAS_REPORTE}`) as unknown as FilaPorTipo[T][];
    case "cobranzas":
      return (await db`
        select numero_recibo::int, fecha_pago::text, codigo, tipo::text, cliente, metodo::text, numero_operacion, registrado_por, asesor, sucursal,
               monto::float8, mora::float8, interes::float8, capital::float8
        from public.rep_cobranzas(${desde}::date, ${hasta}::date, ${tc}::public.tipo_credito, ${asesor}::uuid, ${sucursal}::uuid)
        limit ${MAX_FILAS_REPORTE}`) as unknown as FilaPorTipo[T][];
    case "mora":
      return (await db`
        select credito_id, codigo, tipo::text, cliente, telefono, asesor, sucursal, cuotas_vencidas, primera_vencida::text, dias_atraso, tramo,
               saldo_vencido::float8, mora_pendiente::float8, saldo_total::float8
        from public.rep_mora(${tc}::public.tipo_credito, ${asesor}::uuid, ${sucursal}::uuid)
        limit ${MAX_FILAS_REPORTE}`) as unknown as FilaPorTipo[T][];
    case "cancelados":
      return (await db`
        select codigo, tipo::text, cliente, asesor, sucursal, fecha_desembolso::text, fecha_cancelacion::text, dias_credito,
               monto_financiado::float8, total_intereses::float8, total_pagado::float8, mora_cobrada::float8, cuotas_con_atraso, numero_cuotas
        from public.rep_cancelados(${desde}::date, ${hasta}::date, ${tc}::public.tipo_credito, ${asesor}::uuid, ${sucursal}::uuid)
        limit ${MAX_FILAS_REPORTE}`) as unknown as FilaPorTipo[T][];
    default:
      throw new Error(`Reporte desconocido: ${tipo satisfies never}`);
  }
}

export async function kpis(db: Db): Promise<KpisCrudos> {
  const [k] = await db<KpisCrudos[]>`
    select hoy::text, creditos_activos, creditos_en_mora, cartera_vigente::float8, saldo_vencido::float8, capital_pendiente::float8,
           colocado_mes::float8, creditos_mes, cobrado_hoy::float8, pagos_hoy, cobrado_mes::float8, interes_cobrado_mes::float8,
           mora_cobrada_mes::float8, capital_cobrado_mes::float8, intereses_pactados_activos::float8, intereses_cobrados_activos::float8
    from public.rep_kpis()`;
  return k;
}

/** Cartera vigente y créditos activos con los mismos filtros del reporte de mora (para los porcentajes). */
export async function baseCartera(db: Db, f: FiltrosReporte): Promise<{ cartera: number; activos: number }> {
  const [r] = await db<{ cartera: number; activos: number }[]>`
    select coalesce(sum(greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0)) filter (where cu.estado <> 'PAGADA'), 0)::float8 as cartera,
           count(distinct cr.id)::int as activos
    from public.credito cr join public.cuota cu on cu.credito_id = cr.id
    where cr.estado in ('VIGENTE', 'EN_MORA')
      and (${f.tipo}::public.tipo_credito is null or cr.tipo = ${f.tipo}::public.tipo_credito)
      and (${f.asesor}::uuid is null or cr.creado_por = ${f.asesor}::uuid)
      and (${f.sucursal}::uuid is null or cr.sucursal_id = ${f.sucursal}::uuid)`;
  return r;
}

export async function moraPorTramoHoy(db: Db) {
  return db<{ tramo: string; creditos: number; saldo: number }[]>`
    select tramo, count(*)::int as creditos, sum(saldo_vencido)::float8 as saldo from public.rep_mora() group by tramo`;
}

export async function distribucionScoreClientes(db: Db) {
  return db<{ score: number | null; clientes: number }[]>`
    select score_interno::int as score, count(*)::int as clientes from public.cliente group by score_interno`;
}

export async function opcionesFiltros(db: Db) {
  const [asesores, sucursales] = await Promise.all([
    db<{ id: string; nombre: string }[]>`
      select distinct p.id, trim(p.nombres || ' ' || p.apellidos) as nombre
      from public.perfil_usuario p where p.id in (select creado_por from public.credito where creado_por is not null) or p.activo
      order by nombre`,
    db<{ id: string; nombre: string }[]>`select id, nombre from public.sucursal order by nombre`,
  ]);
  return { asesores, sucursales };
}

/** Deja constancia de una exportación en audit_log (accion DESCARGA): quién, qué reporte, filtros y filas. */
export async function auditarDescarga(db: Db, usuarioId: string, tipo: TipoReporte, formato: string, f: FiltrosReporte, filas: number, ip: string | null) {
  await db`
    insert into public.audit_log (tabla, registro_id, accion, despues, usuario_id)
    values ('reporte', ${tipo}, 'DESCARGA', ${db.json({ formato, filtros: { ...f }, filas, ip })}, ${usuarioId})`;
}
