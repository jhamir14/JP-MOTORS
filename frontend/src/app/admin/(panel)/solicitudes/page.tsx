import Link from "next/link";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, Encabezado, Estado, Vacio, fechaCorta } from "@/components/admin/ui";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { requerirSeccion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { ESTADOS_SOLICITUD } from "@/lib/admin/constantes";
import { puedeEditarKyc } from "@/lib/clientes";
import { ETIQUETA_FRECUENCIA, type Frecuencia } from "@/lib/finance";
import { correoConfigurado } from "@/lib/server/correo";
import { actualizarSolicitud, enviarCotizacionPorCorreo } from "./actions";

export const metadata = { title: "Solicitudes web" };

const SERVICIO: Record<string, string> = {
  CREDITO_VEHICULAR: "Crédito vehicular",
  CREDITO_CELULAR: "Celular a crédito",
  PRESTAMO_EFECTIVO: "Préstamo en efectivo",
  OTRO: "Otro",
};

interface Fila {
  id: string; servicio: string; producto_interes: string | null; nombres: string; apellidos: string; tipo_documento: string;
  numero_documento: string; celular: string; email: string | null; preferencia_contacto: string | null; distrito: string | null;
  provincia: string | null; departamento: string | null; situacion_laboral: string | null; ingreso_mensual: number | null;
  monto_solicitado: number | null; cuota_inicial: number | null; datos_extra: Record<string, unknown>; estado: string;
  notas: string | null; created_at: Date; cliente_id: string | null; cliente_existente: string | null;
}

export default async function SolicitudesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sesion = await requerirSeccion("solicitudes");
  const convierte = puedeEditarKyc(sesion.rol);
  const correoListo = correoConfigurado();
  const { estado } = await searchParams;
  const filtro = (ESTADOS_SOLICITUD as readonly string[]).includes(estado ?? "") ? estado! : null;
  const filas = await sql()<Fila[]>`
    select id, servicio, producto_interes, nombres, apellidos, tipo_documento, numero_documento, celular, email::text,
           preferencia_contacto, distrito, provincia, departamento, situacion_laboral, ingreso_mensual::float8,
           monto_solicitado::float8, cuota_inicial::float8, datos_extra, estado, notas, created_at, cliente_id,
           (select c.id from public.cliente c
            where s.cliente_id is null and c.tipo_documento = s.tipo_documento
              and c.numero_documento = upper(regexp_replace(s.numero_documento, '[[:space:].-]', '', 'g'))
            limit 1) as cliente_existente
    from public.solicitud_credito s
    where ${filtro}::text is null or estado::text = ${filtro}
    order by created_at desc
    limit 200`;

  return (
    <>
      <Encabezado titulo="Solicitudes web">
        Las cotizaciones del cotizador de la web (/cotizar) y las solicitudes de crédito. Responde por WhatsApp o correo, actualiza el estado y conviértela en cliente para abrir su expediente.
      </Encabezado>

      <div className="mb-5 flex flex-wrap gap-2">
        {[null, ...ESTADOS_SOLICITUD].map((e) => (
          <Link
            key={e ?? "todas"}
            href={e ? `/admin/solicitudes?estado=${e}` : "/admin/solicitudes"}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold",
              filtro === e ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
            )}
          >
            {e ? e.charAt(0) + e.slice(1).toLowerCase() : "Todas"}
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <Vacio>No hay solicitudes {filtro ? `en estado ${filtro.toLowerCase()}` : "todavía"}.</Vacio>
      ) : (
        <ul className="grid gap-3">
          {filas.map((s) => {
            const cot = cotizacionDe(s);
            return (
            <li key={s.id}>
              <details className="group rounded-2xl border border-line-soft bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{s.nombres} {s.apellidos}</div>
                    <div className="text-xs text-muted">
                      {cot ? "Cotización web" : SERVICIO[s.servicio]}
                      {s.producto_interes ? ` · ${s.producto_interes}` : ""}
                      {cot ? ` · ${formatSoles(cot.cuota, true)} ${cot.etiqueta.adjetivo} × ${cot.numeroCuotas}` : s.monto_solicitado ? ` · ${formatSoles(s.monto_solicitado)}` : ""} · {fechaCorta(s.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Estado valor={s.estado} />
                    <span className="text-brand transition-transform group-open:rotate-90">›</span>
                  </div>
                </summary>
                <div className="grid gap-6 border-t border-line-soft p-4 md:grid-cols-[1.2fr_1fr]">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {[
                      ...(cot
                        ? [
                            ["Cuota referencial", `${formatSoles(cot.cuota, true)} ${cot.etiqueta.adjetivo}`],
                            ["Plazo", `${cot.numeroCuotas} ${cot.etiqueta.plural}`],
                            ["Precio", s.monto_solicitado != null ? formatSoles(s.monto_solicitado) : "—"],
                            ["Copia por correo", cot.copiaEnviada ? "Enviada" : s.email ? "No enviada" : "Sin correo"],
                          ]
                        : []),
                      ...(s.numero_documento ? [["Documento", `${s.tipo_documento} ${s.numero_documento}`]] : []),
                      ["Celular", s.celular],
                      ["Correo", s.email ?? "—"],
                      ["Prefiere", s.preferencia_contacto ?? "—"],
                      ...(cot
                        ? [["Inicial", s.cuota_inicial ? formatSoles(s.cuota_inicial) : "Sin inicial"]]
                        : [
                            ["Ubicación", [s.distrito, s.provincia, s.departamento].filter(Boolean).join(", ") || "—"],
                            ["Actividad", s.situacion_laboral ?? "—"],
                            ["Ingreso mensual", s.ingreso_mensual != null ? formatSoles(s.ingreso_mensual) : "—"],
                            ["Inicial disponible", s.cuota_inicial != null ? formatSoles(s.cuota_inicial) : "—"],
                          ]),
                      ...(s.datos_extra?.frecuencia_preferida ? [["Frecuencia", String(s.datos_extra.frecuencia_preferida)]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-muted">{k}</dt>
                        <dd className="font-medium break-words">{v}</dd>
                      </div>
                    ))}
                    <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                      <a
                        href={whatsappLink(
                          cot
                            ? `Hola ${s.nombres.split(" ")[0]}, te escribimos de Inversiones JP por tu cotización del ${s.producto_interes}: cuota de ${formatSoles(cot.cuota, true)} ${cot.etiqueta.adjetivo} en ${cot.numeroCuotas} ${cot.etiqueta.plural}${s.cuota_inicial ? ` con inicial de ${formatSoles(s.cuota_inicial)}` : " sin inicial"}. ¿Te ayudamos con los requisitos?`
                            : `Hola ${s.nombres}, te escribimos de Inversiones JP por tu solicitud de ${SERVICIO[s.servicio].toLowerCase()}.`,
                          `51${s.celular}`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-whatsapp px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Escribir por WhatsApp
                      </a>
                      <a href={`tel:+51${s.celular}`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Llamar</a>
                      {s.cliente_id ? (
                        <Link href={`/admin/clientes/${s.cliente_id}`} className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">Ver ficha del cliente →</Link>
                      ) : convierte ? (
                        <Link href={`/admin/clientes/nuevo?solicitud=${s.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                          {s.cliente_existente ? "Ya es cliente: vincular" : "Convertir en cliente"}
                        </Link>
                      ) : null}
                    </div>
                  </dl>
                  <div className="grid content-start gap-5">
                  {cot && s.email && (
                    <AdminForm action={enviarCotizacionPorCorreo} className="grid gap-3 rounded-xl border border-line-soft bg-surface-2 p-3">
                      <input type="hidden" name="id" value={s.id} />
                      <div className="text-sm font-semibold">Responder por correo</div>
                      <CampoArea
                        label="Mensaje para el cliente (opcional)"
                        name="nota"
                        id={`nota-${s.id}`}
                        rows={2}
                        placeholder="Ej. Tenemos el modelo en stock. Para avanzar necesitamos tu DNI y un recibo de luz."
                      />
                      {correoListo ? (
                        <BotonEnviar size="sm" className="justify-self-start" pendiente="Enviando…">
                          {cot.copiaEnviada ? "Reenviar cotización a " : "Enviar cotización a "}{s.email}
                        </BotonEnviar>
                      ) : (
                        <p className="text-xs text-muted">Para enviar correos agrega SMTP_PASSWORD en Vercel (contraseña de {"contacto@"}).</p>
                      )}
                    </AdminForm>
                  )}
                  <AdminForm action={actualizarSolicitud} className="grid content-start gap-3">
                    <input type="hidden" name="id" value={s.id} />
                    <CampoSelect
                      label="Estado"
                      name="estado"
                      id={`estado-${s.id}`}
                      defaultValue={s.estado}
                      opciones={ESTADOS_SOLICITUD.filter((e) => e !== "CONVERTIDA" || s.cliente_id)}
                    />
                    <CampoArea label="Notas internas" name="notas" id={`notas-${s.id}`} defaultValue={s.notas ?? ""} rows={3} />
                    <BotonEnviar size="sm" className="justify-self-start">Guardar</BotonEnviar>
                  </AdminForm>
                  </div>
                </div>
              </details>
            </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Datos de la cotización guardados por /api/cotizaciones en datos_extra. */
function cotizacionDe(s: Fila) {
  const x = s.datos_extra ?? {};
  if (x.tipo !== "cotizacion") return null;
  const frecuencia = String(x.frecuencia) as Frecuencia;
  const etiqueta = ETIQUETA_FRECUENCIA[frecuencia];
  if (!etiqueta) return null;
  return { cuota: Number(x.cuota), numeroCuotas: Number(x.numero_cuotas), etiqueta, copiaEnviada: x.copia_enviada === true };
}
