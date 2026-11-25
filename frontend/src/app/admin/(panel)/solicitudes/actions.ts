"use server";
import { revalidatePath } from "next/cache";
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
    await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set estado = ${estado}, notas = ${notas || null}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${id}`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito("Solicitud actualizada.");
}
