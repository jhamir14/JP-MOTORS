"use client";
import Link from "next/link";
import { useAvisosPush } from "./AvisosPush";

/**
 * Campana de la barra superior: cuántos clientes hay que cobrar hoy (vencen hoy + en mora).
 * El botón «Activar avisos» suscribe este navegador a las notificaciones push: el servidor las envía
 * en la mañana y en la tarde (/api/cron/avisos-cobranza) y llegan aunque la pestaña del panel esté cerrada.
 */
export function CampanaCobranza({ vencenHoy, enMora, clavePush }: { vencenHoy: number; enMora: number; clavePush: string | null }) {
  const total = vencenHoy + enMora;
  const { estado, activar } = useAvisosPush(clavePush);

  return (
    <div className="flex items-center gap-2">
      {estado === "inactivo" && (
        <button type="button" onClick={activar} className="hidden cursor-pointer rounded-xl px-2.5 py-2 text-xs font-semibold text-brand hover:bg-brand-soft min-[380px]:inline-flex sm:px-3">
          Activar avisos<span className="hidden sm:inline">&nbsp;de cobranza</span>
        </button>
      )}
      <Link
        href={enMora > 0 && vencenHoy === 0 ? "/admin/cobranzas?ver=mora" : "/admin/cobranzas"}
        aria-label={`Cobranzas pendientes: ${vencenHoy} vencen hoy, ${enMora} en mora`}
        title={`${vencenHoy} vencen hoy · ${enMora} en mora${estado === "activo" ? " · avisos activados" : ""}`}
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
