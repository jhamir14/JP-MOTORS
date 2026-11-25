import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { BotonImprimir } from "@/components/admin/BotonImprimir";
import { CampoArea, Encabezado, Estado, Panel, Tabla, fechaCorta } from "@/components/admin/ui";
import { ETIQUETA_SERVICIO, legible } from "@/lib/admin/constantes";
import { puedeGestionarCreditos } from "@/lib/creditos";
import { ETIQUETA_FRECUENCIA, type Frecuencia } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { anularCredito } from "../actions";

export const metadata = { title: "Crédito" };

interface Credito {
  id: string; codigo: string; tipo: keyof typeof ETIQUETA_SERVICIO; estado: string; cliente_id: string; cliente: string; documento: string;
  telefono: string | null; garante: string | null; garante_doc: string | null; bien: string | null; bien_id: string | null; plan: string | null;
  monto_total: number; cuota_inicial: number; monto_financiado: number; tasa_porcentaje: number; tipo_calculo: string;
  total_intereses: number; monto_total_pagar: number; frecuencia: Frecuencia; numero_cuotas: number; valor_cuota: number;
  penalidad_diaria: number; tea_porcentaje: number | null; fecha_desembolso: string; fecha_primer_vencimiento: string;
  fecha_cancelacion: string | null; motivo_anulacion: string | null; anulado_at: Date | null; anulado_por: string | null;
  creado_por: string | null; created_at: Date; notas: string | null; legado_origen: string | null;
}
interface Cuota { numero: number; fecha_vencimiento: string; monto_cuota: number; capital: number; interes: number; mora: number; monto_pagado: number; saldo_capital: number | null; estado: string; fecha_pago: string | null }

const fecha = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }) : "—";

function Dato({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-semibold break-words tabular">{children}</dd>
    </div>
  );
}

export default async function CreditoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string; anulado?: string }> }) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = sql();
  const nombre = (t: string) => db.unsafe(`nullif(trim(coalesce(${t}.nombres, '') || ' ' || coalesce(${t}.apellidos, '')), '')`);

  const [cr] = await db<Credito[]>`
    select cr.id, cr.codigo, cr.tipo, cr.estado, cr.cliente_id, cl.nombres || ' ' || cl.apellidos as cliente,
           cl.tipo_documento || ' ' || cl.numero_documento as documento, cl.telefono,
           ${nombre("g")} as garante, g.numero_documento as garante_doc,
           coalesce(uv.marca || ' ' || uv.modelo || coalesce(' ' || uv.anio, '') || coalesce(' · ' || uv.color, ''),
                    uc.marca || ' ' || uc.modelo || coalesce(' ' || uc.almacenamiento, '')) as bien,
           coalesce('Motor ' || uv.numero_motor || ' · Chasis ' || uv.numero_chasis || coalesce(' · Placa ' || uv.placa, ''), 'IMEI ' || uc.imei1) as bien_id,
           pl.nombre as plan,
           cr.monto_total::float8, cr.cuota_inicial::float8, cr.monto_financiado::float8, cr.tasa_porcentaje::float8, cr.tipo_calculo,
           cr.total_intereses::float8, cr.monto_total_pagar::float8, cr.frecuencia, cr.numero_cuotas, cr.valor_cuota::float8,
           cr.penalidad_diaria::float8, cr.tea_porcentaje::float8,
           to_char(cr.fecha_desembolso, 'YYYY-MM-DD') as fecha_desembolso, to_char(cr.fecha_primer_vencimiento, 'YYYY-MM-DD') as fecha_primer_vencimiento,
           to_char(cr.fecha_cancelacion, 'YYYY-MM-DD') as fecha_cancelacion, cr.motivo_anulacion, cr.anulado_at,
           ${nombre("pa")} as anulado_por, ${nombre("pc")} as creado_por, cr.created_at, cr.notas, cr.legado_origen
    from public.credito cr
    join public.cliente cl on cl.id = cr.cliente_id
    left join public.garante g on g.id = cr.garante_id
    left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
    left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
    left join public.plan_credito pl on pl.id = cr.plan_credito_id
    left join public.perfil_usuario pa on pa.id = cr.anulado_por
    left join public.perfil_usuario pc on pc.id = cr.creado_por
    where cr.id = ${id}`;
  if (!cr) notFound();

  const cuotas = await db<Cuota[]>`
    select numero, to_char(fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento, monto_cuota::float8, capital::float8, interes::float8,
           mora::float8, monto_pagado::float8, saldo_capital::float8, estado, to_char(fecha_pago, 'YYYY-MM-DD') as fecha_pago
    from public.cuota where credito_id = ${id} order by numero`;
  const pagado = cuotas.reduce((s, c) => s + Math.min(c.monto_pagado, c.monto_cuota), 0);
  const pagadas = cuotas.filter((c) => c.estado === "PAGADA").length;
  const saldo = Math.max(cr.monto_total_pagar - pagado, 0);
  const anulable = puedeGestionarCreditos(sesion.rol) && !["ANULADO", "FINALIZADO_LIQUIDADO"].includes(cr.estado) && pagado === 0;
  const f = ETIQUETA_FRECUENCIA[cr.frecuencia];

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/creditos" className="text-sm font-medium text-muted hover:text-brand">← Créditos</Link>
        <Link href={`/admin/clientes/${cr.cliente_id}`} className="text-sm font-semibold text-brand">Ficha del cliente →</Link>
      </div>
      <Encabezado titulo={`Crédito ${cr.codigo}`} acciones={<BotonImprimir />}>
        {ETIQUETA_SERVICIO[cr.tipo]} · {cr.cliente} ({cr.documento}) · entregado el {fecha(cr.fecha_desembolso)}
      </Encabezado>

      {sp.creado && (
        <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent print:hidden">
          Crédito registrado: {cr.numero_cuotas} cuotas generadas y la unidad quedó como vendida a crédito.
        </p>
      )}
      {cr.estado === "ANULADO" && (
        <div role={sp.anulado ? "status" : undefined} className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          <strong className="text-danger">Crédito anulado</strong>
          {cr.anulado_at && <> el {fechaCorta(cr.anulado_at)}</>}{cr.anulado_por && <> por {cr.anulado_por}</>}. Motivo: {cr.motivo_anulacion}
          {cr.bien && " La unidad volvió a stock."}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Estado valor={cr.estado} />
        <span className="text-sm text-muted tabular">{pagadas}/{cr.numero_cuotas} cuotas pagadas · saldo {formatSoles(saldo, true)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel titulo="Condiciones pactadas">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Dato k="Precio">{formatSoles(cr.monto_total, true)}</Dato>
            <Dato k="Inicial">{formatSoles(cr.cuota_inicial, true)}</Dato>
            <Dato k="Financiado">{formatSoles(cr.monto_financiado, true)}</Dato>
            <Dato k={`Cuota ${f?.adjetivo ?? ""}`}>{formatSoles(cr.valor_cuota, true)}</Dato>
            <Dato k="N.º de cuotas">{cr.numero_cuotas}</Dato>
            <Dato k="Total a pagar">{formatSoles(cr.monto_total_pagar, true)}</Dato>
            <Dato k="Tasa">{cr.tasa_porcentaje.toFixed(3).replace(/\.?0+$/, "")} % {cr.tipo_calculo === "FLAT" ? "flat" : `por ${f?.singular ?? "periodo"}`}</Dato>
            <Dato k="TEA">{cr.tea_porcentaje != null ? `${cr.tea_porcentaje.toFixed(2)} %` : "—"}</Dato>
            <Dato k="Intereses">{formatSoles(cr.total_intereses, true)}</Dato>
            <Dato k="Penalidad por día">{formatSoles(cr.penalidad_diaria, true)}</Dato>
            <Dato k="Primer vencimiento">{fecha(cr.fecha_primer_vencimiento)}</Dato>
            <Dato k="Cancelado el">{fecha(cr.fecha_cancelacion)}</Dato>
          </dl>
          {cr.notas && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line">{cr.notas}</p>}
        </Panel>
        <Panel titulo="Partes y bien">
          <dl className="grid gap-3">
            <Dato k="Cliente"><Link href={`/admin/clientes/${cr.cliente_id}`} className="text-brand hover:underline">{cr.cliente}</Link> <span className="font-normal text-muted">· {cr.documento}{cr.telefono ? ` · ${cr.telefono}` : ""}</span></Dato>
            <Dato k="Garante">{cr.garante ? `${cr.garante} · ${cr.garante_doc}` : "—"}</Dato>
            <Dato k="Producto">{cr.bien ?? "—"}{cr.bien_id && <span className="block text-xs font-normal text-muted">{cr.bien_id}</span>}</Dato>
            {cr.plan && <Dato k="Plan del catálogo">{cr.plan}</Dato>}
            <Dato k="Registrado">{cr.legado_origen ? "Migrado del sistema anterior" : `${fechaCorta(cr.created_at)}${cr.creado_por ? ` por ${cr.creado_por}` : ""}`}</Dato>
          </dl>
        </Panel>
      </div>

      <Panel className="mt-6" titulo="Cronograma de pagos">
        <Tabla className="shadow-none">
          <thead>
            <tr><th>N.º</th><th>Vence</th><th className="text-right">Cuota</th><th className="text-right">Capital</th><th className="text-right">Interés</th><th className="text-right">Mora</th><th className="text-right">Pagado</th><th className="text-right">Saldo capital</th><th>Estado</th></tr>
          </thead>
          <tbody className="tabular">
            {cuotas.map((c) => (
              <tr key={c.numero}>
                <td>{c.numero}</td>
                <td className="whitespace-nowrap">{fecha(c.fecha_vencimiento)}</td>
                <td className="text-right font-semibold">{c.monto_cuota.toFixed(2)}</td>
                <td className="text-right">{c.capital.toFixed(2)}</td>
                <td className="text-right">{c.interes.toFixed(2)}</td>
                <td className="text-right">{c.mora > 0 ? c.mora.toFixed(2) : "—"}</td>
                <td className="text-right">{c.monto_pagado > 0 ? c.monto_pagado.toFixed(2) : "—"}</td>
                <td className="text-right text-muted">{c.saldo_capital != null ? c.saldo_capital.toFixed(2) : "—"}</td>
                <td><Estado valor={c.estado} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-semibold tabular [&_td]:px-4 [&_td]:py-3">
            <tr className="border-t border-line">
              <td colSpan={2}>Total</td>
              <td className="text-right">{cuotas.reduce((s, c) => s + c.monto_cuota, 0).toFixed(2)}</td>
              <td className="text-right">{cuotas.reduce((s, c) => s + c.capital, 0).toFixed(2)}</td>
              <td className="text-right">{cuotas.reduce((s, c) => s + c.interes, 0).toFixed(2)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </Tabla>
        <p className="mt-2 text-xs text-muted print:hidden">Domingos y feriados no se cobran. Los pagos se registran desde Cobranzas (Fase 5).</p>
      </Panel>

      {anulable && (
        <Panel className="mt-6 print:hidden" titulo="Anular crédito">
          <AdminForm action={anularCredito} className="grid gap-3">
            <input type="hidden" name="creditoId" value={cr.id} />
            <p className="text-sm text-muted">
              Solo si el crédito se registró por error o el cliente desistió antes de pagar. La unidad vuelve a stock,
              las cuotas dejan de cobrarse y el motivo queda en la auditoría. No se puede deshacer.
            </p>
            <CampoArea label="Motivo de la anulación" name="motivo" id="motivo-anulacion" rows={2} required minLength={10} maxLength={500} />
            <BotonEnviar variant="outline" size="sm" className="justify-self-start border-danger text-danger" pendiente="Anulando…">Anular crédito</BotonEnviar>
          </AdminForm>
        </Panel>
      )}
      {cr.estado !== "ANULADO" && !anulable && puedeGestionarCreditos(sesion.rol) && pagado > 0 && (
        <p className="mt-4 text-xs text-muted print:hidden">Este crédito tiene pagos aplicados: no se puede anular.</p>
      )}
      <p className="mt-6 hidden text-xs print:block">Tipo: {legible(cr.tipo_calculo)} · Documento referencial generado por el panel de Inversiones JP.</p>
    </>
  );
}
