import "server-only";
import { sanitizarMensaje, sanitizarRuta, type OrigenError } from "@/lib/errores";
import { dbConfigurada, sql } from "./db";

/** Guarda un error en public.error_app (vía registrar_error). Nunca lanza: el monitoreo no debe romper la app. */
export async function registrarError(e: {
  origen: OrigenError;
  mensaje: unknown;
  ruta?: unknown;
  metodo?: string | null;
  tipoRuta?: string | null;
  digest?: string | null;
}) {
  const mensaje = sanitizarMensaje(e.mensaje);
  console.error(`[error:${e.origen}] ${sanitizarRuta(e.ruta) ?? ""} ${mensaje}`);
  if (!dbConfigurada) return;
  try {
    await sql()`
      select public.registrar_error(${e.origen}, ${sanitizarRuta(e.ruta)}, ${e.metodo ?? null}, ${e.tipoRuta ?? null},
                                    ${mensaje}, ${e.digest ?? null}, ${process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null})`;
  } catch (err) {
    console.error("[errores] No se pudo registrar el error:", (err as Error).message);
  }
}
