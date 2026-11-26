import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav, type ItemNav } from "@/components/admin/AdminNav";
import { CampanaCobranza } from "@/components/admin/CampanaCobranza";
import { Logo } from "@/components/Logo";
import { SECCIONES, seccionesDe, type Seccion } from "@/lib/permisos";
import { ETIQUETA_ROL, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { asegurarProcesoDiario } from "@/lib/server/pagos";
import { salir } from "../login/actions";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Inversiones JP" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  // Mora y estados del día (una vez por día; si el job programado ya corrió, no hace nada).
  await asegurarProcesoDiario();
  const [pendientes] = await sql()<{ solicitudes: number; reclamos: number; mora: number; vencen_hoy: number; hoy: string }[]>`
    select (select count(*) from public.solicitud_credito where estado = 'NUEVA')::int as solicitudes,
           to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD') as hoy,
           (select count(distinct cu.credito_id) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') and cu.estado <> 'PAGADA'
              and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
              and cu.fecha_vencimiento = (now() at time zone 'America/Lima')::date
              and not exists (select 1 from public.cuota v where v.credito_id = cu.credito_id and v.estado <> 'PAGADA'
                              and v.monto_cuota + v.mora - v.monto_pagado > 0
                              and v.fecha_vencimiento < (now() at time zone 'America/Lima')::date))::int as vencen_hoy,
           (select count(distinct cu.credito_id) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') and cu.estado <> 'PAGADA'
              and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
              and cu.fecha_vencimiento < (now() at time zone 'America/Lima')::date)::int as mora,
           (select count(*) from public.reclamo where estado <> 'RESPONDIDO')::int as reclamos`;

  // Menú según la matriz de permisos (src/lib/permisos.ts): cada rol ve solo lo que puede abrir.
  const badges: Partial<Record<Seccion, number>> = { solicitudes: pendientes.solicitudes, cobranzas: pendientes.mora, reclamos: pendientes.reclamos };
  const items: ItemNav[] = seccionesDe(sesion.rol).map((s) => ({ href: SECCIONES[s].href, label: SECCIONES[s].label, badge: badges[s] }));

  const iniciales = `${sesion.nombres.charAt(0)}${sesion.apellidos.charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[250px_minmax(0,1fr)] print:block print:bg-white">
      {/* Menú lateral: ocupa toda la altura de la pantalla y se desplaza por dentro (no se sale sobre el fondo blanco). */}
      <aside className="bg-brand-ink px-4 py-4 text-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:py-5 print:hidden">
        <div className="mb-3 flex items-center justify-between md:mb-5 md:shrink-0">
          <Link href="/admin" aria-label="Inicio del panel">
            <Logo tone="light" />
          </Link>
          <Link href="/" target="_blank" className="text-xs font-semibold text-white/60 hover:text-white md:hidden">Ver web ↗</Link>
        </div>
        <div className="md:-mx-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-2 md:[scrollbar-color:rgba(255,255,255,0.25)_transparent] md:[scrollbar-width:thin]">
          <AdminNav items={items} />
        </div>
        <div className="mt-4 hidden shrink-0 border-t border-white/10 pt-4 md:block">
          <Link href="/" target="_blank" className="text-xs font-semibold text-white/60 hover:text-white">Ver la web ↗</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior: quién está conectado y cerrar sesión (para entrar con otro usuario o rol). */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line-soft bg-surface/95 px-4 py-2.5 backdrop-blur md:px-8 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white">{iniciales}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-fg">{sesion.nombres} {sesion.apellidos}</div>
              <div className="truncate text-xs text-muted">{ETIQUETA_ROL[sesion.rol]}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <CampanaCobranza hoy={pendientes.hoy} vencenHoy={pendientes.vencen_hoy} enMora={pendientes.mora} />
          <form action={salir}>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition-colors hover:border-danger hover:bg-danger/5 hover:text-danger"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
              </svg>
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
