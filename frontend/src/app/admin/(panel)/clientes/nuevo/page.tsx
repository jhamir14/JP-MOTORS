import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { Encabezado, Panel } from "@/components/admin/ui";
import { ROLES_EDITAN_KYC, estadoCivilDesdeWeb, normalizarDocumento, type TipoDocumento } from "@/lib/clientes";
import { requerirSesion } from "@/lib/server/auth";
import { clientesConDocumento } from "@/lib/server/clientes";
import { sql } from "@/lib/server/db";
import { vincularSolicitud } from "../../solicitudes/actions";
import { FormCliente, type ClienteEditable } from "../FormCliente";

export const metadata = { title: "Nuevo cliente" };

interface Solicitud {
  id: string; nombres: string; apellidos: string; tipo_documento: TipoDocumento; numero_documento: string;
  fecha_nacimiento: string | null; estado_civil: string | null; celular: string; email: string | null; distrito: string | null;
  provincia: string | null; departamento: string | null; situacion_laboral: string | null; ingreso_mensual: number | null;
  servicio: string; producto_interes: string | null; cliente_id: string | null; created_at: Date;
}

export default async function NuevoClientePage({ searchParams }: { searchParams: Promise<{ solicitud?: string }> }) {
  await requerirSesion(...ROLES_EDITAN_KYC);
  const { solicitud: solicitudId } = await searchParams;
  const db = sql();

  let solicitud: Solicitud | undefined;
  if (solicitudId && /^[0-9a-f-]{36}$/.test(solicitudId)) {
    [solicitud] = await db<Solicitud[]>`
      select id, nombres, apellidos, tipo_documento, numero_documento, to_char(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
             estado_civil, celular, email::text, distrito, provincia, departamento, situacion_laboral, ingreso_mensual::float8,
             servicio, producto_interes, cliente_id, created_at
      from public.solicitud_credito where id = ${solicitudId}`;
    if (solicitud?.cliente_id) redirect(`/admin/clientes/${solicitud.cliente_id}`);
  }
  const [existente] = solicitud
    ? await clientesConDocumento(db, solicitud.tipo_documento, normalizarDocumento(solicitud.numero_documento))
    : [];

  const prellenado: Partial<ClienteEditable> | undefined = solicitud && {
    nombres: solicitud.nombres,
    apellidos: solicitud.apellidos,
    tipo_documento: solicitud.tipo_documento,
    numero_documento: normalizarDocumento(solicitud.numero_documento),
    telefono: solicitud.celular,
    email: solicitud.email,
    direccion: [solicitud.distrito, solicitud.provincia, solicitud.departamento].filter(Boolean).join(", ") || null,
    ocupacion: solicitud.situacion_laboral,
    notas: [
      `Convertido desde la solicitud web del ${solicitud.created_at.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}${solicitud.producto_interes ? ` (interés: ${solicitud.producto_interes})` : ""}.`,
      solicitud.fecha_nacimiento ? `Fecha de nacimiento: ${solicitud.fecha_nacimiento}.` : "",
      solicitud.estado_civil ? `Estado civil: ${estadoCivilDesdeWeb(solicitud.estado_civil) ?? solicitud.estado_civil}.` : "",
      solicitud.ingreso_mensual ? `Ingreso mensual declarado: S/ ${solicitud.ingreso_mensual}.` : "",
    ].filter(Boolean).join(" "),
  };

  return (
    <>
      <Link href={solicitud ? "/admin/solicitudes" : "/admin/clientes"} className="text-sm font-medium text-muted hover:text-brand">
        ← {solicitud ? "Solicitudes web" : "Clientes"}
      </Link>
      <Encabezado titulo={solicitud ? "Convertir solicitud en cliente" : "Nuevo cliente"}>
        {solicitud
          ? "Datos tomados de la solicitud web: revísalos y completa lo que falte. La solicitud quedará como «convertida»."
          : "Nombre, apellido, sexo, celular y correo. El DNI, el domicilio y el trabajo son opcionales."}
      </Encabezado>

      {existente && solicitud && (
        <Panel className="mb-6 border-gold bg-gold-soft/50" titulo="Esta persona ya es cliente">
          <p className="mb-3 text-sm">
            <strong>{existente.nombres} {existente.apellidos}</strong> ({existente.tipo_documento} {existente.numero_documento}) ya está registrado.
            En lugar de crear un duplicado, vincula la solicitud a su ficha.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <AdminForm action={vincularSolicitud}>
              <input type="hidden" name="solicitudId" value={solicitud.id} />
              <input type="hidden" name="clienteId" value={existente.id} />
              <BotonEnviar size="sm" variant="brand" pendiente="Vinculando…">Vincular solicitud a este cliente</BotonEnviar>
            </AdminForm>
            <Link href={`/admin/clientes/${existente.id}`} className="text-sm font-semibold text-brand">Ver su ficha →</Link>
          </div>
        </Panel>
      )}

      <Panel>
        <FormCliente cliente={prellenado} solicitudId={existente ? undefined : solicitud?.id} />
      </Panel>
    </>
  );
}
