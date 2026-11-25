"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCard, IconGrid, IconHome, IconWrench } from "@/components/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome, exact: true },
  { href: "/motos", label: "Motos", Icon: IconGrid },
  { href: "/repuestos", label: "Repuestos", Icon: IconWrench },
  { href: "/financiamiento", label: "Crédito", Icon: IconCard },
];

/** Barra de navegación inferior estilo app, solo en móvil. */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-around border-t border-line-soft bg-[rgba(10,12,16,0.98)] pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md md:hidden"
    >
      {items.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 transition-colors", active ? "text-accent" : "text-muted")}
          >
            <Icon />
            <span className="text-[0.65rem] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
