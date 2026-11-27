import Link from "next/link";
import { notFound } from "next/navigation";
import { creditoEnArea } from "@/lib/server/areas";
import type { ReactNode } from "react";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { BotonImprimir } from "@/components/admin/BotonImprimir";
import { CampoArea, CampoSelect, CampoTexto, Encabezado, Estado, Panel, Tabla, fechaCorta } from "@/components/admin/ui";
import { ETIQUETA_SERVICIO, legible } from "@/lib/admin/constantes";
import { ESTADOS_CREDITO_ACTIVO, puedeGestionarCreditos } from "@/lib/creditos";
import { ETIQUETA_FRECUENCIA, type Frecuencia } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { ACCIONES_BLOQUEO, ETIQUETA_METODO, ROLES_BLOQUEO, type MetodoPago } from "@/lib/pagos";
import { buttonClasses } from "@/components/ui/Button";
import { registrarEventoBloqueo } from "../../pagos/actions";
import { puede, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { describirBeneficio } from "@/lib/scoring";
import { ConfirmarEliminar } from "@/components/admin/ConfirmarEliminar";
import { anularCredito, eliminarCredito } from "../actions";
import { eliminarDocumentoCredito, subirDocumentoCredito } from "../documentosActions";
import { SubirDocumentoCredito } from "@/components/admin/SubirDocumentoCredito";
import { ETIQUETA_DOCUMENTO_FIRMADO, ROLES_DOCUMENTOS_LEGALES, TIPOS_DOCUMENTO_FIRMADO } from "@/lib/documentos";

export const metadata = { title: "Crédito" };

interface Credito {
  id: string; codigo: string; tipo: keyof typeof ETIQUETA_SERVICIO; estado: string; cliente_id: string; cliente: string; documento: string;
  telefono: string | null; garante: string | null; garante_doc: string | null; bien: string | null; bien_id: string | null; plan: string | null;
  monto_total: number; cuota_inicial: number; monto_financiado: number; tasa_porcentaje: number; tipo_calculo: string;
  total_intereses: number; monto_total_pagar: number; frecuencia: Frecuencia; numero_cuotas: number; valor_cuota: number;
  penalidad_diaria: number; tea_porcentaje: number | null; fecha_desembolso: string; fecha_primer_vencimiento: string;
  fecha_cancelacion: string | null; motivo_anulacion: string | null; anulado_at: Date | null; anulado_por: string | null;
  creado_por: string | null; asesor: string | null; created_at: Date; notas: string | null; legado_origen: string | null;
  beneficio_score: { nivel: string; score: number | null; descuentoTasaPct: number; reduccionInicialPct: number; cuotasExtra: number } | null;
  estado_unidad_bloqueo: string | null;
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
  // Cada administrador de área solo abre lo suyo.
  if (!(await creditoEnArea(sesion, id))) notFound();
  const db = sql();
  const nombre = (t: string) => db.unsafe(`nullif(trim(coalesce(${t}.nombres, '') || ' ' || coalesce(${t}.apellidos, '')), '')`);

  const [cr] = await db<Credito[]>`
    select cr.id, cr.codigo, cr.tipo, cr.estado, cr.cliente_id, cl.nombres || ' ' || cl.apellidos as cliente,
           case when cl.numero_documento ~* '^(SIN-?DOC|OLD)' then 'Sin DNI' else cl.tipo_documento || ' ' || cl.numero_documento end as documento, cl.telefono,
           ${nombre("g")} as garante, g.numero_documento as garante_doc,
           coalesce(uv.marca || ' ' || uv.modelo || coalesce(' ' || uv.anio, '') || coalesce(' · ' || uv.color, ''),
                    uc.marca || ' ' || uc.modelo || coalesce(' ' || uc.almacenamiento, '')) as bien,
           coalesce('Motor ' || uv.numero_motor || ' · Chasis ' || uv.numero_chasis || coalesce(' · Placa ' || uv.placa, ''), 'IMEI ' || uc.imei1) as bien_id,
           pl.nombre as plan, coalesce(uc.estado_bloqueo::text, uv.estado_gps::text) as estado_unidad_bloqueo,
           cr.monto_total::float8, cr.cuota_inicial::float8, cr.monto_financiado::float8, cr.tasa_porcentaje::float8, cr.tipo_calculo,
           cr.total_intereses::float8, cr.monto_total_pagar::float8, cr.frecuencia, cr.numero_cuotas, cr.valor_cuota::float8,
           cr.penalidad_diaria::float8, cr.tea_porcentaje::float8,
           to_char(cr.fecha_desembolso, 'YYYY-MM-DD') as fecha_desembolso, to_char(cr.fecha_primer_vencimiento, 'YYYY-MM-DD') as fecha_primer_vencimiento,
           to_char(cr.fecha_cancelacion, 'YYYY-MM-DD') as fecha_cancelacion, cr.motivo_anulacion, cr.anulado_at,
           ${nombre("pa")} as anulado_por, ${nombre("pc")} as creado_por, ${nombre("pv")} as asesor, cr.created_at, cr.notas, cr.legado_origen, cr.beneficio_score
    from public.credito cr
    join public.cliente cl on cl.id = cr.cliente_id
    left join public.garante g on g.id = cr.garante_id
    left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
    left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
    left join public.plan_credito pl on pl.id = cr.plan_credito_id
    left join public.perfil_usuario pa on pa.id = cr.anulado_por
    left join public.perfil_usuario pc on pc.id = cr.creado_por
    left join public.perfil_usuario pv on pv.id = cr.asesor_id
    where cr.id = ${id}`;
  if (!cr) notFound();

  const cuotas = await db<Cuota[]>`
    select numero, to_char(fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento, monto_cuota::float8, capital::float8, interes::float8,
           mora::float8, monto_pagado::float8, saldo_capital::float8, estado, to_char(fecha_pago, 'YYYY-MM-DD') as fecha_pago
    from public.cuota where credito_id = ${id} order by numero`;
  const [pagos, eventos, documentos] = await Promise.all([
    db<{ id: string; numero_recibo: string; fecha_pago: string; monto: number; metodo: MetodoPago; anulado: boolean; registrado_por: string | null }[]>`
      select p.id, p.numero_recibo::text, to_char(p.fecha_pago, 'YYYY-MM-DD') as fecha_pago, p.monto::float8, p.metodo, p.anulado,
             ${nombre("u")} as registrado_por
      from public.pago p left join public.perfil_usuario u on u.id = p.registrado_por
      where p.credito_id = ${id} order by p.fecha_pago desc, p.created_at desc`,
    db<{ id: string; accion: string; motivo: string; created_at: Date; por: string | null }[]>`
      select e.id, e.accion, e.motivo, e.created_at, ${nombre("u")} as por
      from public.evento_bloqueo e left join public.perfil_usuario u on u.id = e.realizado_por
      where e.credito_id = ${id} order by e.created_at desc`,
    db<{ id: string; tipo: keyof typeof ETIQUETA_DOCUMENTO_FIRMADO; nombre: string; tipo_mime: string; tamano: number; created_at: Date; por: string | null }[]>`
      select d.id, d.tipo, d.nombre, d.tipo_mime, d.tamano, d.created_at, ${nombre("u")} as por
      from public.documento_credito d left join public.perfil_usuario u on u.id = d.subido_por
      where d.credito_id = ${id} order by d.created_at desc`,
  ]);
  const pagado = pagos.filter((p) => !p.anulado).reduce((s, p) => s + p.monto, 0);
  const pagadas = cuotas.filter((c) => c.estado === "PAGADA").length;
  const saldo = cuotas.filter((c) => c.estado !== "PAGADA").reduce((s, c) => s + Math.max(c.monto_cuota + c.mora - c.monto_pagado, 0), 0);
  const moraPendiente = cuotas.filter((c) => c.estado !== "PAGADA").reduce((s, c) => s + c.mora, 0);
  const activo = (ESTADOS_CREDITO_ACTIVO as readonly string[]).includes(cr.estado);
  const anulable = puedeGestionarCreditos(sesion.rol) && !["ANULADO", "FINALIZADO_LIQUIDADO"].includes(cr.estado) && pagado === 0;
  const acciones = cr.tipo === "CREDITO_CELULAR" ? ACCIONES_BLOQUEO.CREDITO_CELULAR : cr.tipo === "CREDITO_VEHICULAR" ? ACCIONES_BLOQUEO.CREDITO_VEHICULAR : [];
  const puedeBloquear = (ROLES_BLOQUEO as readonly string[]).includes(sesion.rol) && cr.bien && acciones.length > 0 && cr.estado !== "ANULADO";
  const f = ETIQUETA_FRECUENCIA[cr.frecuencia];
  const legales = puede(sesion, ...ROLES_DOCUMENTOS_LEGALES) && cr.estado !== "ANULADO";
  const nombreContrato = cr.tipo === "PRESTAMO_EFECTIVO" ? "Contrato de mutuo" : "Contrato";
  const faltaContrato = legales && !cr.legado_origen && !documentos.some((d) => d.tipo === "CONTRATO_FIRMADO");
  const pdf = (tipo: string) => `/api/documentos/credito/${cr.id}/${tipo}`;

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/creditos" className="text-sm font-medium text-muted hover:text-brand">← Créditos</Link>
        <Link href={`/admin/clientes/${cr.cliente_id}`} className="text-sm font-semibold text-brand">Ficha del cliente →</Link>
      </div>
      <Encabezado titulo={`${cr.tipo === "PRESTAMO_EFECTIVO" ? "Préstamo" : "Crédito"} ${cr.codigo}`} acciones={
        <>
          {activo && <Link href={`/admin/creditos/${cr.id}/pagar`} className={buttonClasses({ variant: "primary", size: "sm" }, "print:hidden")}>Registrar pago</Link>}
          <a href={pdf("cronograma")} target="_blank" rel="noopener" className={buttonClasses({ variant: "outline", size: "sm" }, "print:hidden")}>Cronograma PDF</a>
          <BotonImprimir>Imprimir</BotonImprimir>
        </>
      }>
        {ETIQUETA_SERVICIO[cr.tipo]} · {cr.cliente} ({cr.documento}) · entregado el {fecha(cr.fecha_desembolso)}
      </Encabezado>

      {sp.creado && (
        <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent print:hidden">
          {cr.tipo === "PRESTAMO_EFECTIVO" ? `Préstamo registrado: ${cr.numero_cuotas} cuotas generadas.` : `Crédito registrado: ${cr.numero_cuotas} cuotas generadas y la unidad quedó como vendida a crédito.`}
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
        <span className="text-sm text-muted tabular">
          {pagadas}/{cr.numero_cuotas} cuotas pagadas · cobrado {formatSoles(pagado, true)} · saldo {formatSoles(saldo, true)}
          {moraPendiente > 0 && <> (incluye mora {formatSoles(moraPendiente, true)})</>}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel titulo="Condiciones pactadas">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Dato k={cr.tipo === "PRESTAMO_EFECTIVO" ? "Monto prestado" : "Precio"}>{formatSoles(cr.monto_total, true)}</Dato>
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
          {cr.beneficio_score && (
            <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">
              🎁 <strong>{cr.beneficio_score.nivel}</strong>{cr.beneficio_score.score != null ? ` (score ${cr.beneficio_score.score})` : ""}: {describirBeneficio({ ...cr.beneficio_score, scoreMin: 0, nombre: cr.beneficio_score.nivel })}.
              Condiciones aplicadas al registrar el crédito.
            </p>
          )}
          {cr.notas && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line">{cr.notas}</p>}
        </Panel>
        <Panel titulo="Partes y bien">
          <dl className="grid gap-3">
            <Dato k="Cliente"><Link href={`/admin/clientes/${cr.cliente_id}`} className="text-brand hover:underline">{cr.cliente}</Link> <span className="font-normal text-muted">· {cr.documento}{cr.telefono ? ` · ${cr.telefono}` : ""}</span></Dato>
            <Dato k="Garante">{cr.garante ? `${cr.garante} · ${cr.garante_doc}` : "—"}</Dato>
            <Dato k="Producto">{cr.bien ?? "—"}{cr.bien_id && <span className="block text-xs font-normal text-muted">{cr.bien_id}</span>}</Dato>
            {cr.plan && <Dato k="Plan del catálogo">{cr.plan}</Dato>}
            <Dato k="Asesor de ventas">{cr.asesor ?? "—"}</Dato>
            <Dato k="Registrado">{cr.legado_origen ? "Migrado del sistema anterior" : `${fechaCorta(cr.created_at)}${cr.creado_por ? ` por ${cr.creado_por}` : ""}`}</Dato>
          </dl>
        </Panel>
      </div>

      <Panel className="mt-6 print:hidden" titulo="Documentos">
        <div className="flex flex-wrap gap-2">
          {legales && (
            <>
              <a href={pdf("contrato")} target="_blank" rel="noopener" className={buttonClasses({ variant: "primary", size: "sm" })}>{nombreContrato} (PDF)</a>
              <a href={pdf("pagare")} target="_blank" rel="noopener" className={buttonClasses({ variant: "outline", size: "sm" })}>Pagaré (PDF)</a>
            </>
          )}
          <a href={pdf("cronograma")} target="_blank" rel="noopener" className={buttonClasses({ variant: "outline", size: "sm" })}>Cronograma (PDF)</a>
        </div>
        <p className="mt-2 text-xs text-muted">
          Se generan con las condiciones pactadas y los datos actuales del cliente{cr.garante ? ", del fiador" : ""} y {cr.tipo === "CREDITO_CELULAR" ? "del equipo (IMEI)" : cr.tipo === "CREDITO_VEHICULAR" ? "del vehículo (motor, chasis, placa)" : "del préstamo"}.
          Imprime, firma (con huella) y sube aquí el escaneo o una foto.
        </p>
        {faltaContrato && (
          <p role="status" className="mt-3 rounded-xl bg-gold-soft px-4 py-2 text-sm font-medium text-[#8a5d00]">Falta subir el contrato firmado.</p>
        )}
        {documentos.length > 0 && (
          <ul className="mt-4 divide-y divide-line-soft text-sm">
            {documentos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <a href={`/api/documentos-credito/${d.id}`} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
                    {ETIQUETA_DOCUMENTO_FIRMADO[d.tipo]} ↗
                  </a>
                  <span className="block truncate text-xs text-muted">
                    {d.nombre} · {d.tipo_mime === "application/pdf" ? "PDF" : "foto"} · {(d.tamano / 1024).toFixed(0)} KB · {fechaCorta(d.created_at)}{d.por ? ` · ${d.por}` : ""}
                  </span>
                </div>
                {puedeGestionarCreditos(sesion.rol) && (
                  <form action={eliminarDocumentoCredito}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="cursor-pointer text-xs font-semibold text-danger hover:underline">Eliminar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {legales && (
          <div className="mt-4 border-t border-line-soft pt-4">
            <SubirDocumentoCredito
              action={subirDocumentoCredito}
              creditoId={cr.id}
              tipos={TIPOS_DOCUMENTO_FIRMADO.map((t) => ({ value: t, label: ETIQUETA_DOCUMENTO_FIRMADO[t] }))}
            />
          </div>
        )}
      </Panel>

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
        <p className="mt-2 text-xs text-muted print:hidden">
          Domingos y feriados no se cobran. La mora es la penalidad diaria por cada día de atraso que pasa los días de gracia.
        </p>
      </Panel>

      <Panel className="mt-6 print:hidden" titulo="Pagos" acciones={activo ? <Link href={`/admin/creditos/${cr.id}/pagar`} className="text-sm font-semibold text-brand">+ Registrar pago</Link> : undefined}>
        {pagos.length === 0 ? (
          <p className="text-sm text-muted">Sin pagos registrados.</p>
        ) : (
          <Tabla className="shadow-none">
            <thead><tr><th>Recibo</th><th>Fecha</th><th className="text-right">Monto</th><th>Método</th><th>Registrado por</th></tr></thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id} className={p.anulado ? "opacity-60" : undefined}>
                  <td><Link href={`/admin/pagos/${p.id}`} className="font-mono text-xs font-semibold text-brand hover:underline">{p.numero_recibo.padStart(6, "0")}</Link></td>
                  <td className="whitespace-nowrap">{fecha(p.fecha_pago)}</td>
                  <td className={`text-right font-semibold tabular ${p.anulado ? "line-through" : ""}`}>{formatSoles(p.monto, true)}</td>
                  <td>{ETIQUETA_METODO[p.metodo]}{p.anulado && <span className="ml-1 text-xs text-danger">anulado</span>}</td>
                  <td className="text-xs text-muted">{p.registrado_por ?? "Sistema anterior"}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {(puedeBloquear || eventos.length > 0) && (
        <Panel className="mt-6 print:hidden" titulo={cr.tipo === "CREDITO_CELULAR" ? "Bloqueo del celular" : "GPS y corta-corriente"}>
          {cr.estado_unidad_bloqueo && (
            <p className="mb-3 text-sm">Estado actual: <Estado valor={cr.estado_unidad_bloqueo} /></p>
          )}
          {puedeBloquear && (
            <AdminForm action={registrarEventoBloqueo} resetOnSuccess className="mb-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
              <input type="hidden" name="creditoId" value={cr.id} />
              <CampoSelect label="Acción realizada" name="accion" opciones={acciones} />
              <CampoTexto label="Motivo" name="motivo" required minLength={5} maxLength={500} placeholder="Ej. 12 días de atraso, sin respuesta" />
              <BotonEnviar variant="outline" size="sm">Registrar</BotonEnviar>
              <p className="text-xs text-muted sm:col-span-3">
                Haz la acción en la plataforma del proveedor (PayJoy, Knox, GPS) y regístrala aquí: queda quién, cuándo y por qué.
              </p>
            </AdminForm>
          )}
          {eventos.length > 0 && (
            <ul className="divide-y divide-line-soft text-sm">
              {eventos.map((e) => (
                <li key={e.id} className="py-2">
                  <strong>{legible(e.accion)}</strong> · {e.motivo}
                  <span className="block text-xs text-muted">{fechaCorta(e.created_at)}{e.por ? ` · ${e.por}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

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
        <p className="mt-4 text-xs text-muted print:hidden">Este crédito tiene pagos vigentes: para anularlo, primero anula sus pagos.</p>
      )}
      {sesion.rol === "SUPERADMIN" && (
        <div className="mt-8 border-t border-line-soft pt-6 print:hidden">
          <ConfirmarEliminar action={eliminarCredito} id={cr.id} titulo={cr.tipo === "PRESTAMO_EFECTIVO" ? "Eliminar préstamo" : "Eliminar crédito"}>
            Se borrará <strong>{cr.codigo}</strong> con su cronograma{pagado > 0 ? <>, <strong>sus pagos ({formatSoles(pagado, true)})</strong></> : ""}, recordatorios
            y documentos{cr.bien ? "; la unidad vuelve a stock" : ""}. No se puede deshacer. Para un crédito registrado por error sin pagos, también puedes anularlo
            (queda en el historial).
          </ConfirmarEliminar>
        </div>
      )}
      <p className="mt-6 hidden text-xs print:block">Tipo: {legible(cr.tipo_calculo)} · Documento referencial generado por el panel de Inversiones JP.</p>
    </>
  );
}
