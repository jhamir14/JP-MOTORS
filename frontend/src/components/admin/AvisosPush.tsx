"use client";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { desuscribirAvisos, probarAviso, suscribirAvisos } from "@/app/admin/(panel)/avisosActions";

export type EstadoAvisos = "cargando" | "no-soportado" | "iphone-sin-instalar" | "bloqueado" | "inactivo" | "activo";

const soportaPush = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const esIphoneSinInstalar = () =>
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

function base64ABytes(b64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function suscribir(clave: string) {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABytes(clave) });
  const r = await suscribirAvisos(sub.toJSON());
  if (!r.ok) throw new Error("El servidor no aceptó la suscripción");
  return sub;
}

/**
 * Avisos de cobranza con la pestaña cerrada (Web Push).
 * Si el permiso ya estaba concedido, la suscripción se renueva sola al abrir el panel.
 */
export function useAvisosPush(clave: string | null) {
  const [estado, setEstado] = useState<EstadoAvisos>("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!clave || !soportaPush()) return setEstado(esIphoneSinInstalar() ? "iphone-sin-instalar" : "no-soportado");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      if (Notification.permission !== "granted") return setEstado("inactivo");
      try {
        await suscribir(clave);
        if (vivo) setEstado("activo");
      } catch {
        if (vivo) setEstado("inactivo");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [clave]);

  const activar = useCallback(async () => {
    if (!clave || !soportaPush()) return;
    setError(null);
    setEstado("cargando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
      await suscribir(clave);
      setEstado("activo");
      await probarAviso();
    } catch {
      setError("No se pudieron activar los avisos. Inténtalo de nuevo.");
      setEstado("inactivo");
    }
  }, [clave]);

  const desactivar = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await desuscribirAvisos(sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      setEstado("inactivo");
    }
  }, []);

  return { estado, error, activar, desactivar };
}

const AYUDA: Partial<Record<EstadoAvisos, string>> = {
  "iphone-sin-instalar": "En iPhone: toca Compartir → «Agregar a inicio», abre el panel desde ese ícono y activa los avisos ahí.",
  bloqueado: "Los avisos están bloqueados para este sitio: actívalos en la configuración del navegador (ícono del candado → Notificaciones).",
  "no-soportado": "Este navegador no admite avisos. Usa Chrome, Edge o Firefox.",
};

/** Interruptor de avisos para el menú móvil (texto completo y estado). */
export function AvisosMenu({ clave }: { clave: string | null }) {
  const { estado, error, activar, desactivar } = useAvisosPush(clave);
  const activo = estado === "activo";
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Avisos de cobranza</div>
          <div className="text-xs text-muted">{activo ? "Activados en este dispositivo" : "Llegan aunque el panel esté cerrado"}</div>
        </div>
        {(estado === "inactivo" || activo || estado === "cargando") && (
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            aria-label="Avisos de cobranza"
            disabled={estado === "cargando"}
            onClick={() => (activo ? desactivar() : activar())}
            className={cn("relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60", activo ? "bg-accent" : "bg-line")}
          >
            <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform", activo && "translate-x-5")} />
          </button>
        )}
      </div>
      {AYUDA[estado] && <p className="mt-2 text-xs text-muted">{AYUDA[estado]}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
