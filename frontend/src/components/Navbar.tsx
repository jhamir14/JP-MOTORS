"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { IconClock, IconWhatsApp } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { mainNav } from "@/lib/nav";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[1000]">
      {/* Franja de contacto (escritorio) */}
      <div className="hidden bg-brand-ink text-[0.8rem] text-white/80 md:block">
        <div className="container flex items-center justify-between py-2">
          <span className="flex items-center gap-2">
            <IconClock size={14} /> {siteConfig.horario}
          </span>
          <a
            href={whatsappLink(whatsappMessages.general())}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold text-white hover:text-[#7ff0c4]"
          >
            <IconWhatsApp size={14} /> {siteConfig.telefonoVisible}
          </a>
        </div>
      </div>

      <nav aria-label="Principal" className="border-b border-line-soft bg-white/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-6 md:h-[72px]">
          <Link href="/" aria-label={`${siteConfig.name} — inicio`}>
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {mainNav.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3.5 py-2 text-[0.92rem] font-semibold transition-colors",
                      active ? "bg-brand-soft text-brand" : "text-fg/80 hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ButtonLink href="/financiamiento" size="sm" className="hidden md:inline-flex">
            Solicitar crédito
          </ButtonLink>
          <ButtonLink href="/financiamiento" size="sm" className="px-3.5 md:hidden">
            Solicitar
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
