import Link from "next/link";
import { IconClock, IconFacebook, IconInstagram, IconMapPin, IconTikTok, IconWhatsApp } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { BotonConfigurarCookies } from "@/components/ConsentimientoCookies";
import { LINEAS, hrefLinea } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const iconoRed = { facebook: IconFacebook, instagram: IconInstagram, tiktok: IconTikTok } as const;

const legales = [
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/libro-reclamaciones", label: "Libro de Reclamaciones" },
  { href: "/mis-datos", label: "Eliminar mis datos" },
];

export default function Footer() {
  return (
    <footer className="noche relative isolate overflow-hidden text-white/70">
      {/* Anillo dorado del logotipo, recortado en la esquina */}
      <div aria-hidden className="anillo girar-lento pointer-events-none absolute -right-40 -bottom-56 -z-10 size-[520px] opacity-25 [--grosor:2px]" />

      <div className="container grid gap-12 pt-16 pb-12 md:grid-cols-[1.5fr_1fr_1fr_1.3fr] md:pt-20">
        <div>
          <Logo tone="light" size={64} />
          <p className="mt-6 max-w-xs text-[0.95rem] leading-relaxed">
            Motos, motokar, toritos y celulares nuevos con financiamiento directo para quienes trabajan por su cuenta.
          </p>
          <ul aria-label="Redes sociales" className="mt-6 flex gap-3">
            {siteConfig.redes.map((r) => {
              const Icono = iconoRed[r.id];
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${siteConfig.name} en ${r.nombre}`}
                    className="flex size-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-oro hover:bg-oro hover:text-noche"
                  >
                    <Icono size={20} />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Catálogo</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-[0.95rem]">
            {LINEAS.map((l) => (
              <li key={l.id}>
                <Link href={hrefLinea(l.id)} className="transition-colors hover:text-oro-claro">{l.nombre}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Empresa</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-[0.95rem]">
            <li><Link href="/nosotros" className="transition-colors hover:text-oro-claro">Quiénes somos</Link></li>
            <li><Link href="/nosotros#preguntas" className="transition-colors hover:text-oro-claro">Preguntas frecuentes</Link></li>
            <li><Link href="/libro-reclamaciones" className="transition-colors hover:text-oro-claro">Libro de Reclamaciones</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Contacto</h2>
          <ul className="mt-4 flex flex-col gap-3.5 text-[0.95rem]">
            <li className="flex gap-3">
              <IconWhatsApp size={18} className="mt-0.5 shrink-0 text-oro" />
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                +51 {siteConfig.telefonoVisible}
              </a>
            </li>
            <li className="flex gap-3">
              <IconClock size={18} className="mt-0.5 shrink-0 text-oro" />
              {siteConfig.horario}
            </li>
            <li className="flex gap-3">
              <IconMapPin size={18} className="mt-0.5 shrink-0 text-oro" />
              <span>
                {siteConfig.address.lines.join(" ")}
                <br />
                <span className="text-white/50">{siteConfig.address.reference}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-3 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-xs text-white/50 md:flex-row md:items-center md:justify-between md:pb-6">
          <span>© {new Date().getFullYear()} {siteConfig.legalName}. RUC {siteConfig.ruc}.</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {legales.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
              </li>
            ))}
            <li>
              <BotonConfigurarCookies className="cursor-pointer transition-colors hover:text-white" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
