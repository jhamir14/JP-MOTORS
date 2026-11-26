import "server-only";
import { createHash } from "node:crypto";
import { dbConfigurada, sql } from "./db";

/**
 * Límite de intentos por clave (acción + IP, correo o usuario).
 *
 * · `permitirIntentoCompartido` (Fase 9): cuenta en PostgreSQL (`registrar_intento`), así el límite vale para
 *   TODAS las instancias serverless de Vercel. La clave se guarda cifrada con SHA-256 (la tabla no tiene IPs
 *   ni correos). Si la base no responde, se usa el contador en memoria: nunca bloquea por un error propio.
 * · `permitirIntento`: contador en memoria de la instancia ("best effort"); queda como respaldo.
 */
const ventanas = new Map<string, { inicio: number; cuenta: number }>();

export function permitirIntento(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  if (ventanas.size > 5_000) {
    for (const [k, v] of ventanas) if (ahora - v.inicio > ventanaMs) ventanas.delete(k);
  }
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio > ventanaMs) {
    ventanas.set(clave, { inicio: ahora, cuenta: 1 });
    return true;
  }
  v.cuenta++;
  return v.cuenta <= maximo;
}

/** Tras un ingreso correcto se borra el contador (los intentos fallidos previos dejan de contar). */
export function reiniciarIntentos(clave: string) {
  ventanas.delete(clave);
}

/** "login:1.2.3.4" → "login:<sha256>". El prefijo (la acción) queda legible para el monitoreo. */
export function claveCifrada(clave: string): string {
  const i = clave.indexOf(":");
  const accion = (i > 0 ? clave.slice(0, i) : "otro").toLowerCase().replace(/[^a-z_]/g, "_") || "otro";
  return `${accion}:${createHash("sha256").update(clave).digest("hex")}`;
}

export async function permitirIntentoCompartido(clave: string, maximo: number, ventanaMs: number): Promise<boolean> {
  const local = permitirIntento(clave, maximo, ventanaMs);
  if (!dbConfigurada) return local;
  try {
    const [r] = await sql()<{ ok: boolean }[]>`
      select public.registrar_intento(${claveCifrada(clave)}, ${maximo}, ${Math.ceil(ventanaMs / 1000)}) as ok`;
    return r.ok;
  } catch (e) {
    console.error("[limite] Rate-limit compartido no disponible, se usa el de memoria:", (e as Error).message);
    return local;
  }
}

export async function reiniciarIntentosCompartido(clave: string) {
  reiniciarIntentos(clave);
  if (!dbConfigurada) return;
  await sql()`select public.reiniciar_intentos(${claveCifrada(clave)})`.catch(() => {});
}

export function ipDe(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "desconocida";
}
