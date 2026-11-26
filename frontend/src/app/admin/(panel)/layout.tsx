import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav, type ItemNav } from "@/components/admin/AdminNav";
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
  const [pendientes] = await sql()<{ solicitudes: number; reclamos: number; mora: number }[]>`
    select (select count(*) from public.solicitud_credito where estado = 'NUEVA')::int as solicitudes,
           (select count(distinct cu.credito_id) from public.cuota cu join public.credito cr on cr.id = cu.credito_id
            where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO') and cu.estado <> 'PAGADA'
              and cu.monto_cuota + cu.mora - cu.monto_pagado > 0
              and cu.fecha_vencimiento < (now() at time zone 'America/Lima')::date)::int as mora,
           (select count(*) from public.reclamo where estado <> 'RESPONDIDO')::int as reclamos`;

  // Menú según la matriz de permisos (src/lib/permisos.ts): cada rol ve solo lo que puede abrir.
  const badges: Partial<Record<Seccion, number>> = { solicitudes: pendientes.solicitudes, cobranzas: pendientes.mora, reclamos: pendientes.reclamos };
  const items: ItemNav[] = seccionesDe(sesion.rol).map((s) => ({ href: SECCIONES[s].href, label: SECCIONES[s].label, badge: badges[s] }));

  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[250px_1fr] print:block print:bg-white">
      <aside className="print:hidden bg-brand-ink px-4 py-4 text-white md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-6 md:py-6">
        <div className="mb-3 flex items-center justify-between md:mb-0">
          <Link href="/admin" aria-label="Inicio del panel">
            <Logo tone="light" />
          </Link>
          <Link href="/" target="_blank" className="text-xs font-semibold text-white/60 hover:text-white md:hidden">Ver web ↗</Link>
        </div>
        <AdminNav items={items} />
        <div className="mt-auto hidden border-t border-white/10 pt-4 text-sm md:block">
          <div className="font-semibold">{sesion.nombres} {sesion.apellidos}</div>
          <div className="text-xs text-white/60">{ETIQUETA_ROL[sesion.rol]}</div>
          <div className="mt-3 flex items-center gap-4">
            <Link href="/" target="_blank" className="text-xs font-semibold text-white/70 hover:text-white">Ver web ↗</Link>
            <form action={salir}>
              <button type="submit" className="cursor-pointer text-xs font-semibold text-white/70 hover:text-white">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line-soft bg-surface px-4 py-2 text-xs md:hidden print:hidden">
          <span>{sesion.nombres} · {ETIQUETA_ROL[sesion.rol]}</span>
          <form action={salir}>
            <button type="submit" className="cursor-pointer font-semibold text-brand">Cerrar sesión</button>
          </form>
        </div>
        <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
