"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const leerPermiso = (): NotificationPermission | "no-soportado" =>
  typeof window !== "undefined" && "Notification" in window ? Notification.permission : "no-soportado";
const sinSuscripcion = () => () => {};

/**
 * Campana de la barra superior: cuántos clientes hay que cobrar hoy (vencen hoy + en mora) y aviso del navegador.
 *   · Al abrir el panel se muestra una notificación del sistema (Windows, Android, Mac…) una vez en la mañana
 *     y otra en la tarde (desde las 3 p. m.) mientras queden cobranzas pendientes, si el usuario las activó.
 *   · Funciona mientras el panel esté abierto en el navegador (pestaña abierta o en segundo plano).
 */
export function CampanaCobranza({ hoy, vencenHoy, enMora }: { hoy: string; vencenHoy: number; enMora: number }) {
  const total = vencenHoy + enMora;
  // El permiso se lee del navegador en cada render (en el servidor: «default»); tras pedirlo se fuerza un render.
  const [, setPedido] = useState(0);
  const permiso = useSyncExternalStore(sinSuscripcion, leerPermiso, () => "default" as const);

  useEffect(() => {
    if (permiso !== "granted" || total === 0) return;
    const avisar = () => {
      const tramo = new Date().toLocaleString("en-US", { timeZone: "America/Lima", hour: "numeric", hour12: false });
      const clave = `jp-aviso-cobranza:${hoy}:${Number(tramo) >= 15 ? "tarde" : "manana"}`;
      try {
        if (localStorage.getItem(clave)) return;
        localStorage.setItem(clave, "1");
      } catch {
        /* sin almacenamiento: se avisa igual */
      }
      const partes = [vencenHoy ? `${vencenHoy} cuota${vencenHoy === 1 ? "" : "s"} vence${vencenHoy === 1 ? "" : "n"} hoy` : "", enMora ? `${enMora} en mora` : ""].filter(Boolean);
      const n = new Notification("Cobranzas pendientes · Inversiones JP", {
        body: `${partes.join(" y ")}. Toca para ver a quién cobrar.`,
        tag: "jp-cobranzas",
        icon: "/logo-jp.webp",
      });
      n.onclick = () => {
        window.focus();
        window.location.href = "/admin/cobranzas";
      };
    };
    avisar();
    const t = window.setInterval(avisar, 30 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [permiso, total, hoy, vencenHoy, enMora]);

  const activar = async () => {
    if (permiso === "no-soportado") return;
    await Notification.requestPermission();
    setPedido((n) => n + 1);
  };

  return (
    <div className="flex items-center gap-2">
      {permiso === "default" && (
        <button type="button" onClick={activar} className="hidden cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-soft sm:inline-flex">
          Activar avisos de cobranza
        </button>
      )}
      <Link
        href={enMora > 0 && vencenHoy === 0 ? "/admin/cobranzas?ver=mora" : "/admin/cobranzas"}
        aria-label={`Cobranzas pendientes: ${vencenHoy} vencen hoy, ${enMora} en mora`}
        title={`${vencenHoy} vencen hoy · ${enMora} en mora`}
        className="relative inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-fg hover:border-brand hover:text-brand"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] leading-5 font-bold text-white">{total > 99 ? "99+" : total}</span>
        )}
      </Link>
    </div>
  );
}
