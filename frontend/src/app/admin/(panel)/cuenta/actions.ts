"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { cerrarOtrasSesiones, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { permitirIntentoCompartido, reiniciarIntentosCompartido } from "@/lib/server/limite";
import { hashPassword, validarPassword, verificarPassword } from "@/lib/server/password";

/**
 * «Mi cuenta»: cada persona del personal edita sus propios datos, su correo de acceso y su contraseña.
 * El rol y el estado de la cuenta solo los cambia el superadmin en «Personal».
 * Las escrituras van con la conexión de servidor (perfil_usuario solo lo modifica el superadmin por RLS),
 * pero siempre sobre la cuenta de quien está en sesión y con app.usuario_id para que la auditoría registre quién fue.
 */

const perfilSchema = z.object({
  nombres: z.string().trim().min(2, "Ingresa tus nombres").max(60, "Máximo 60 caracteres"),
  apellidos: z.string().trim().max(60, "Máximo 60 caracteres"),
  telefono: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .refine((v) => v === "" || /^[+\d][\d\s-]{5,19}$/.test(v), "Usa solo números (ej. 987 654 321)"),
});

export async function guardarPerfil(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const p = perfilSchema.safeParse(datosDe(fd));
  if (!p.success) return fallo("Revisa los campos marcados.", erroresZod(p.error));
  try {
    await sql().begin(async (tx) => {
      await tx`select set_config('app.usuario_id', ${sesion.usuarioId}, true)`;
      await tx`
        update public.perfil_usuario
        set nombres = ${p.data.nombres}, apellidos = ${p.data.apellidos}, telefono = ${p.data.telefono || null}, updated_at = now()
        where id = ${sesion.usuarioId}`;
    });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito("Tus datos se guardaron.");
}

/** Confirma la contraseña actual con límite de intentos (evita adivinarla desde una sesión abierta y olvidada). */
async function confirmarPassword(usuarioId: string, password: string): Promise<string | null> {
  const clave = `cuenta:${usuarioId}`;
  if (!(await permitirIntentoCompartido(clave, 5, 15 * 60 * 1000))) return "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.";
  const [u] = await sql()<{ password_hash: string | null }[]>`select password_hash from auth.users where id = ${usuarioId}`;
  if (!(await verificarPassword(password, u?.password_hash))) return "La contraseña actual no es correcta.";
  await reiniciarIntentosCompartido(clave);
  return null;
}

const correoSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido").max(120),
  passwordActual: z.string().min(1, "Ingresa tu contraseña actual").max(200),
});

export async function cambiarCorreo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const p = correoSchema.safeParse({ email: fd.get("email") ?? "", passwordActual: fd.get("passwordActual") ?? "" });
  if (!p.success) return fallo("Revisa los campos marcados.", erroresZod(p.error));
  if (p.data.email === sesion.email.toLowerCase()) return fallo("Ese ya es tu correo de acceso.", { email: "Es el mismo correo" });
  const error = await confirmarPassword(sesion.usuarioId, p.data.passwordActual);
  if (error) return fallo(error, { passwordActual: error });
  try {
    await sql()`update auth.users set email = ${p.data.email} where id = ${sesion.usuarioId}`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe otra cuenta con ese correo.", { email: "Correo ya registrado" });
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito(`Listo: desde ahora entras con ${p.data.email}.`);
}

const passwordSchema = z.object({
  passwordActual: z.string().min(1, "Ingresa tu contraseña actual").max(200),
  passwordNueva: z.string().max(200),
  passwordRepetida: z.string().max(200),
});

export async function cambiarPassword(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const p = passwordSchema.safeParse({
    passwordActual: fd.get("passwordActual") ?? "",
    passwordNueva: fd.get("passwordNueva") ?? "",
    passwordRepetida: fd.get("passwordRepetida") ?? "",
  });
  if (!p.success) return fallo("Revisa los campos marcados.", erroresZod(p.error));
  const { passwordActual, passwordNueva, passwordRepetida } = p.data;
  const debil = validarPassword(passwordNueva);
  if (debil) return fallo(debil, { passwordNueva: debil });
  if (passwordNueva !== passwordRepetida) return fallo("Las contraseñas nuevas no coinciden.", { passwordRepetida: "No coincide con la nueva" });
  if (passwordNueva === passwordActual) return fallo("La nueva contraseña debe ser distinta de la actual.", { passwordNueva: "Es igual a la actual" });
  const error = await confirmarPassword(sesion.usuarioId, passwordActual);
  if (error) return fallo(error, { passwordActual: error });

  await sql()`update auth.users set password_hash = ${await hashPassword(passwordNueva)} where id = ${sesion.usuarioId}`;
  // Por seguridad, cualquier otro dispositivo con la contraseña anterior queda desconectado.
  const cerradas = await cerrarOtrasSesiones(sesion.usuarioId);
  revalidatePath("/admin/cuenta");
  return exito(
    cerradas
      ? `Contraseña actualizada. Cerramos tu sesión en ${cerradas === 1 ? "otro dispositivo" : `${cerradas} dispositivos más`}.`
      : "Contraseña actualizada.",
  );
}

export async function salirDeOtrosDispositivos(): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const n = await cerrarOtrasSesiones(sesion.usuarioId);
  revalidatePath("/admin/cuenta");
  return exito(n ? `Cerramos ${n === 1 ? "1 sesión" : `${n} sesiones`} en otros dispositivos.` : "No tenías sesiones abiertas en otros dispositivos.");
}
