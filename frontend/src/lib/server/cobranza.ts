import "server-only";
import type postgres from "postgres";
import { enlaceRecordatorio, mensajeRecordatorio, tipoRecordatorio, type CuotaPendiente, type TipoRecordatorio } from "@/lib/recordatorios";

type Db = postgres.Sql | postgres.TransactionSql;

export interface CreditoPorCobrar {
  id: string;
  codigo: string;
  tipo: string;
  numeroCuotas: number;
  clienteId: string;
  cliente: string;
  telefono: string | null;
  distrito: string | null;
  direccion: string | null;
  producto: string | null;
  pendientes: CuotaPendiente[];
  ultimoRecordatorio: { fecha: string; por: string | null } | null;
  // Derivados
  situacion: TipoRecordatorio;
  vencido: number;
  cuotasVencidas: number;
  diasAtraso: number;
  proxima: CuotaPendiente | null;
  mensaje: string;
  whatsapp: string | null;
}

/** Fecha de hoy en Lima (AAAA-MM-DD), calculada en la base para no depender del reloj del servidor web. */
export async function hoyLima(db: Db): Promise<string> {
  const [r] = await db<{ hoy: string }[]>`select to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD') as hoy`;
  return r.hoy;
}

/**
 * Créditos activos con cuotas por pagar, con el mensaje de recordatorio ya armado.
 * Con `clienteId` se limita a un cliente (ficha); sin él, toda la cartera (Cobranzas).
 */
export async function creditosPorCobrar(db: Db, opciones: { clienteId?: string } = {}): Promise<{ hoy: string; creditos: CreditoPorCobrar[] }> {
  const hoy = await hoyLima(db);
  const clienteId = opciones.clienteId ?? null;
  const filas = await db<Omit<CreditoPorCobrar, "situacion" | "vencido" | "cuotasVencidas" | "diasAtraso" | "proxima" | "mensaje" | "whatsapp">[]>`
    select cr.id, cr.codigo, cr.tipo, cr.numero_cuotas as "numeroCuotas", cl.id as "clienteId",
           cl.nombres || ' ' || cl.apellidos as cliente, cl.telefono, cl.distrito, cl.direccion,
           coalesce(uv.marca || ' ' || uv.modelo, uc.marca || ' ' || uc.modelo) as producto,
           json_agg(json_build_object(
             'numero', cu.numero,
             'fecha', to_char(cu.fecha_vencimiento, 'YYYY-MM-DD'),
             'saldo', (cu.monto_cuota + cu.mora - cu.monto_pagado)::float8
           ) order by cu.numero) as pendientes,
           (select json_build_object('fecha', r.created_at, 'por', p.nombres || ' ' || p.apellidos)
            from public.recordatorio_pago r left join public.perfil_usuario p on p.id = r.enviado_por
            where r.credito_id = cr.id order by r.created_at desc limit 1) as "ultimoRecordatorio"
    from public.credito cr
    join public.cliente cl on cl.id = cr.cliente_id
    join public.cuota cu on cu.credito_id = cr.id and cu.estado <> 'PAGADA' and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
    left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
    left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
    where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')
      and (${clienteId}::uuid is null or cr.cliente_id = ${clienteId})
    group by cr.id, cl.id, uv.id, uc.id
    order by min(cu.fecha_vencimiento), cr.codigo`;

  const creditos = filas.map((f) => {
    const vencidas = f.pendientes.filter((c) => c.fecha < hoy);
    const mensaje = mensajeRecordatorio({
      nombres: f.cliente.split(" ")[0] ?? f.cliente,
      codigo: f.codigo,
      producto: f.producto,
      numeroCuotas: f.numeroCuotas,
      pendientes: f.pendientes,
      hoy,
    });
    return {
      ...f,
      situacion: tipoRecordatorio({ pendientes: f.pendientes, hoy }),
      vencido: vencidas.reduce((s, c) => s + c.saldo, 0),
      cuotasVencidas: vencidas.length,
      diasAtraso: vencidas.length ? Math.round((Date.parse(hoy) - Date.parse(vencidas[0].fecha)) / 86_400_000) : 0,
      proxima: f.pendientes.find((c) => c.fecha >= hoy) ?? null,
      mensaje,
      whatsapp: enlaceRecordatorio(f.telefono, mensaje),
    };
  });
  return { hoy, creditos };
}
