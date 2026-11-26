import "server-only";
import type postgres from "postgres";

export interface Pendientes {
  solicitudes: number;
  reclamos: number;
  /** Créditos con alguna cuota vencida sin pagar. */
  mora: number;
  /** Créditos cuya cuota vence hoy (y que no están en mora). */
  vencen_hoy: number;
  /** AAAA-MM-DD en Lima. */
  hoy: string;
}

/** Lo pendiente del día (campana de la barra superior, insignias del menú y avisos push). */
export async function leerPendientes(db: postgres.Sql | postgres.TransactionSql): Promise<Pendientes> {
  const [p] = await db<Pendientes[]>`
    select (select count(*) from public.solicitud_credito where estado = 'NUEVA')::int as solicitudes,
           to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD') as hoy,
           (select count(distinct cu.credito_id) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') and cu.estado <> 'PAGADA'
              and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
              and cu.fecha_vencimiento = (now() at time zone 'America/Lima')::date
              and not exists (select 1 from public.cuota v where v.credito_id = cu.credito_id and v.estado <> 'PAGADA'
                              and v.monto_cuota + v.mora - v.monto_pagado > 0
                              and v.fecha_vencimiento < (now() at time zone 'America/Lima')::date))::int as vencen_hoy,
           (select count(distinct cu.credito_id) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') and cu.estado <> 'PAGADA'
              and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
              and cu.fecha_vencimiento < (now() at time zone 'America/Lima')::date)::int as mora,
           (select count(*) from public.reclamo where estado <> 'RESPONDIDO')::int as reclamos`;
  return p;
}

/** «3 cuotas vencen hoy y 2 en mora» (vacío si no hay nada). */
export function textoCobranza(p: Pick<Pendientes, "vencen_hoy" | "mora">): string {
  const partes = [
    p.vencen_hoy ? `${p.vencen_hoy} cuota${p.vencen_hoy === 1 ? "" : "s"} vence${p.vencen_hoy === 1 ? "" : "n"} hoy` : "",
    p.mora ? `${p.mora} en mora` : "",
  ].filter(Boolean);
  return partes.join(" y ");
}
