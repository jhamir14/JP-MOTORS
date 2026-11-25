import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, Encabezado, Estado, Vacio, fechaCorta } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ESTADOS_RECLAMO, opcionesLegibles } from "@/lib/admin/constantes";
import { formatSoles } from "@/lib/format";
import { puede, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { atenderReclamo } from "./actions";

export const metadata = { title: "Libro de Reclamaciones" };

interface Reclamo {
  id: string; codigo: string; tipo: string; nombres: string; apellidos: string; tipo_documento: string; numero_documento: string;
  domicilio: string; telefono: string; email: string; menor_de_edad: boolean; apoderado: string | null; bien_tipo: string;
  bien_monto: number | null; bien_descripcion: string; detalle: string; pedido: string; estado: string; respuesta: string | null;
  fecha_respuesta: Date | null; created_at: Date; dias_habiles: number;
}

/** Plazo legal: 15 días hábiles (lunes a viernes) desde el registro. */
export default async function ReclamosPage() {
  const sesion = await requerirSesion();
  const editable = puede(sesion, "SUPERADMIN", "ADMIN_CREDITOS");
  const reclamos = await sql()<Reclamo[]>`
    select r.*, r.email::text as email, r.bien_monto::float8 as bien_monto,
           (select count(*) from generate_series((r.created_at at time zone 'America/Lima')::date + 1,
                                                 coalesce(r.fecha_respuesta, now()) at time zone 'America/Lima', interval '1 day') d
            where extract(isodow from d) < 6)::int as dias_habiles
    from public.reclamo r
    order by (r.estado = 'RESPONDIDO'), r.created_at desc
    limit 200`;

  return (
    <>
      <Encabezado titulo="Libro de Reclamaciones">
        Hojas registradas desde la web. Plazo legal de respuesta: 15 días hábiles. La respuesta se envía al correo del consumidor.
      </Encabezado>
      {reclamos.length === 0 ? (
        <Vacio>No hay reclamos registrados.</Vacio>
      ) : (
        <ul className="grid gap-3">
          {reclamos.map((r) => {
            const vencido = r.estado !== "RESPONDIDO" && r.dias_habiles > 15;
            const porVencer = r.estado !== "RESPONDIDO" && r.dias_habiles >= 10 && !vencido;
            return (
              <li key={r.id}>
                <details className="rounded-2xl border border-line-soft bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-semibold"><span className="tabular">{r.codigo}</span> · {r.nombres} {r.apellidos}</div>
                      <div className="text-xs text-muted">{r.tipo === "RECLAMO" ? "Reclamo" : "Queja"} · {fechaCorta(r.created_at)} · {r.dias_habiles} días hábiles</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {vencido && <Badge tone="outline" className="border-danger text-danger">Plazo vencido</Badge>}
                      {porVencer && <Badge tone="gold">Por vencer</Badge>}
                      <Estado valor={r.estado} />
                    </div>
                  </summary>
                  <div className="grid gap-6 border-t border-line-soft p-4 md:grid-cols-2">
                    <div className="grid content-start gap-3 text-sm">
                      <p><span className="text-muted">Documento:</span> {r.tipo_documento} {r.numero_documento}</p>
                      <p><span className="text-muted">Contacto:</span> {r.telefono} · <a href={`mailto:${r.email}?subject=Respuesta a su ${r.tipo.toLowerCase()} ${r.codigo}`} className="font-semibold text-brand">{r.email}</a></p>
                      <p><span className="text-muted">Domicilio:</span> {r.domicilio}</p>
                      {r.menor_de_edad && <p><span className="text-muted">Apoderado:</span> {r.apoderado}</p>}
                      <p><span className="text-muted">Bien:</span> {r.bien_tipo.toLowerCase()} — {r.bien_descripcion}{r.bien_monto != null ? ` (${formatSoles(r.bien_monto, true)})` : ""}</p>
                      <div><div className="text-muted">Detalle</div><p className="whitespace-pre-line">{r.detalle}</p></div>
                      <div><div className="text-muted">Pedido</div><p className="whitespace-pre-line">{r.pedido}</p></div>
                    </div>
                    {editable ? (
                      <AdminForm action={atenderReclamo} className="grid content-start gap-3">
                        <input type="hidden" name="id" value={r.id} />
                        <CampoSelect label="Estado" name="estado" id={`estado-${r.id}`} defaultValue={r.estado} opciones={opcionesLegibles(ESTADOS_RECLAMO)} />
                        <CampoArea label="Respuesta al consumidor" name="respuesta" id={`respuesta-${r.id}`} defaultValue={r.respuesta ?? ""} rows={6} />
                        {r.fecha_respuesta && <p className="text-xs text-muted">Respondido el {fechaCorta(r.fecha_respuesta)}</p>}
                        <BotonEnviar size="sm" className="justify-self-start">Guardar</BotonEnviar>
                      </AdminForm>
                    ) : (
                      <div className="text-sm">
                        <div className="text-muted">Respuesta</div>
                        <p className="whitespace-pre-line">{r.respuesta ?? "Pendiente"}</p>
                      </div>
                    )}
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
