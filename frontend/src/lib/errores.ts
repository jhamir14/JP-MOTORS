/**
 * Fase 9 · Monitoreo de errores (lógica pura).
 * Antes de guardar un error se quitan datos personales que suelen colarse en los mensajes
 * (p. ej. «Key (numero_documento)=(45678912) already exists»): correos, números largos
 * (DNI, teléfonos, IMEI, tarjetas), tokens y la query de la URL.
 */

export const ORIGENES_ERROR = ["servidor", "panel", "web"] as const;
export type OrigenError = (typeof ORIGENES_ERROR)[number];

export function sanitizarMensaje(mensaje: unknown, max = 1000): string {
  const texto = mensaje instanceof Error ? `${mensaje.name}: ${mensaje.message}` : typeof mensaje === "string" ? mensaje : String(mensaje ?? "");
  return (
    texto
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[correo]")
      .replace(/\b[0-9a-f]{32,}\b/gi, "[token]")
      .replace(/(postgres(ql)?:\/\/)[^\s]+/gi, "$1[oculto]")
      .replace(/\d[\d\s-]{5,}\d/g, "[número]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max) || "Error sin mensaje"
  );
}

/** Ruta sin query ni fragmento, con ids largos reemplazados (no identifica a nadie). */
export function sanitizarRuta(ruta: unknown): string | null {
  if (typeof ruta !== "string" || !ruta) return null;
  return ruta
    .split(/[?#]/)[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/[0-9a-f]{32,}(?=\/|$)/gi, "/:token")
    .replace(/\/\d{4,}(?=\/|$)/g, "/:n")
    .slice(0, 300);
}

/** Errores de control de Next (redirect(), notFound()) no son fallas: no se registran. */
export function esErrorDeControl(e: unknown): boolean {
  const digest = typeof e === "object" && e && "digest" in e ? String((e as { digest: unknown }).digest) : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "DYNAMIC_SERVER_USAGE";
}
