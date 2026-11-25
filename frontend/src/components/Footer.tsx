import Link from "next/link";
import { IconFacebook, IconInstagram, IconMapPin, IconWhatsApp, IconClock } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const columnas = [
  {
    titulo: "Servicios",
    links: [
      { href: "/prestamos", label: "Préstamos en efectivo" },
      { href: "/vehiculos", label: "Crédito vehicular" },
      { href: "/celulares", label: "Celulares a crédito" },
      { href: "/repuestos", label: "Repuestos y accesorios" },
    ],
  },
  {
    titulo: "Empresa",
    links: [
      { href: "/nosotros", label: "Quiénes somos" },
      { href: "/financiamiento", label: "Solicitar evaluación" },
      { href: "/nosotros#preguntas", label: "Preguntas frecuentes" },
    ],
  },
];

const legales = [
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/libro-reclamaciones", label: "Libro de Reclamaciones" },
];

export default function Footer() {
  return (
    <footer className="bg-brand-ink text-white/75">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-16">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm">
            Financiamos el trabajo y los proyectos de emprendedores peruanos: préstamos en efectivo, vehículos y
            celulares en cuotas a tu medida.
          </p>
          <div className="mt-6 flex gap-3">
            {[
              { label: "Facebook", Icon: IconFacebook },
              { label: "Instagram", Icon: IconInstagram },
            ].map(({ label, Icon }) => (
              <span key={label} title={`${label} (próximamente)`} className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                <Icon size={18} />
                <span className="sr-only">{label}</span>
              </span>
            ))}
          </div>
        </div>

        {columnas.map((col) => (
          <div key={col.titulo}>
            <h2 className="mb-4 text-sm font-bold text-white">{col.titulo}</h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="mb-4 text-sm font-bold text-white">Contacto</h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex gap-2.5">
              <IconWhatsApp size={18} className="mt-0.5 shrink-0 text-[#7ff0c4]" />
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                +51 {siteConfig.telefonoVisible}
              </a>
            </li>
            <li className="flex gap-2.5">
              <IconClock size={18} className="mt-0.5 shrink-0 text-[#7ff0c4]" />
              {siteConfig.horario}
            </li>
            <li className="flex gap-2.5">
              <IconMapPin size={18} className="mt-0.5 shrink-0 text-[#7ff0c4]" />
              <span>
                {siteConfig.address.lines.join(" ")}
                <br />
                <span className="text-white/55">{siteConfig.address.reference}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-3 py-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {siteConfig.legalName}. Todos los derechos reservados.</span>
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
