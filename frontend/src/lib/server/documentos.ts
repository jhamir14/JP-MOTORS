import "server-only";
import { headers } from "next/headers";
import type postgres from "postgres";
import { siteConfig } from "@/lib/config";
import type { DatosCredito, DatosEmpresa, DatosRecibo } from "@/lib/documentos";
import { ETIQUETA_METODO, type MetodoPago } from "@/lib/pagos";
import { sql } from "./db";

type Db = postgres.Sql | postgres.TransactionSql;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Datos de la empresa para las plantillas: `configuracion.empresa` (pública) + `empresa_documentos` (privada). */
export async function datosEmpresa(db: Db = sql()): Promise<DatosEmpresa> {
  const filas = await db<{ clave: string; valor: unknown }[]>`
    select clave, valor from public.configuracion where clave in ('empresa', 'empresa_documentos', 'documentos_validados')`;
  const v = Object.fromEntries(filas.map((f) => [f.clave, f.valor])) as Record<string, Record<string, unknown> | boolean | undefined>;
  const emp = (v.empresa ?? {}) as Record<string, unknown>;
  const docs = (v.empresa_documentos ?? {}) as Record<string, unknown>;
  const txt = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
  return {
    nombre: txt(emp.nombre) ?? siteConfig.name,
    razonSocial: txt(emp.razon_social) ?? siteConfig.legalName,
    ruc: txt(emp.ruc) ?? siteConfig.ruc,
    representante: txt(docs.representante_legal),
    representanteDocumento: txt(docs.representante_documento),
    domicilio: txt(docs.domicilio),
    ciudad: txt(docs.ciudad) ?? "Lima",
    telefono: siteConfig.telefonoVisible,
    validados: v.documentos_validados === true,
  };
}

const n = (x: unknown) => (x == null ? null : Number(x));

/** Todo lo que necesitan el contrato, el pagaré y el cronograma de un crédito. */
export async function datosCredito(id: string, db: Db = sql()): Promise<DatosCredito | null> {
  const [c] = await db<Record<string, unknown>[]>`
    select cr.codigo, cr.tipo, cr.estado,
           cl.nombres as c_nombres, cl.apellidos as c_apellidos, cl.tipo_documento as c_tdoc, cl.numero_documento as c_doc,
           cl.direccion as c_dir, cl.distrito as c_dist, cl.provincia as c_prov, cl.departamento as c_dep, cl.telefono as c_tel,
           cl.estado_civil as c_civil,
           g.nombres as g_nombres, g.apellidos as g_apellidos, g.tipo_documento as g_tdoc, g.numero_documento as g_doc,
           g.direccion as g_dir, g.telefono as g_tel, g.parentesco as g_par,
           uv.id as v_id, uv.tipo_vehiculo, uv.marca as v_marca, uv.modelo as v_modelo, uv.anio, uv.color as v_color, uv.cilindrada_cc,
           uv.condicion as v_cond, uv.numero_motor, uv.numero_chasis, uv.placa, uv.proveedor_gps, uv.imei_gps,
           uc.id as m_id, uc.marca as m_marca, uc.modelo as m_modelo, uc.almacenamiento, uc.memoria_ram, uc.color as m_color,
           uc.condicion as m_cond, uc.imei1, uc.imei2, uc.numero_serie, uc.plataforma_bloqueo,
           cr.monto_total, cr.cuota_inicial, cr.monto_financiado, cr.tasa_porcentaje, cr.tipo_calculo, cr.total_intereses,
           cr.monto_total_pagar, cr.frecuencia, cr.numero_cuotas, cr.valor_cuota, cr.penalidad_diaria, cr.tea_porcentaje,
           to_char(cr.fecha_desembolso, 'YYYY-MM-DD') as fecha_desembolso,
           to_char(cr.fecha_primer_vencimiento, 'YYYY-MM-DD') as fecha_primer_vencimiento,
           (select valor from public.configuracion where clave = 'dias_gracia_mora') as dias_gracia,
           (select valor from public.configuracion where clave = 'mora_tope_porcentaje_cuota') as mora_tope
    from public.credito cr
    join public.cliente cl on cl.id = cr.cliente_id
    left join public.garante g on g.id = cr.garante_id
    left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
    left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
    where cr.id = ${id}`;
  if (!c) return null;
  const cuotas = await db<{ numero: number; fecha: string; cuota: number; capital: number; interes: number; saldoCapital: number | null; mora: number; pagado: number; estado: string }[]>`
    select numero, to_char(fecha_vencimiento, 'YYYY-MM-DD') as fecha, monto_cuota::float8 as cuota, capital::float8, interes::float8,
           saldo_capital::float8 as "saldoCapital", mora::float8, monto_pagado::float8 as pagado, estado
    from public.cuota where credito_id = ${id} order by numero`;
  const s = (k: string) => (c[k] == null ? null : String(c[k]));
  const tope = Number(c.mora_tope);
  return {
    codigo: String(c.codigo),
    tipo: c.tipo as DatosCredito["tipo"],
    estado: String(c.estado),
    cliente: {
      nombres: String(c.c_nombres), apellidos: String(c.c_apellidos), tipoDocumento: String(c.c_tdoc), numeroDocumento: String(c.c_doc),
      direccion: s("c_dir"), distrito: s("c_dist"), provincia: s("c_prov"), departamento: s("c_dep"), telefono: s("c_tel"), estadoCivil: s("c_civil"),
    },
    garante: c.g_nombres
      ? { nombres: String(c.g_nombres), apellidos: String(c.g_apellidos), tipoDocumento: String(c.g_tdoc), numeroDocumento: String(c.g_doc), direccion: s("g_dir"), telefono: s("g_tel"), parentesco: s("g_par") }
      : null,
    vehiculo: c.v_id
      ? {
          tipoVehiculo: String(c.tipo_vehiculo), marca: String(c.v_marca), modelo: String(c.v_modelo), anio: n(c.anio), color: s("v_color"),
          cilindradaCc: n(c.cilindrada_cc), condicion: String(c.v_cond), numeroMotor: String(c.numero_motor), numeroChasis: String(c.numero_chasis),
          placa: s("placa"), proveedorGps: s("proveedor_gps"), imeiGps: s("imei_gps"),
        }
      : null,
    celular: c.m_id
      ? {
          marca: String(c.m_marca), modelo: String(c.m_modelo), almacenamiento: s("almacenamiento"), memoriaRam: s("memoria_ram"), color: s("m_color"),
          condicion: String(c.m_cond), imei1: String(c.imei1), imei2: s("imei2"), numeroSerie: s("numero_serie"), plataformaBloqueo: String(c.plataforma_bloqueo),
        }
      : null,
    montoTotal: Number(c.monto_total),
    cuotaInicial: Number(c.cuota_inicial),
    montoFinanciado: Number(c.monto_financiado),
    tasaPorcentaje: Number(c.tasa_porcentaje),
    tipoCalculo: c.tipo_calculo as DatosCredito["tipoCalculo"],
    totalIntereses: Number(c.total_intereses),
    montoTotalPagar: Number(c.monto_total_pagar),
    frecuencia: c.frecuencia as DatosCredito["frecuencia"],
    numeroCuotas: Number(c.numero_cuotas),
    valorCuota: Number(c.valor_cuota),
    penalidadDiaria: Number(c.penalidad_diaria),
    teaPorcentaje: n(c.tea_porcentaje),
    fechaDesembolso: String(c.fecha_desembolso),
    fechaPrimerVencimiento: String(c.fecha_primer_vencimiento),
    diasGracia: Number.isFinite(Number(c.dias_gracia)) ? Number(c.dias_gracia) : 0,
    moraTopePorcentaje: c.mora_tope != null && Number.isFinite(tope) && tope > 0 ? tope : null,
    cuotas,
  };
}

/** Datos del recibo de un pago, buscado por id (panel) o por su token público (enlace de WhatsApp). */
export async function datosRecibo(filtro: { id: string } | { token: string }, db: Db = sql()): Promise<(DatosRecibo & { id: string; telefono: string | null }) | null> {
  const nombre = (t: string) => db.unsafe(`nullif(trim(coalesce(${t}.nombres, '') || ' ' || coalesce(${t}.apellidos, '')), '')`);
  const [p] = await db<Record<string, unknown>[]>`
    select p.id, p.numero_recibo::text, to_char(p.fecha_pago, 'YYYY-MM-DD') as fecha_pago, p.created_at, ${nombre("u")} as registrado_por,
           p.monto::float8, p.metodo, p.numero_operacion, p.anulado, p.motivo_anulacion, cr.id as credito_id, cr.codigo, cr.numero_cuotas,
           coalesce(uv.marca || ' ' || uv.modelo, uc.marca || ' ' || uc.modelo) as producto,
           cl.nombres, cl.apellidos, cl.tipo_documento, cl.numero_documento, cl.telefono,
           (select coalesce(sum(greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0)), 0) from public.cuota cu
            where cu.credito_id = cr.id and cu.estado <> 'PAGADA')::float8 as saldo,
           (select count(*) from public.cuota cu where cu.credito_id = cr.id and cu.estado = 'PAGADA')::int as pagadas
    from public.pago p
    join public.credito cr on cr.id = p.credito_id
    join public.cliente cl on cl.id = cr.cliente_id
    left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
    left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
    left join public.perfil_usuario u on u.id = p.registrado_por
    where ${"id" in filtro ? db`p.id = ${filtro.id}` : db`p.token_recibo = ${filtro.token}`}`;
  if (!p) return null;
  const aplicaciones = await db<DatosRecibo["aplicaciones"]>`
    select cu.numero, to_char(cu.fecha_vencimiento, 'YYYY-MM-DD') as vence, ap.mora::float8, ap.interes::float8, ap.capital::float8, ap.total::float8
    from public.aplicacion_pago ap join public.cuota cu on cu.id = ap.cuota_id
    where ap.pago_id = ${String(p.id)} order by cu.fecha_vencimiento, cu.numero`;
  return {
    id: String(p.id),
    telefono: p.telefono == null ? null : String(p.telefono),
    numeroRecibo: String(p.numero_recibo),
    fechaPago: String(p.fecha_pago),
    registradoEl: p.created_at as Date,
    registradoPor: p.registrado_por == null ? null : String(p.registrado_por),
    monto: Number(p.monto),
    metodo: ETIQUETA_METODO[p.metodo as MetodoPago] ?? String(p.metodo),
    numeroOperacion: p.numero_operacion == null ? null : String(p.numero_operacion),
    anulado: Boolean(p.anulado),
    motivoAnulacion: p.motivo_anulacion == null ? null : String(p.motivo_anulacion),
    codigoCredito: String(p.codigo),
    producto: p.producto == null ? null : String(p.producto),
    cliente: { nombres: String(p.nombres), apellidos: String(p.apellidos), tipoDocumento: String(p.tipo_documento), numeroDocumento: String(p.numero_documento) },
    aplicaciones,
    saldoCredito: Number(p.saldo),
    cuotasPagadas: Number(p.pagadas),
    numeroCuotas: Number(p.numero_cuotas),
  };
}

/** Deja constancia de quién generó o descargó un documento (audit_log, accion = DESCARGA). */
export async function auditarDescarga(p: { tabla: string; registroId: string; documento: string; usuarioId: string | null; req: Request }) {
  const ip = p.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const db = sql();
  await db`
    insert into public.audit_log (tabla, registro_id, accion, despues, usuario_id)
    values (${p.tabla}, ${p.registroId}, 'DESCARGA', ${db.json({ documento: p.documento, ip })}, ${p.usuarioId})`;
}

/** Respuesta PDF privada: sin caché, sin indexación, abierta en el navegador. */
export function respuestaPdf(bytes: Uint8Array, archivo: string, descargar = false): Response {
  const nombre = archivo.replace(/[^\w.\-]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const noEncontrado = () => new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

/** Origen público del sitio (https://dominio) para armar enlaces que se comparten fuera del panel. */
export async function origenPublico(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return siteConfig.url.replace(/\/$/, "");
}
