"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconMoto, IconPhone, IconWrench } from "@/components/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome, exact: true },
  { href: "/vehiculos", label: "Vehículos", Icon: IconMoto },
  { href: "/celulares", label: "Celulares", Icon: IconPhone },
  { href: "/repuestos", label: "Repuestos", Icon: IconWrench },
];

/** Barra de navegación inferior estilo app, solo en móvil. */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-around border-t border-line bg-white/95 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(11,31,58,0.08)] backdrop-blur-md md:hidden"
    >
      {items.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-w-14 flex-col items-center gap-1 rounded-lg py-1 transition-colors", active ? "text-brand" : "text-muted")}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span className={cn("text-[0.66rem]", active ? "font-bold" : "font-medium")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
