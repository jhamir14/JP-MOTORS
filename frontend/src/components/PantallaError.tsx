"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * Pantalla de error común (panel y web). Informa el error a /api/errores (sanitizado en el servidor)
 * y muestra el código de referencia para soporte, sin detalles técnicos.
 */
export function PantallaError({ error, reset, origen }: { error: Error & { digest?: string }; reset: () => void; origen: "panel" | "web" }) {
  useEffect(() => {
    fetch("/api/errores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origen, mensaje: `${error.name}: ${error.message}`.slice(0, 2000), ruta: window.location.pathname, digest: error.digest }),
      keepalive: true,
    }).catch(() => {});
  }, [error, origen]);

  return (
    <div role="alert" className="mx-auto my-16 max-w-lg rounded-2xl border border-line-soft bg-surface p-8 text-center shadow-card">
      <h1 className="text-2xl">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted">
        Ocurrió un error inesperado y ya quedó registrado. Vuelve a intentarlo; si se repite, avisa al administrador
        {error.digest ? <> con el código <code className="font-mono text-xs">{error.digest}</code></> : null}.
      </p>
      <Button className="mt-6" onClick={reset}>Reintentar</Button>
    </div>
  );
}
