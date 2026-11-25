import "server-only";
import postgres from "postgres";

/**
 * Conexión a PostgreSQL (Railway) desde el servidor.
 * DATABASE_URL usa el usuario dueño de la base, que no está sujeto a RLS: es el equivalente a la
 * "service role". NUNCA importar este archivo desde un componente cliente ("server-only" lo impide).
 *
 * En Vercel usa la URL pública de Railway (DATABASE_PUBLIC_URL del servicio Postgres);
 * si la web también corre en Railway, la privada (DATABASE_URL).
 */
const url = process.env.DATABASE_URL;

export const dbConfigurada = Boolean(url);

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

/** Cliente compartido entre invocaciones (evita abrir una conexión nueva en cada request). */
export function sql(): postgres.Sql {
  if (!url) throw new Error("Falta DATABASE_URL");
  globalForDb.__sql ??= postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // El certificado de Railway es autofirmado: cifrado sí, verificación de CA no.
    ssl: /localhost|127\.0\.0\.1|\.railway\.internal/.test(url) ? false : { rejectUnauthorized: false },
  });
  return globalForDb.__sql;
}
