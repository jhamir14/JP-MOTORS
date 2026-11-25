import "server-only";
import type postgres from "postgres";
import type { EstadoCliente } from "@/lib/clientes";
import { metricasDesdeJson, normalizarBeneficios, type ConfigBeneficios, type MetricasScore, type PerfilCliente } from "@/lib/scoring";

type Db = postgres.Sql | postgres.TransactionSql;

export async function configBeneficios(db: Db): Promise<ConfigBeneficios> {
  const [f] = await db<{ valor: unknown }[]>`select valor from public.configuracion where clave = 'beneficios_score'`;
  return normalizarBeneficios(f?.valor);
}

export interface EntradaHistorial {
  puntaje: number | null;
  puntajeAnterior: number | null;
  estado: EstadoCliente;
  estadoAnterior: EstadoCliente | null;
  motivo: string;
  fecha: Date;
  usuario: string | null;
}

export interface PerfilScore {
  puntaje: number | null;
  metricas: MetricasScore | null;
  motivo: string | null;
  calculadoAt: Date | null;
  historial: EntradaHistorial[];
}

/** Score actual del cliente, sus métricas (por qué) y su historial reciente. */
export async function perfilScore(db: Db, clienteId: string, limite = 20): Promise<PerfilScore> {
  const [[actual], historial] = await Promise.all([
    db<{ puntaje: number | null; metricas: unknown; motivo: string; calculado_at: Date }[]>`
      select cl.score_interno as puntaje, cs.metricas, cs.motivo, cs.calculado_at
      from public.cliente cl left join public.cliente_score cs on cs.cliente_id = cl.id
      where cl.id = ${clienteId}`,
    db<EntradaHistorial[]>`
      select h.puntaje, h.puntaje_anterior as "puntajeAnterior", h.estado, h.estado_anterior as "estadoAnterior", h.motivo,
             h.created_at as fecha, nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as usuario
      from public.score_historial h left join public.perfil_usuario p on p.id = h.usuario_id
      where h.cliente_id = ${clienteId}
      order by h.created_at desc limit ${limite}`,
  ]);
  return {
    puntaje: actual?.puntaje ?? null,
    metricas: metricasDesdeJson(actual?.metricas),
    motivo: actual?.motivo ?? null,
    calculadoAt: actual?.calculado_at ?? null,
    historial,
  };
}

/**
 * Perfil para evaluar un financiamiento nuevo, con la mora contada en vivo (no espera al proceso diario):
 * score guardado + cuotas vencidas hoy en créditos activos + créditos cancelados.
 */
export async function perfilParaCredito(db: Db, clienteId: string): Promise<PerfilCliente> {
  const [p] = await db<{ puntaje: number | null; mora: number; cancelados: number }[]>`
    select cl.score_interno as puntaje,
           (select count(*) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.cliente_id = cl.id and cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')
              and cu.estado <> 'PAGADA' and cu.fecha_vencimiento < public.hoy_lima())::int as mora,
           (select count(*) from public.credito cr where cr.cliente_id = cl.id and cr.estado = 'FINALIZADO_LIQUIDADO')::int as cancelados
    from public.cliente cl where cl.id = ${clienteId}`;
  return { puntaje: p?.puntaje ?? null, cuotasMoraHoy: p?.mora ?? 0, creditosCancelados: p?.cancelados ?? 0 };
}
