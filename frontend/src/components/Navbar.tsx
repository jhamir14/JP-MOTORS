"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconWhatsApp } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { mainNav } from "@/lib/nav";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

/** Barra superior: se funde con el hero oscuro y se compacta al hacer scroll. */
export default function Navbar() {
  const pathname = usePathname();
  const [compacta, setCompacta] = useState(false);

  useEffect(() => {
    const alScroll = () => setCompacta(window.scrollY > 24);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-[1000] border-b transition-[background-color,border-color,box-shadow] duration-500",
        compacta
          ? "border-oro/20 bg-noche/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          : "border-transparent bg-noche",
      )}
    >
      <nav aria-label="Principal" className="container flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label={`${siteConfig.name}, ir al inicio`}
          className={cn("flex items-center transition-[padding] duration-500", compacta ? "py-2.5" : "py-3.5 md:py-4")}
        >
          <Logo tone="light" size={compacta ? 40 : 48} priority />
        </Link>

        <ul className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1.5 md:flex">
          {mainNav.map((item) => {
            const activo = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "block rounded-full px-5 py-2 text-[0.92rem] font-semibold transition-colors duration-300",
                    activo ? "bg-white text-noche" : "text-white/75 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <a
          href={whatsappLink(whatsappMessages.general())}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-oro !px-4 !py-2.5 text-sm md:!px-5"
        >
          <IconWhatsApp size={18} />
          <span className="hidden sm:inline">Hablar con un asesor</span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </nav>
    </header>
  );
}
