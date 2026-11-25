import type { z } from "zod";

/** Resultado de una Server Action del panel (lo consume <AdminForm />). */
export type EstadoAccion = {
  ok?: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
  /** Enlace opcional junto al mensaje (ej. al registro duplicado). */
  enlace?: { href: string; texto: string };
} | null;

export const exito = (mensaje: string): EstadoAccion => ({ ok: true, mensaje });
export const fallo = (mensaje: string, errores?: Record<string, string>, enlace?: { href: string; texto: string }): EstadoAccion => ({
  ok: false,
  mensaje,
  errores,
  enlace,
});

export function erroresZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

/** Traduce errores de PostgreSQL habituales a mensajes entendibles. */
export function mensajeErrorBD(e: unknown): string {
  const err = e as { code?: string; constraint_name?: string; detail?: string };
  if (err?.code === "23505") return `Ya existe un registro con ese valor${err.detail ? ` (${err.detail.replace(/^Key /, "")})` : ""}.`;
  if (err?.code === "42501") return "Tu rol no tiene permiso para esta operación.";
  if (err?.code === "23514") return "Algún valor no cumple las reglas del sistema. Revisa los datos.";
  if (err?.code === "23503") return "El registro está relacionado con otros datos y no se puede modificar así.";
  console.error("[admin] Error de base de datos:", e);
  return "No se pudo guardar. Inténtalo de nuevo.";
}

/** FormData → objeto plano de strings (los checkboxes no marcados no vienen). */
export function datosDe(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v.trim();
  return out;
}
