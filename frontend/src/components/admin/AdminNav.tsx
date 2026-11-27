"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ItemNav {
  href: string;
  label: string;
  badge?: number;
}

/** Trazos (24×24, estilo línea) de cada sección del panel. */
const ICONOS: Record<string, ReactNode> = {
  "/admin": <><path d="m3 10 9-7 9 7" /><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" /></>,
  "/admin/reportes": <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  "/admin/solicitudes": <><path d="M4 4h16v12H8l-4 4z" /><path d="M8 9h8M8 12h5" /></>,
  "/admin/clientes": <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>,
  "/admin/creditos": <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></>,
  "/admin/cobranzas": <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  "/admin/pagos": <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  "/admin/caja": <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><circle cx="12" cy="13.5" r="2" /></>,
  "/admin/catalogo": <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  "/admin/inventario": <><path d="m12 2.5 9 5v9l-9 5-9-5v-9z" /><path d="m3 7.5 9 5 9-5M12 12.5v9" /></>,
  "/admin/tasas": <><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>,
  "/admin/reclamos": <><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" /><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" /><path d="M12 7v4M12 14h.01" /></>,
  "/admin/personal": <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  "/admin/cuenta": <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.2 18.4a6.5 6.5 0 0 1 11.6 0" /></>,
  "/admin/sistema": <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};

export function IconoSeccion({ href, className }: { href: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("size-5 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {ICONOS[href] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

const esActivo = (href: string, pathname: string | null) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || !!pathname?.startsWith(`${href}/`);

const Insignia = ({ n, className }: { n: number; className?: string }) => (
  <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-bold tabular", className)}>{n > 99 ? "99+" : n}</span>
);

/** Menú lateral de escritorio (desde `md`). */
export function AdminNav({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex flex-col gap-0.5">
      {items.map((it) => {
        const activo = esActivo(it.href, pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              activo ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <IconoSeccion href={it.href} className={activo ? "text-gold" : "text-white/55"} />
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.badge ? <Insignia n={it.badge} className="bg-gold text-brand-ink" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Secciones que van fijas en la barra inferior del móvil (en este orden, si el rol las ve). */
const PRINCIPALES = ["/admin", "/admin/cobranzas", "/admin/creditos", "/admin/clientes"];

/**
 * Navegación móvil (hasta `md`): barra inferior fija con las 4 secciones de uso diario + «Menú»,
 * que abre una hoja con todas las secciones en cuadrícula, la cuenta y cerrar sesión (`pie`).
 */
export function AdminNavMovil({ items, cuenta, pie }: { items: ItemNav[]; cuenta: ReactNode; pie: ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [rutaAbierta, setRutaAbierta] = useState(pathname);

  // Al navegar, la hoja se cierra sola.
  if (abierto && rutaAbierta !== pathname) {
    setAbierto(false);
  }

  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const fijos = PRINCIPALES.map((h) => items.find((i) => i.href === h)).filter((i): i is ItemNav => !!i).slice(0, 4);
  const resto = items.filter((i) => !fijos.includes(i));
  const pendientesResto = resto.reduce((s, i) => s + (i.badge ?? 0), 0);
  const menuActivo = abierto || resto.some((i) => esActivo(i.href, pathname));

  const abrir = () => {
    setRutaAbierta(pathname);
    setAbierto(true);
  };

  return (
    <>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(5,14,36,0.25)] backdrop-blur md:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {fijos.map((it) => {
            const activo = !abierto && esActivo(it.href, pathname);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn("relative flex h-16 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold min-[360px]:text-[11px]", activo ? "text-brand" : "text-muted")}
                >
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", activo && "bg-brand-soft")}>
                    <IconoSeccion href={it.href} className="size-[22px]" />
                  </span>
                  <span className="max-w-full truncate">{it.label}</span>
                  {it.badge ? <Insignia n={it.badge} className="absolute top-1.5 left-1/2 ml-2 bg-danger text-white ring-2 ring-surface" /> : null}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => (abierto ? setAbierto(false) : abrir())}
              aria-expanded={abierto}
              aria-controls="menu-panel-movil"
              className={cn("relative flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold min-[360px]:text-[11px]", menuActivo ? "text-brand" : "text-muted")}
            >
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", menuActivo && "bg-brand-soft")}>
                <svg aria-hidden viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  {abierto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </span>
              <span>{abierto ? "Cerrar" : "Menú"}</span>
              {!abierto && pendientesResto > 0 ? <Insignia n={pendientesResto} className="absolute top-1.5 left-1/2 ml-2 bg-danger text-white ring-2 ring-surface" /> : null}
            </button>
          </li>
        </ul>
      </nav>

      {abierto && (
        <div className="fixed inset-0 z-30 md:hidden print:hidden">
          <button type="button" aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute inset-0 cursor-default bg-brand-ink/50 backdrop-blur-[2px]" />
          <div
            id="menu-panel-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú del panel"
            className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <div className="mb-4 rounded-2xl bg-surface-2 p-3">{cuenta}</div>
            <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Secciones</h2>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((it) => {
                const activo = esActivo(it.href, pathname);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setAbierto(false)}
                      aria-current={activo ? "page" : undefined}
                      className={cn(
                        "relative flex h-full min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 text-center text-xs leading-tight font-semibold transition-colors",
                        activo ? "border-brand bg-brand-soft text-brand" : "border-line-soft bg-surface text-fg active:bg-surface-2",
                      )}
                    >
                      <span className={cn("flex size-9 items-center justify-center rounded-xl", activo ? "bg-brand text-white" : "bg-surface-2 text-brand")}>
                        <IconoSeccion href={it.href} />
                      </span>
                      <span className="break-words hyphens-auto">{it.label}</span>
                      {it.badge ? <Insignia n={it.badge} className="absolute top-1.5 right-1.5 bg-danger text-white" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-col gap-2">{pie}</div>
          </div>
        </div>
      )}
    </>
  );
}
