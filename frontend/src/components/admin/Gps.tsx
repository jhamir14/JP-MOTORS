"use client";
import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";

/**
 * Geolocalización del domicilio desde el celular del asesor (navigator.geolocation).
 * Requiere HTTPS y que la persona autorice el acceso a la ubicación en el navegador.
 */

function obtenerPosicion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Este navegador no permite obtener la ubicación."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

function mensajeError(e: unknown): string {
  const code = (e as GeolocationPositionError)?.code;
  if (code === 1) return "Permiso de ubicación denegado. Actívalo en el navegador para este sitio.";
  if (code === 2) return "No se pudo determinar la ubicación. Activa el GPS del celular.";
  if (code === 3) return "La ubicación tardó demasiado. Inténtalo de nuevo al aire libre.";
  return (e as Error)?.message || "No se pudo obtener la ubicación.";
}

/** En el formulario del cliente: completa los campos de latitud y longitud con la posición actual. */
export function RellenarGps({ latitudId = "latitud", longitudId = "longitud" }: { latitudId?: string; longitudId?: string }) {
  const [estado, setEstado] = useState<{ cargando?: boolean; texto?: string; error?: boolean }>({});
  const usar = async () => {
    setEstado({ cargando: true });
    try {
      const p = await obtenerPosicion();
      const lat = document.getElementById(latitudId) as HTMLInputElement | null;
      const lng = document.getElementById(longitudId) as HTMLInputElement | null;
      if (lat) lat.value = p.coords.latitude.toFixed(6);
      if (lng) lng.value = p.coords.longitude.toFixed(6);
      setEstado({ texto: `Ubicación tomada (±${Math.round(p.coords.accuracy)} m). Guarda el formulario.` });
    } catch (e) {
      setEstado({ texto: mensajeError(e), error: true });
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" size="sm" onClick={usar} disabled={estado.cargando}>
        {estado.cargando ? "Obteniendo ubicación…" : "📍 Usar mi ubicación actual"}
      </Button>
      {estado.texto && <span role="status" className={cn("text-xs", estado.error ? "text-danger" : "text-muted")}>{estado.texto}</span>}
    </div>
  );
}

/** En la ficha: toma la ubicación y la guarda de inmediato (estando en el domicilio del cliente). */
export function CapturarUbicacion({
  clienteId,
  action,
  tieneUbicacion,
}: {
  clienteId: string;
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  tieneUbicacion: boolean;
}) {
  const [resultado, dispatch, pendiente] = useActionState(action, null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const capturar = async () => {
    setError(null);
    setBuscando(true);
    try {
      const p = await obtenerPosicion();
      const fd = new FormData();
      fd.set("clienteId", clienteId);
      fd.set("latitud", String(p.coords.latitude));
      fd.set("longitud", String(p.coords.longitude));
      fd.set("precision", String(p.coords.accuracy));
      startTransition(() => dispatch(fd));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setBuscando(false);
    }
  };

  const mensaje = error ?? resultado?.mensaje;
  const esError = Boolean(error) || resultado?.ok === false;
  return (
    <div className="grid gap-2">
      <Button type="button" variant={tieneUbicacion ? "outline" : "brand"} size="sm" onClick={capturar} disabled={buscando || pendiente} className="justify-self-start">
        {buscando ? "Obteniendo ubicación…" : pendiente ? "Guardando…" : tieneUbicacion ? "📍 Actualizar con mi ubicación" : "📍 Registrar ubicación (estoy en el domicilio)"}
      </Button>
      {mensaje && (
        <p role={esError ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-xs font-medium", esError ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent")}>
          {mensaje}
        </p>
      )}
    </div>
  );
}
