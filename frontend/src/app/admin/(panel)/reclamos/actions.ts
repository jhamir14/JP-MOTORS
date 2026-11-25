"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ESTADOS_RECLAMO } from "@/lib/admin/constantes";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const schema = z
  .object({
    id: z.string().uuid(),
    estado: z.enum(ESTADOS_RECLAMO),
    respuesta: z.string().trim().max(5000),
  })
  .refine((d) => d.estado !== "RESPONDIDO" || d.respuesta.length >= 10, {
    path: ["respuesta"],
    message: "Escribe la respuesta enviada al consumidor (mín. 10 caracteres)",
  });

export async function atenderReclamo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN", "ADMIN_CREDITOS");
  const parsed = schema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa la respuesta.", erroresZod(parsed.error));
  const { id, estado, respuesta } = parsed.data;
  const respondido = estado === "RESPONDIDO";
  try {
    await comoUsuario(sesion, (tx) => tx`
      update public.reclamo set
        estado = ${estado},
        respuesta = ${respuesta || null},
        fecha_respuesta = case when ${respondido} then coalesce(fecha_respuesta, now()) else null end,
        respondido_por = case when ${respondido} then ${sesion.usuarioId}::uuid else null end
      where id = ${id}`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito(respondido ? "Reclamo marcado como respondido. Recuerda enviar la respuesta al correo del consumidor." : "Reclamo actualizado.");
}
