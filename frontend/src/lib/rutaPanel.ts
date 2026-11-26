/**
 * Ruta secreta del login del panel (variable de entorno PANEL_RUTA_SECRETA, solo servidor).
 * La usan el proxy (src/proxy.ts) y requerirSesion(): ver la explicación en src/proxy.ts.
 */
export const COOKIE_PUERTA = "jp_puerta";

/** Segmento secreto («acceso-7k2q9x4m»), o "" si no está configurado o no es válido. */
export function rutaSecreta(): string {
  const r = process.env.PANEL_RUTA_SECRETA?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return /^[A-Za-z0-9_-]{8,80}$/.test(r) && !r.startsWith("admin") ? r : "";
}

/** Valor de la cookie «puerta»: prueba que el navegador entró alguna vez por la ruta secreta. */
export async function huellaPuerta(secreta: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`jp-puerta:${secreta}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
