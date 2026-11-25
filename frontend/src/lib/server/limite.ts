import "server-only";

/**
 * Límite de intentos en memoria por clave (IP + acción). Es una protección básica contra abuso
 * de formularios públicos y fuerza bruta en el login; en serverless cada instancia lleva su propia
 * cuenta, así que es "best effort" (la Fase 9 contempla un rate-limit compartido).
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

export function ipDe(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "desconocida";
}
