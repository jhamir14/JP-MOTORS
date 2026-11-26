import Link from "next/link";
import { IconClock, IconMapPin, IconWhatsApp } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { LINEAS } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const legales = [
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/libro-reclamaciones", label: "Libro de Reclamaciones" },
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
            Motos, mototaxis y celulares nuevos con financiamiento directo para quienes trabajan por su cuenta.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Catálogo</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-[0.95rem]">
            {LINEAS.map((l) => (
              <li key={l.id}>
                <Link href={`/catalogo?linea=${l.id}`} className="transition-colors hover:text-oro-claro">{l.nombre}</Link>
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
        <div className="container flex flex-col gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {siteConfig.legalName}. RUC {siteConfig.ruc}.</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {legales.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
