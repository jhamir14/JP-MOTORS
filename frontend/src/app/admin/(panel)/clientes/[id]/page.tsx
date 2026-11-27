import Link from "next/link";
import { ConfirmarEliminar } from "@/components/admin/ConfirmarEliminar";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CapturarUbicacion } from "@/components/admin/Gps";
import { ScoreCliente } from "@/components/admin/ScoreCliente";
import { SubirDocumento } from "@/components/admin/SubirDocumento";
import { BotonRecordatorio } from "@/components/admin/BotonRecordatorio";
import { CampoArea, CampoSelect, CampoTexto, Encabezado, Estado, Panel, Tabla, Vacio, fechaCorta } from "@/components/admin/ui";
import { Badge, ButtonLink } from "@/components/ui";
import { ETIQUETA_SERVICIO, legible } from "@/lib/admin/constantes";
import { tiposDe } from "@/lib/areas";
import { puedeGestionarCreditos } from "@/lib/creditos";
import {
  DOCUMENTOS_GARANTE,
  ETIQUETA_DOCUMENTO,
  ETIQUETA_DOCUMENTO_KYC,
  ETIQUETA_ESTADO_CLIENTE,
  ETIQUETA_PARENTESCO,
  PARENTESCOS,
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_KYC,
  TONO_ESTADO_CLIENTE,
  documentoVisible,
  enlaceMapa,
  esDocumentoProvisional,
  enlaceRuta,
  faltantesCliente,
  puedeBloquearCliente,
  puedeEditarKyc,
  puedeVerDocumento,
  type DatosKyc,
  type EstadoCliente,
  type TipoDocumentoKyc,
} from "@/lib/clientes";
import { formatSoles } from "@/lib/format";
import { estrellas } from "@/lib/scoring";
import { whatsappLink } from "@/lib/whatsapp";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { creditosPorCobrar } from "@/lib/server/cobranza";
import { perfilScore } from "@/lib/server/scoring";
import { registrarRecordatorio } from "../../cobranzas/actions";
import { cambiarBloqueo, desvincularGarante, eliminarCliente, eliminarDocumento, guardarGarante, guardarUbicacion, subirDocumento } from "../actions";

export const metadata = { title: "Ficha del cliente" };

interface Cliente extends DatosKyc {
  id: string; nombres: string; apellidos: string; telefono_secundario: string | null; email: string | null; urbanizacion: string | null;
  direccion_trabajo: string | null; estado: EstadoCliente; score_interno: number | null;
  notas: string | null; datos_incompletos: boolean; legado_id: number | null; geo_precision_m: number | null;
  geo_registrada_at: Date | null; created_at: Date; updated_at: Date; registrado_por: string | null;
}
interface Documento { id: string; cliente_id: string | null; garante_id: string | null; tipo: TipoDocumentoKyc; nombre: string; tipo_mime: string; tamano: number; created_at: Date; subido_por: string | null }
interface Garante {
  id: string; nombres: string; apellidos: string; tipo_documento: string; numero_documento: string; telefono: string | null;
  direccion: string | null; parentesco: string | null; notas: string | null; otros_clientes: number; creditos: number;
}
interface Credito {
  id: string; codigo: string; tipo: keyof typeof ETIQUETA_SERVICIO; estado: string; monto_total: number; cuota_inicial: number;
  monto_financiado: number; monto_total_pagar: number; valor_cuota: number; frecuencia: string; numero_cuotas: number;
  tasa_porcentaje: number; tipo_calculo: string; tea_porcentaje: number | null; fecha_desembolso: Date; pagado: number;
  cuotas_pagadas: number; cuotas_mora: number; bien: string | null; garante: string | null; legado_origen: string | null;
}
interface Cuota { credito_id: string; numero: number; fecha_vencimiento: Date; monto_cuota: number; mora: number; monto_pagado: number; estado: string; fecha_pago: Date | null }

const fecha = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("es-PE", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }) : "—";
const PLURAL_FRECUENCIA: Record<string, string> = { DIARIO: "diarias", SEMANAL: "semanales", QUINCENAL: "quincenales", MENSUAL: "mensuales" };
const peso = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Dato({ k, children, vacio }: { k: string; children: ReactNode; vacio?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={vacio ? "text-sm font-medium text-[#8a5d00]" : "font-medium break-words"}>{vacio ? "Falta" : children}</dd>
    </div>
  );
}

export default async function FichaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; guardado?: string; vinculada?: string }>;
}) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = sql();
  const edita = puedeEditarKyc(sesion.rol);

  const [cliente] = await db<Cliente[]>`
    select c.id, c.nombres, c.apellidos, c.tipo_documento, c.numero_documento, to_char(c.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
           c.sexo, c.estado_civil, c.telefono, c.telefono_secundario, c.email::text, c.direccion, c.urbanizacion, c.distrito, c.provincia,
           c.departamento, c.referencia, c.tipo_vivienda, c.latitud::float8, c.longitud::float8, c.ocupacion, c.direccion_trabajo,
           c.ingreso_mensual::float8, c.estado, c.score_interno, c.notas, c.datos_incompletos, c.legado_id,
           c.geo_precision_m, c.geo_registrada_at, c.created_at, c.updated_at,
           nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as registrado_por
    from public.cliente c left join public.perfil_usuario p on p.id = c.registrado_por
    where c.id = ${id}`;
  if (!cliente) notFound();
  // Los créditos del cliente que se listan son solo los del área de quien consulta.
  const tipos = tiposDe(sesion.rol);

  const [garantes, creditos, cuotas, solicitudes, historial, cobranza, score] = await Promise.all([
    db<Garante[]>`
      select g.id, g.nombres, g.apellidos, g.tipo_documento, g.numero_documento, g.telefono, g.direccion,
             coalesce(cg.parentesco, g.parentesco) as parentesco, cg.notas,
             (select count(*) from public.cliente_garante o where o.garante_id = g.id and o.cliente_id <> ${id})::int as otros_clientes,
             (select count(*) from public.credito cr where cr.garante_id = g.id and cr.estado <> 'ANULADO')::int as creditos
      from public.cliente_garante cg join public.garante g on g.id = cg.garante_id
      where cg.cliente_id = ${id} order by cg.created_at`,
    db<Credito[]>`
      select cr.id, cr.codigo, cr.tipo, cr.estado, cr.monto_total::float8, cr.cuota_inicial::float8, cr.monto_financiado::float8,
             cr.monto_total_pagar::float8, cr.valor_cuota::float8, cr.frecuencia, cr.numero_cuotas, cr.tasa_porcentaje::float8,
             cr.tipo_calculo, cr.tea_porcentaje::float8, cr.fecha_desembolso, cr.legado_origen,
             coalesce((select sum(least(cu.monto_pagado, cu.monto_cuota)) from public.cuota cu where cu.credito_id = cr.id), 0)::float8 as pagado,
             (select count(*) from public.cuota cu where cu.credito_id = cr.id and cu.estado = 'PAGADA')::int as cuotas_pagadas,
             (select count(*) from public.cuota cu where cu.credito_id = cr.id and cu.estado = 'EN_MORA')::int as cuotas_mora,
             coalesce(uv.marca || ' ' || uv.modelo || coalesce(' · ' || uv.placa, ''), uc.marca || ' ' || uc.modelo || ' · IMEI ' || uc.imei1) as bien,
             nullif(trim(coalesce(g.nombres, '') || ' ' || coalesce(g.apellidos, '')), '') as garante
      from public.credito cr
      left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
      left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
      left join public.garante g on g.id = cr.garante_id
      where cr.cliente_id = ${id} and cr.tipo::text = any(${tipos})
      order by cr.fecha_desembolso desc, cr.created_at desc`,
    db<Cuota[]>`
      select cu.credito_id, cu.numero, cu.fecha_vencimiento, cu.monto_cuota::float8, cu.mora::float8, cu.monto_pagado::float8, cu.estado, cu.fecha_pago
      from public.cuota cu join public.credito cr on cr.id = cu.credito_id
      where cr.cliente_id = ${id} and cr.tipo::text = any(${tipos}) order by cu.credito_id, cu.numero`,
    db<{ id: string; servicio: keyof typeof ETIQUETA_SERVICIO | "OTRO"; producto_interes: string | null; monto_solicitado: number | null; created_at: Date }[]>`
      select id, servicio, producto_interes, monto_solicitado::float8, created_at
      from public.solicitud_credito where cliente_id = ${id} order by created_at desc`,
    sesion.rol === "SUPERADMIN"
      ? db<{ accion: string; tabla: string; created_at: Date; usuario: string | null; tipo: string | null }[]>`
          select a.accion, a.tabla, a.created_at, a.despues ->> 'tipo' as tipo,
                 nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as usuario
          from public.audit_log a left join public.perfil_usuario p on p.id = a.usuario_id
          where (a.tabla = 'cliente' and a.registro_id = ${id})
             or (a.tabla = 'documento_kyc' and coalesce(a.despues, a.antes) ->> 'cliente_id' = ${id})
          order by a.created_at desc limit 15`
      : Promise.resolve([]),
    creditosPorCobrar(db, { clienteId: id, tipos }),
    perfilScore(db, id),
  ]);
  const porCobrar = new Map(cobranza.creditos.map((c) => [c.id, c]));

  const garanteIds = garantes.map((g) => g.id);
  const documentos = await db<Documento[]>`
    select id, cliente_id, garante_id, tipo, nombre, tipo_mime, tamano, created_at, subido_por
    from public.documento_kyc
    where cliente_id = ${id} ${garanteIds.length ? db`or garante_id in ${db(garanteIds)}` : db``}
    order by created_at desc`;
  const docsCliente = documentos.filter((d) => d.cliente_id === id);
  const faltan = faltantesCliente(cliente, docsCliente.map((d) => d.tipo));
  const tieneGps = cliente.latitud != null && cliente.longitud != null;
  const cuotasDe = (creditoId: string) => cuotas.filter((c) => c.credito_id === creditoId);

  const listaDocumentos = (docs: Documento[]) =>
    docs.length === 0 ? null : (
      <ul className="grid gap-2">
        {docs.map((d) => {
          const visible = puedeVerDocumento(sesion.rol, d.tipo);
          return (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-soft px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-semibold">{ETIQUETA_DOCUMENTO_KYC[d.tipo]}</div>
                <div className="truncate text-xs text-muted">{d.tipo_mime === "application/pdf" ? "PDF" : "Foto"} · {peso(d.tamano)} · {fechaCorta(d.created_at)}</div>
              </div>
              <div className="flex items-center gap-3">
                {visible ? (
                  <a href={`/api/kyc/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand">Ver ↗</a>
                ) : (
                  <span className="text-xs text-muted" title="Tu rol no tiene acceso a este documento">🔒 Restringido</span>
                )}
                {edita && (
                  <form action={eliminarDocumento}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="volverA" value={id} />
                    <button type="submit" className="cursor-pointer text-xs font-semibold text-danger">Eliminar</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );

  const avisos = [
    sp.creado && "Cliente registrado. Ya puedes registrarle un crédito o préstamo.",
    sp.guardado && "Cambios guardados.",
    sp.vinculada && "Solicitud vinculada a este cliente.",
  ].filter(Boolean);

  return (
    <>
      <Link href="/admin/clientes" className="text-sm font-medium text-muted hover:text-brand">← Clientes</Link>
      <Encabezado
        titulo={`${cliente.nombres} ${cliente.apellidos}`}
        acciones={
          <>
            {cliente.telefono && (
              <>
                <a href={whatsappLink(`Hola ${cliente.nombres.split(" ")[0]}, te escribimos de Inversiones JP.`, `51${cliente.telefono}`)} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white">WhatsApp</a>
                <a href={`tel:+51${cliente.telefono}`} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand">Llamar</a>
              </>
            )}
            {edita && <ButtonLink href={`/admin/clientes/${id}/editar`} variant={puedeGestionarCreditos(sesion.rol) ? "outline" : "brand"} size="sm">Editar datos</ButtonLink>}
            {puedeGestionarCreditos(sesion.rol) && cliente.estado !== "BLOQUEADO_LEGAL" && (
              <ButtonLink href={`/admin/creditos/nuevo?cliente=${id}`} variant="brand" size="sm">+ Nuevo crédito</ButtonLink>
            )}
          </>
        }
      >
        {esDocumentoProvisional(cliente.numero_documento) ? "Sin DNI" : `${ETIQUETA_DOCUMENTO[cliente.tipo_documento as keyof typeof ETIQUETA_DOCUMENTO] ?? cliente.tipo_documento} ${cliente.numero_documento}`}
        {" · "}cliente desde {fecha(cliente.created_at)}
        {cliente.legado_id != null && " · migrado del sistema anterior"}
        {cliente.registrado_por && ` · registrado por ${cliente.registrado_por}`}
      </Encabezado>

      {avisos.map((a) => (
        <p key={String(a)} role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">{a}</p>
      ))}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={TONO_ESTADO_CLIENTE[cliente.estado]}>{ETIQUETA_ESTADO_CLIENTE[cliente.estado]}</Badge>
        <a href="#score" className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-brand">
          Score {cliente.score_interno != null ? <span className="text-gold">{estrellas(cliente.score_interno)}</span> : "sin historial"}
        </a>
      </div>

      {faltan.length > 0 && (
        <section aria-labelledby="pendientes" className="mb-6 rounded-2xl border border-gold bg-gold-soft/60 p-5">
          <h2 id="pendientes" className="text-base text-[#8a5d00]">⚠ Expediente incompleto · faltan {faltan.length} dato{faltan.length > 1 ? "s" : ""}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {faltan.map((f) => (
              <li key={f} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-[#8a5d00]">{f}</li>
            ))}
          </ul>
          {!edita && <p className="mt-2 text-xs text-muted">Avisa a un asesor para completarlos.</p>}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Panel titulo="Datos personales">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Dato k={cliente.tipo_documento === "DNI" ? "DNI" : "Documento"}>{documentoVisible(cliente.numero_documento)}</Dato>
              <Dato k="Sexo" vacio={!cliente.sexo}>{legible(cliente.sexo ?? "")}</Dato>
              <Dato k="Celular" vacio={!cliente.telefono}>{cliente.telefono}</Dato>
              <Dato k="Correo" vacio={!cliente.email}>{cliente.email}</Dato>
              <Dato k="Trabajo">{cliente.ocupacion ?? "—"}</Dato>
              {/* Datos antiguos (de clientes registrados antes de la ficha simple): solo si existen */}
              {cliente.fecha_nacimiento ? <Dato k="Fecha de nacimiento">{fecha(cliente.fecha_nacimiento as string)}</Dato> : null}
              {cliente.estado_civil ? <Dato k="Estado civil">{legible(cliente.estado_civil)}</Dato> : null}
              {cliente.telefono_secundario ? <Dato k="Teléfono 2">{cliente.telefono_secundario}</Dato> : null}
              {cliente.ingreso_mensual != null ? <Dato k="Ingreso mensual">{formatSoles(Number(cliente.ingreso_mensual))}</Dato> : null}
              {cliente.direccion_trabajo ? <Dato k="Dirección del trabajo">{cliente.direccion_trabajo}</Dato> : null}
            </dl>
            {cliente.notas && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line">
                <div className="mb-1 text-xs font-semibold text-muted">Notas internas</div>
                {cliente.notas}
              </div>
            )}
          </Panel>

          <Panel titulo="Domicilio y ubicación">
            <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <Dato k="Domicilio">
                  {cliente.direccion ? `${cliente.direccion}${cliente.urbanizacion ? `, ${cliente.urbanizacion}` : ""}` : "— (opcional)"}
                </Dato>
              </div>
              {cliente.distrito ? <Dato k="Distrito">{cliente.distrito}</Dato> : null}
              {cliente.provincia ? <Dato k="Provincia">{cliente.provincia}</Dato> : null}
              {cliente.departamento ? <Dato k="Departamento">{cliente.departamento}</Dato> : null}
              {cliente.referencia ? <div className="col-span-2"><Dato k="Referencia">{cliente.referencia}</Dato></div> : null}
              {cliente.tipo_vivienda ? <Dato k="Vivienda">{legible(cliente.tipo_vivienda)}</Dato> : null}
            </dl>
            {tieneGps ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft/60 p-3 text-sm">
                <span className="font-mono text-xs">{Number(cliente.latitud).toFixed(6)}, {Number(cliente.longitud).toFixed(6)}</span>
                {cliente.geo_precision_m != null && <span className="text-xs text-muted">±{cliente.geo_precision_m} m</span>}
                {cliente.geo_registrada_at && <span className="text-xs text-muted">· {fechaCorta(cliente.geo_registrada_at)}</span>}
                <span className="flex-1" />
                <a href={enlaceMapa(Number(cliente.latitud), Number(cliente.longitud))} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Ver en Google Maps</a>
                <a href={enlaceRuta(Number(cliente.latitud), Number(cliente.longitud))} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold">Cómo llegar</a>
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted">Sin ubicación GPS (opcional). Puedes registrarla desde el celular estando en el domicilio.</p>
            )}
            {edita && <CapturarUbicacion clienteId={id} action={guardarUbicacion} tieneUbicacion={tieneGps} />}
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <section id="score" className="scroll-mt-6">
            <Panel titulo="Score del cliente">
              <ScoreCliente perfil={score} bloqueado={cliente.estado === "BLOQUEADO_LEGAL"} />
            </Panel>
          </section>
          <Panel titulo="Documentos (privados)">
            {listaDocumentos(docsCliente)}
            {docsCliente.length === 0 && <p className="text-sm text-muted">Aún no hay documentos.</p>}
            {edita && (
              <div className="mt-4 border-t border-line-soft pt-4">
                <SubirDocumento
                  action={subirDocumento}
                  dueño={{ clienteId: id }}
                  tipos={TIPOS_DOCUMENTO_KYC.map((t) => ({ value: t, label: ETIQUETA_DOCUMENTO_KYC[t], cargado: t !== "OTRO" && docsCliente.some((d) => d.tipo === t) }))}
                />
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Solo los ve el personal con sesión{sesion.rol === "COBRADOR" ? " (tu rol: solo la fachada)" : ""}. Cada apertura queda registrada (Ley 29733).
            </p>
          </Panel>

          <Panel titulo={`Garantes (${garantes.length})`}>
            {garantes.length === 0 && <p className="mb-3 text-sm text-muted">Sin garantes vinculados.</p>}
            <ul className="grid gap-3">
              {garantes.map((g) => (
                <li key={g.id} className="rounded-xl border border-line-soft p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{g.nombres} {g.apellidos}</div>
                      <div className="text-xs text-muted">
                        {g.tipo_documento} {g.numero_documento}
                        {g.parentesco ? ` · ${ETIQUETA_PARENTESCO[g.parentesco as keyof typeof ETIQUETA_PARENTESCO] ?? legible(g.parentesco)}` : ""}
                        {g.telefono ? ` · ${g.telefono}` : ""}
                      </div>
                      {g.direccion && <div className="text-xs text-muted">{g.direccion}</div>}
                      {(g.otros_clientes > 0 || g.creditos > 0) && (
                        <div className="mt-1 text-xs font-semibold text-brand">
                          Respalda {g.creditos} crédito{g.creditos === 1 ? "" : "s"}{g.otros_clientes > 0 ? ` · garante de ${g.otros_clientes} cliente${g.otros_clientes > 1 ? "s" : ""} más` : ""}
                        </div>
                      )}
                    </div>
                    {edita && (
                      <form action={desvincularGarante}>
                        <input type="hidden" name="clienteId" value={id} />
                        <input type="hidden" name="garanteId" value={g.id} />
                        <button type="submit" className="cursor-pointer text-xs font-semibold text-danger">Desvincular</button>
                      </form>
                    )}
                  </div>
                  <div className="mt-2">
                    {listaDocumentos(documentos.filter((d) => d.garante_id === g.id))}
                  </div>
                  {edita && (
                    <details className="mt-2 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-brand">Editar o subir DNI del garante</summary>
                      <div className="mt-3 grid gap-4">
                        <FormGarante clienteId={id} garante={g} />
                        <SubirDocumento
                          action={subirDocumento}
                          dueño={{ garanteId: g.id }}
                          volverA={id}
                          tipos={DOCUMENTOS_GARANTE.map((t) => ({ value: t, label: ETIQUETA_DOCUMENTO_KYC[t] }))}
                        />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {edita && (
              <details className="mt-4 border-t border-line-soft pt-4 [&_summary::-webkit-details-marker]:hidden" open={garantes.length === 0}>
                <summary className="cursor-pointer list-none text-sm font-semibold text-brand">+ Agregar garante</summary>
                <div className="mt-3">
                  <FormGarante clienteId={id} />
                  <p className="mt-2 text-xs text-muted">Si el garante ya respalda a otro cliente, se reutiliza su registro (no se duplica).</p>
                </div>
              </details>
            )}
          </Panel>

          {puedeBloquearCliente(sesion.rol) && (
            <Panel titulo="Bloqueo legal">
              <AdminForm action={cambiarBloqueo} className="grid gap-3">
                <input type="hidden" name="clienteId" value={id} />
                <input type="hidden" name="bloquear" value={cliente.estado === "BLOQUEADO_LEGAL" ? "no" : "si"} />
                <p className="text-sm text-muted">
                  {cliente.estado === "BLOQUEADO_LEGAL"
                    ? "El cliente está bloqueado y no puede recibir nuevos créditos."
                    : "Impide nuevos créditos (proceso judicial, fraude, etc.). El motivo queda en las notas y en la auditoría."}
                </p>
                <CampoArea label="Motivo" name="motivo" id="motivo-bloqueo" rows={2} required={cliente.estado !== "BLOQUEADO_LEGAL"} />
                <BotonEnviar size="sm" variant={cliente.estado === "BLOQUEADO_LEGAL" ? "outline" : "brand"} className="justify-self-start">
                  {cliente.estado === "BLOQUEADO_LEGAL" ? "Levantar bloqueo" : "Bloquear cliente"}
                </BotonEnviar>
              </AdminForm>
            </Panel>
          )}
        </div>
      </div>

      <Panel className="mt-6" titulo={`Créditos (${creditos.length})`}>
        {creditos.length === 0 ? (
          <Vacio>
            Sin créditos.{" "}
            {puedeGestionarCreditos(sesion.rol) && cliente.estado !== "BLOQUEADO_LEGAL" && (
              <Link href={`/admin/creditos/nuevo?cliente=${id}`} className="font-semibold text-brand">Registrar el primero →</Link>
            )}
          </Vacio>
        ) : (
          <ul className="grid gap-3">
            {creditos.map((cr) => {
              const cs = cuotasDe(cr.id);
              const pc = porCobrar.get(cr.id);
              const saldo = Math.max(cr.monto_total_pagar - cr.pagado, 0);
              return (
                <li key={cr.id}>
                  <details className="group rounded-xl border border-line-soft [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          <span className="font-mono text-sm">{cr.codigo}</span> · {ETIQUETA_SERVICIO[cr.tipo]}
                        </div>
                        <div className="text-xs text-muted">
                          {fecha(cr.fecha_desembolso)} · {formatSoles(cr.monto_financiado, true)} en {cr.numero_cuotas} cuotas {PLURAL_FRECUENCIA[cr.frecuencia] ?? legible(cr.frecuencia).toLowerCase()} de {formatSoles(cr.valor_cuota, true)}
                          {cr.bien ? ` · ${cr.bien}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="tabular text-xs text-muted">{cr.cuotas_pagadas}/{cr.numero_cuotas} pagadas</span>
                        {cr.cuotas_mora > 0 && <Badge tone="gold">{cr.cuotas_mora} en mora</Badge>}
                        <Estado valor={cr.estado} />
                        <span className="text-brand transition-transform group-open:rotate-90">›</span>
                      </div>
                    </summary>
                    <div className="border-t border-line-soft p-3">
                      {pc && (
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-surface-2 p-3">
                          <p className="text-sm">
                            {pc.situacion === "MORA"
                              ? `Vencido: ${formatSoles(pc.vencido, true)} (${pc.diasAtraso} días de atraso)`
                              : pc.proxima
                                ? `Próxima cuota: ${formatSoles(pc.proxima!.saldo, true)} el ${fecha(pc.proxima!.fecha)}`
                                : "Al día"}
                          </p>
                          <BotonRecordatorio
                            href={pc.whatsapp}
                            creditoId={cr.id}
                            tipo={pc.situacion}
                            registrar={registrarRecordatorio}
                            ultimo={pc.ultimoRecordatorio}
                          />
                        </div>
                      )}
                      <dl className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <Dato k="Precio / capital">{formatSoles(cr.monto_total, true)}</Dato>
                        <Dato k="Inicial">{formatSoles(cr.cuota_inicial, true)}</Dato>
                        <Dato k="Total a pagar">{formatSoles(cr.monto_total_pagar, true)}</Dato>
                        <Dato k="Saldo">{formatSoles(saldo, true)}</Dato>
                        <Dato k="Tasa">{cr.tasa_porcentaje.toFixed(2)} % {legible(cr.tipo_calculo).toLowerCase()}</Dato>
                        <Dato k="TEA">{cr.tea_porcentaje != null ? `${cr.tea_porcentaje.toFixed(2)} %` : "—"}</Dato>
                        <Dato k="Garante">{cr.garante ?? "—"}</Dato>
                        <Dato k="Origen">{cr.legado_origen ? "Sistema anterior" : "Panel"}</Dato>
                      </dl>
                      <Tabla className="shadow-none">
                        <thead>
                          <tr><th>N.º</th><th>Vence</th><th className="text-right">Cuota</th><th className="text-right">Mora</th><th className="text-right">Pagado</th><th>Pagada el</th><th>Estado</th></tr>
                        </thead>
                        <tbody>
                          {cs.map((c) => (
                            <tr key={c.numero}>
                              <td className="tabular">{c.numero}</td>
                              <td className="whitespace-nowrap">{fecha(c.fecha_vencimiento)}</td>
                              <td className="text-right tabular">{formatSoles(c.monto_cuota, true)}</td>
                              <td className="text-right tabular">{c.mora > 0 ? formatSoles(c.mora, true) : "—"}</td>
                              <td className="text-right tabular">{formatSoles(c.monto_pagado, true)}</td>
                              <td className="whitespace-nowrap">{fecha(c.fecha_pago)}</td>
                              <td><Estado valor={c.estado} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </Tabla>
                      <p className="mt-2 text-xs text-muted">
                        <Link href={`/admin/creditos/${cr.id}`} className="font-semibold text-brand">Ver detalle, imprimir o anular →</Link>{" "}
                        · Los pagos se registran desde Cobranzas (Fase 5).
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {(solicitudes.length > 0 || historial.length > 0) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {solicitudes.length > 0 && (
            <Panel titulo="Solicitudes web vinculadas">
              <ul className="grid gap-2 text-sm">
                {solicitudes.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>{s.servicio === "OTRO" ? "Otro" : ETIQUETA_SERVICIO[s.servicio]}{s.producto_interes ? ` · ${s.producto_interes}` : ""}{s.monto_solicitado ? ` · ${formatSoles(s.monto_solicitado)}` : ""}</span>
                    <span className="text-xs text-muted">{fechaCorta(s.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {historial.length > 0 && (
            <Panel titulo="Historial (auditoría)">
              <ul className="grid gap-1.5 text-xs">
                {historial.map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      <strong>{h.usuario ?? "Sistema"}</strong>{" "}
                      {h.tabla === "documento_kyc"
                        ? `${h.accion === "DESCARGA" ? "abrió" : h.accion === "INSERT" ? "subió" : "eliminó"} ${ETIQUETA_DOCUMENTO_KYC[h.tipo as TipoDocumentoKyc] ?? "un documento"}`
                        : h.accion === "INSERT" ? "registró al cliente" : "modificó la ficha"}
                    </span>
                    <span className="text-muted whitespace-nowrap">{fechaCorta(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {sesion.rol === "SUPERADMIN" && (
        <div className="mt-8 border-t border-line-soft pt-6 print:hidden">
          <ConfirmarEliminar action={eliminarCliente} id={id} titulo="Eliminar cliente">
            Se borrará a <strong>{cliente.nombres} {cliente.apellidos}</strong> con su expediente (documentos, garantes y score)
            {creditos.length > 0 ? (
              <> y <strong>{creditos.length === 1 ? "su crédito" : `sus ${creditos.length} créditos`}</strong> con cronogramas, pagos y documentos</>
            ) : null}
            . No se puede deshacer. Si solo quieres que deje de cobrarse, mejor anula el crédito.
          </ConfirmarEliminar>
        </div>
      )}
    </>
  );
}

function FormGarante({ clienteId, garante }: { clienteId: string; garante?: Garante }) {
  const sufijo = garante?.id ?? "nuevo";
  return (
    <AdminForm action={guardarGarante} resetOnSuccess={!garante} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="garanteId" value={garante?.id ?? ""} />
      <CampoTexto label="Nombres" name="nombres" id={`g-nombres-${sufijo}`} defaultValue={garante?.nombres} required />
      <CampoTexto label="Apellidos" name="apellidos" id={`g-apellidos-${sufijo}`} defaultValue={garante?.apellidos} required />
      <CampoSelect
        label="Documento"
        name="tipoDocumento"
        id={`g-tipo-${sufijo}`}
        defaultValue={garante?.tipo_documento ?? "DNI"}
        opciones={TIPOS_DOCUMENTO.map((t) => ({ value: t, label: ETIQUETA_DOCUMENTO[t] }))}
      />
      <CampoTexto label="N.º de documento" name="numeroDocumento" id={`g-doc-${sufijo}`} defaultValue={garante?.numero_documento} required />
      <CampoTexto label="Celular" name="telefono" id={`g-tel-${sufijo}`} defaultValue={garante?.telefono ?? ""} inputMode="tel" required />
      <CampoSelect
        label="Relación con el cliente"
        name="parentesco"
        id={`g-par-${sufijo}`}
        defaultValue={garante?.parentesco ?? ""}
        opciones={[{ value: "", label: "— Sin dato —" }, ...PARENTESCOS.map((p) => ({ value: p, label: ETIQUETA_PARENTESCO[p] }))]}
      />
      <CampoTexto label="Dirección" name="direccion" id={`g-dir-${sufijo}`} defaultValue={garante?.direccion ?? ""} className="sm:col-span-2" />
      <CampoTexto label="Notas" name="notas" id={`g-notas-${sufijo}`} defaultValue={garante?.notas ?? ""} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <BotonEnviar size="sm" variant="brand">{garante ? "Guardar garante" : "Agregar garante"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}
