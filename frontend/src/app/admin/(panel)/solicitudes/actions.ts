"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ESTADOS_SOLICITUD } from "@/lib/admin/constantes";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const schema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS_SOLICITUD),
  notas: z.string().max(2000),
});

export async function actualizarSolicitud(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const parsed = schema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos.", erroresZod(parsed.error));
  const { id, estado, notas } = parsed.data;
  try {
    const r = await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set estado = ${estado}, notas = ${notas || null}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${id} and (${estado} <> 'CONVERTIDA' or cliente_id is not null)`);
    if (r.count === 0 && estado === "CONVERTIDA")
      return fallo("Para marcarla como convertida usa «Convertir en cliente»: así queda vinculada a su ficha.", { estado: "Usa «Convertir en cliente»" });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito("Solicitud actualizada.");
}

const vincularSchema = z.object({ solicitudId: z.string().uuid(), clienteId: z.string().uuid() });

/** La persona de la solicitud ya era cliente: se vincula la solicitud a su ficha en vez de duplicarla. */
export async function vincularSolicitud(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS");
  const parsed = vincularSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Datos no válidos.");
  const { solicitudId, clienteId } = parsed.data;
  try {
    const r = await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set estado = 'CONVERTIDA', cliente_id = ${clienteId}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${solicitudId} and cliente_id is null`);
    if (r.count === 0) return fallo("La solicitud ya estaba vinculada a un cliente.");
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/clientes/${clienteId}?vinculada=1`);
}
