"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconMoto, IconPhone, IconUser, IconWallet } from "@/components/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome, exact: true },
  { href: "/motos", label: "Motos", Icon: IconMoto, exact: false },
  { href: "/celulares", label: "Celulares", Icon: IconPhone, exact: false },
  { href: "/cotizar", label: "Cotizar", Icon: IconWallet, exact: false },
  { href: "/nosotros", label: "Nosotros", Icon: IconUser, exact: false },
];

/** Barra inferior estilo app, solo en móvil. */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-3 bottom-3 z-[1000] flex items-center justify-around rounded-full border border-white/10 bg-noche/90 px-2 py-1.5 shadow-[0_18px_40px_-12px_rgba(5,14,36,0.7)] backdrop-blur-xl md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ href, label, Icon, exact }) => {
        const activo = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.7rem] font-semibold min-[420px]:flex-row min-[420px]:gap-1.5 min-[420px]:py-2.5 min-[420px]:text-[0.78rem] transition-colors duration-300",
              activo ? "bg-oro text-noche" : "text-white/70",
            )}
          >
            <Icon size={17} strokeWidth={activo ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
