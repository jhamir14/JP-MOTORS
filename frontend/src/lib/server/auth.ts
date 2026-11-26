import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type postgres from "postgres";
import { sql } from "./db";

/**
 * Sesiones del panel administrativo.
 *   · Cookie `jp_sesion` httpOnly con un token aleatorio de 256 bits; en la BD (sesion_panel) solo se guarda su SHA-256.
 *   · Duración: 12 horas. Cerrar sesión o desactivar al usuario la invalida en el acto.
 *   · Las escrituras se hacen con `comoUsuario()`: `set local role authenticated` + `app.usuario_id`,
 *     de modo que las políticas RLS y la auditoría (audit_log) se aplican al usuario real.
 */

export const COOKIE_SESION = "jp_sesion";
const DURACION_MS = 12 * 60 * 60 * 1000;

import { ROLES, type Rol } from "@/lib/roles";
import { SECCIONES, type Seccion } from "@/lib/permisos";
import { COOKIE_PUERTA, huellaPuerta, rutaSecreta } from "@/lib/rutaPanel";

export { ROLES, type Rol };
export const ETIQUETA_ROL: Record<Rol, string> = {
  SUPERADMIN: "Superadministrador",
  ADMIN_CREDITOS: "Administrador de créditos",
  ASESOR_VENTAS: "Asesor de ventas",
  COBRADOR: "Cobrador",
};

export interface Sesion {
  usuarioId: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function crearSesion(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DURACION_MS);
  const h = await headers();
  const db = sql();
  await db`
    insert into public.sesion_panel (usuario_id, token_hash, expira, ip, user_agent)
    values (${usuarioId}, ${hashToken(token)}, ${expira}, ${h.get("x-forwarded-for")?.split(",")[0] ?? null}, ${h.get("user-agent")?.slice(0, 300) ?? null})`;
  await db`update auth.users set ultimo_acceso = now() where id = ${usuarioId}`;
  // Limpieza oportunista de sesiones vencidas hace más de un día.
  await db`delete from public.sesion_panel where expira < now() - interval '1 day'`;
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  if (token) await sql()`delete from public.sesion_panel where token_hash = ${hashToken(token)}`.catch(() => {});
  jar.delete(COOKIE_SESION);
}

/** Sesión del request actual (o null). Cacheado por request. */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  try {
    const [fila] = await sql()<Sesion[]>`
      select u.id as "usuarioId", u.email::text as email, p.nombres, p.apellidos, p.rol
      from public.sesion_panel s
      join auth.users u on u.id = s.usuario_id and u.activo
      join public.perfil_usuario p on p.id = u.id and p.activo
      where s.token_hash = ${hashToken(token)} and s.expira > now()`;
    return fila ?? null;
  } catch (e) {
    console.error("[auth] No se pudo validar la sesión:", e);
    return null;
  }
});

/** Para páginas y acciones del panel: exige sesión (y opcionalmente un rol). */
export async function requerirSesion(...roles: Rol[]): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) {
    // Con ruta secreta: a quien no conoce la puerta se le responde «no encontrado» (no se revela el panel).
    const secreta = rutaSecreta();
    if (secreta && (await cookies()).get(COOKIE_PUERTA)?.value !== (await huellaPuerta(secreta))) notFound();
    redirect("/admin/login");
  }
  if (roles.length && !roles.includes(s.rol)) redirect("/admin?sinPermiso=1");
  return s;
}

/** Exige sesión con un rol que pueda ver la sección (matriz de src/lib/permisos.ts). */
export function requerirSeccion(seccion: Seccion): Promise<Sesion> {
  return requerirSesion(...SECCIONES[seccion].roles);
}

export const puede = (s: Pick<Sesion, "rol">, ...roles: Rol[]) => roles.includes(s.rol);

/** Ejecuta consultas como el usuario del panel: RLS y auditoría aplican con su identidad. */
export async function comoUsuario<T>(sesion: Sesion, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql().begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('app.usuario_id', ${sesion.usuarioId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
