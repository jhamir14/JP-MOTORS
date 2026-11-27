"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ROLES_ASIGNABLES } from "@/lib/roles";
import { ROLES, comoUsuario, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { hashPassword, validarPassword } from "@/lib/server/password";

/**
 * Alta y edición del personal (solo SUPERADMIN). auth.users no es accesible para el rol `authenticated`,
 * así que la cuenta se crea con la conexión de servidor y el perfil (rol) con la identidad del superadmin (queda auditado).
 */

const nuevoSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido").max(120),
  nombres: z.string().trim().min(2, "Ingresa los nombres").max(60),
  apellidos: z.string().trim().max(60),
  telefono: z.string().trim().max(20),
  rol: z.enum(ROLES_ASIGNABLES),
  password: z.string(),
});

export async function crearPersonal(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const parsed = nuevoSchema.safeParse({ ...datosDe(fd), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return fallo("Revisa los datos.", erroresZod(parsed.error));
  const d = parsed.data;
  const errorPass = validarPassword(d.password);
  if (errorPass) return fallo(errorPass, { password: errorPass });

  const hash = await hashPassword(d.password);
  try {
    // Una sola transacción: si el perfil falla, no queda una cuenta huérfana.
    await sql().begin(async (tx) => {
      const [u] = await tx<{ id: string }[]>`
        insert into auth.users (email, password_hash) values (${d.email}, ${hash}) returning id`;
      await tx`set local role authenticated`;
      await tx`select set_config('app.usuario_id', ${sesion.usuarioId}, true)`;
      await tx`
        insert into public.perfil_usuario (id, nombres, apellidos, rol, telefono)
        values (${u.id}, ${d.nombres}, ${d.apellidos}, ${d.rol}, ${d.telefono || null})`;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe una cuenta con ese correo.", { email: "Correo ya registrado" });
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin/personal");
  return exito(`Cuenta creada para ${d.email}. Comparte la contraseña por un canal seguro y pide que la cambie.`);
}

const editarSchema = z.object({
  id: z.string().uuid(),
  rol: z.enum(ROLES),
  password: z.string(),
});

export async function editarPersonal(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const parsed = editarSchema.safeParse({ ...datosDe(fd), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return fallo("Revisa los datos.", erroresZod(parsed.error));
  const { id, rol, password } = parsed.data;
  const activo = fd.get("activo") === "on";
  if (id === sesion.usuarioId && (!activo || rol !== "SUPERADMIN"))
    return fallo("No puedes quitarte el rol de superadministrador ni desactivar tu propia cuenta.");
  if (password) {
    const errorPass = validarPassword(password);
    if (errorPass) return fallo(errorPass, { password: errorPass });
  }

  try {
    await comoUsuario(sesion, (tx) => tx`update public.perfil_usuario set rol = ${rol}, activo = ${activo} where id = ${id}`);
    const db = sql();
    await db`update auth.users set activo = ${activo} where id = ${id}`;
    if (password) await db`update auth.users set password_hash = ${await hashPassword(password)} where id = ${id}`;
    // Desactivar o cambiar la contraseña cierra las sesiones abiertas de esa persona.
    if (!activo || password) await db`delete from public.sesion_panel where usuario_id = ${id}`;
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin/personal");
  return exito(password ? "Datos y contraseña actualizados." : "Datos actualizados.");
}
