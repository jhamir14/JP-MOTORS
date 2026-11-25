import Image from "next/image";
import Link from "next/link";
import { IconCheck, IconFacebook, IconInstagram, IconYoutube } from "@/components/icons";
import { siteConfig } from "@/lib/config";

const explorar = [
  { href: "/motos", label: "Catálogo de Motos" },
  { href: "/repuestos", label: "Tienda de Repuestos" },
  { href: "/financiamiento", label: "Créditos y Financiamiento" },
  { href: "/nosotros", label: "Nosotros" },
];

// Páginas legales: se implementan en la Fase 2 (Libro de Reclamaciones es obligatorio antes del go-live).
const soporte = ["Políticas de Privacidad", "Términos y Condiciones", "Libro de Reclamaciones", "Talleres Autorizados"];

const redes = [
  { label: "Facebook", Icon: IconFacebook },
  { label: "YouTube", Icon: IconYoutube },
  { label: "Instagram", Icon: IconInstagram },
];

const colTitle = "mb-3 text-[0.85rem] font-extrabold uppercase tracking-[1px] text-white md:mb-6";

export default function Footer() {
  return (
    <footer className="border-t border-line-soft bg-surface pt-10 pb-8 md:pt-20 md:pb-15">
      <div className="container">
        <div className="mb-15 hidden flex-wrap justify-center gap-8 border-b border-line-soft pb-10 text-[0.85rem] font-bold uppercase md:flex">
          {["Fácil y rápido", "100% confiable", "Crédito directo sin bancos"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <IconCheck size={16} className="text-accent" /> {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 md:gap-12">
          <div className="flex flex-col items-start">
            <Image
              src="/logo-jp.webp"
              alt={`${siteConfig.name} logo`}
              width={480}
              height={465}
              className="mb-5 h-[60px] w-auto"
            />
            <p className="mb-6 hidden text-[0.85rem] md:block">
              Motos Honda, repuestos originales y créditos directos con cuotas a tu medida en todo el Perú.
            </p>
            <div className="flex gap-4">
              {redes.map(({ label, Icon }) => (
                <span key={label} title={`${label} (próximamente)`} className="text-white/70">
                  <Icon size={20} />
                  <span className="sr-only">{label}</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className={colTitle}>Explorar</h4>
            <ul className="flex list-none flex-col gap-2 text-[0.85rem] text-muted md:gap-4">
              {explorar.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={colTitle}>Soporte</h4>
            <ul className="flex list-none flex-col gap-2 text-[0.85rem] text-muted md:gap-4">
              {soporte.map((label) => (
                <li key={label} title="Próximamente">{label}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={colTitle}>Contacto</h4>
            <address className="text-[0.85rem] leading-relaxed not-italic text-muted">
              <strong>{siteConfig.address.name}</strong>
              <br />
              {siteConfig.address.lines.map((l) => (
                <span key={l}>
                  {l}
                  <br />
                </span>
              ))}
              Referencia: {siteConfig.address.reference}
            </address>
          </div>
        </div>

        <div className="mt-15 flex justify-center border-t border-line-soft pt-6 pb-5 text-xs text-muted">
          <span>
            © {siteConfig.legalName} {new Date().getFullYear()}. Todos los derechos reservados.
          </span>
        </div>
      </div>
    </footer>
  );
}
