import type { Instrumentation } from "next";

/**
 * Fase 9 · Monitoreo: cada error no controlado del servidor (páginas, acciones, rutas API) se guarda
 * en public.error_app sin datos personales y se ve en /admin/sistema (Superadmin).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { esErrorDeControl } = await import("@/lib/errores");
  if (esErrorDeControl(error)) return;
  const { registrarError } = await import("@/lib/server/errores");
  const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest: unknown }).digest) : null;
  await registrarError({
    origen: "servidor",
    mensaje: error,
    ruta: request.path,
    metodo: request.method,
    tipoRuta: context.routeType,
    digest,
  });
};
