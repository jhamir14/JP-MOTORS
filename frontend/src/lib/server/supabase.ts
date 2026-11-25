import "server-only";

/**
 * Acceso mínimo a la API REST de Supabase (PostgREST) desde el servidor.
 * Usa la service_role key, que salta el RLS: NUNCA importar este archivo desde un componente cliente
 * (el import de "server-only" hace fallar el build si ocurre).
 */
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigurado = Boolean(url && serviceKey);

export async function insertar<T extends Record<string, unknown>>(tabla: string, fila: T): Promise<void> {
  if (!url || !serviceKey) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${tabla}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(fila),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}: ${await res.text().catch(() => "")}`);
}
