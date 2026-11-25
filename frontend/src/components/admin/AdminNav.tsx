"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface ItemNav {
  href: string;
  label: string;
  badge?: number;
}

/** Navegación del panel: lateral en escritorio, barra desplazable en móvil. */
export function AdminNav({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((it) => {
        const activo = it.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
              activo ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {it.label}
            {it.badge ? <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-brand-ink">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
