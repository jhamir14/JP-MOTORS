"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fallo, type EstadoAccion } from "@/lib/admin/accion";
import { cerrarSesion, crearSesion } from "@/lib/server/auth";
import { dbConfigurada, sql } from "@/lib/server/db";
import { ipDe, permitirIntentoCompartido, reiniciarIntentosCompartido } from "@/lib/server/limite";
import { verificarPassword } from "@/lib/server/password";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

const ERROR_GENERICO = "Correo o contraseña incorrectos.";

export async function iniciarSesion(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  if (!dbConfigurada) return fallo("El panel no está configurado (falta DATABASE_URL).");
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return fallo(ERROR_GENERICO);
  const { email, password } = parsed.data;

  const ip = ipDe(await headers());
  const [porIp, porCorreo] = await Promise.all([
    permitirIntentoCompartido(`login:${ip}`, 10, 15 * 60 * 1000),
    permitirIntentoCompartido(`login:${email}`, 5, 15 * 60 * 1000),
  ]);
  if (!porIp || !porCorreo) {
    return fallo("Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.");
  }

  const [usuario] = await sql()<{ id: string; password_hash: string | null; activo: boolean }[]>`
    select u.id, u.password_hash, (u.activo and coalesce(p.activo, false)) as activo
    from auth.users u left join public.perfil_usuario p on p.id = u.id
    where u.email = ${email}`;

  const valida = await verificarPassword(password, usuario?.password_hash);
  if (!usuario || !valida || !usuario.activo) return fallo(ERROR_GENERICO);

  await reiniciarIntentosCompartido(`login:${email}`);
  await crearSesion(usuario.id);
  redirect("/admin");
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/login");
}
