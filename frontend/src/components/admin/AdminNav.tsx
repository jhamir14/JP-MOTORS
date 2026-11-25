"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface ItemNav {
  href: string;
  label: string;
  badge?: number;
}

/** Navegación del panel: lateral en escritorio; en móvil todas las opciones a la vista (en varias filas). */
export function AdminNav({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
      {items.map((it) => {
        const activo = it.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors md:gap-3 md:px-3.5 md:py-2.5 md:text-sm",
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
