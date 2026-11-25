import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Card, ExternalButton } from "@/components/ui";
import { IconClock, IconMapPin, IconShield, IconTrend, IconUser, IconWhatsApp } from "@/components/icons";
import { PageHero } from "@/components/public/PageHero";
import { SectionHeading } from "@/components/public/SectionHeading";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Inversiones JP es una empresa de financiamiento para emprendedores peruanos: crédito vehicular (motos y mototaxis) y celulares en cuotas.",
};

const valores = [
  { Icon: IconShield, titulo: "Transparencia", texto: "Te mostramos la cuota, el total a pagar y la TEA antes de firmar. Sin costos escondidos." },
  { Icon: IconUser, titulo: "Cercanía", texto: "Te atiende una persona, no un sistema. Conocemos tu negocio y tu zona." },
  { Icon: IconTrend, titulo: "Crecimiento", texto: "Premiamos la puntualidad con más acceso a crédito y mejores condiciones." },
];

const preguntas = [
  {
    p: "¿Qué es Inversiones JP?",
    r: "Somos una empresa de financiamiento directo. Nacimos vendiendo motos a crédito y hoy financiamos motos, mototaxis y celulares en cuotas. No prestamos dinero en efectivo.",
  },
  {
    p: "¿Revisan centrales de riesgo?",
    r: "Sí, pero no son lo único que miramos. Evaluamos tu actividad, tus ingresos y, si ya eres cliente, tu historial de pagos con nosotros.",
  },
  {
    p: "¿Qué pasa si me atraso en una cuota?",
    r: "Te contactamos para ayudarte a ponerte al día. Los atrasos generan una penalidad diaria que se informa en tu contrato. Si tienes un problema, avísanos antes del vencimiento.",
  },
  {
    p: "¿Puedo pagar por adelantado?",
    r: "Sí. Puedes adelantar cuotas o cancelar tu crédito en cualquier momento.",
  },
];

export default function NosotrosPage() {
  return (
    <main>
      <PageHero
        eyebrow="Quiénes somos"
        title="La financiera del emprendedor peruano"
        imagen="/motos/gallery/gallery-4.webp"
        alt="Cliente junto a su moto nueva"
        posicion="center 30%"
      >
        <p>
          En Inversiones JP financiamos las herramientas que mueven el trabajo diario: la moto o mototaxi para generar
          ingresos y el celular para estar conectado. Te llevas el producto y lo pagas en cuotas.
        </p>
      </PageHero>

      <section className="py-16 md:py-20">
        <div className="container grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-3xl shadow-lift">
              <Image src="/finance_cta.webp" alt="Cliente con su moto en la tienda" fill sizes="(max-width: 768px) 90vw, 560px" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-brand-ink">
              <Image src="/financing_person.webp" alt="Clienta con las llaves de su moto" fill sizes="280px" className="object-cover" />
            </div>
            <div className="showcase relative aspect-square overflow-hidden rounded-3xl">
              <Image src="/motos/nl150.webp" alt="Mototaxi" fill sizes="280px" className="object-cover mix-blend-lighten" />
            </div>
          </div>
          <div className="grid gap-5">
            <Card className="p-6 md:p-8">
              <div className="eyebrow">Misión</div>
              <p className="mt-2 text-[0.95rem]">
                Dar acceso a crédito justo y rápido a trabajadores independientes que la banca tradicional no atiende.
              </p>
            </Card>
            <Card className="p-6 md:p-8">
              <div className="eyebrow">Visión</div>
              <p className="mt-2 text-[0.95rem]">
                Ser la empresa de financiamiento de confianza de los emprendedores de Lima y provincias.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft bg-surface-2 py-16 md:py-20">
        <div className="container">
          <SectionHeading eyebrow="Nuestros valores" title="Cómo trabajamos" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {valores.map(({ Icon, titulo, texto }) => (
              <Card key={titulo} className="p-6">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon size={24} />
                </span>
                <h3 className="mt-5 text-lg">{titulo}</h3>
                <p className="mt-2 text-sm text-muted">{texto}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-28 border-y border-line-soft bg-surface py-16 md:py-20">
        <div className="container grid gap-10 md:grid-cols-[1fr_1.5fr]">
          <SectionHeading eyebrow="Preguntas frecuentes" title="Lo que más nos preguntan" />
          <div className="divide-y divide-line-soft rounded-2xl border border-line-soft">
            {preguntas.map(({ p, r }) => (
              <details key={p} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {p}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container grid gap-5 md:grid-cols-3">
          <Card className="p-6">
            <IconMapPin className="text-brand" />
            <h3 className="mt-4 text-lg">{siteConfig.address.name}</h3>
            <p className="mt-1 text-sm text-muted">{siteConfig.address.lines.join(" ")} · {siteConfig.address.reference}</p>
          </Card>
          <Card className="p-6">
            <IconClock className="text-brand" />
            <h3 className="mt-4 text-lg">Horario de atención</h3>
            <p className="mt-1 text-sm text-muted">{siteConfig.horario}</p>
          </Card>
          <Card className="flex flex-col p-6">
            <IconWhatsApp className="text-whatsapp" />
            <h3 className="mt-4 text-lg">WhatsApp</h3>
            <p className="mt-1 text-sm text-muted">+51 {siteConfig.telefonoVisible}</p>
            <div className="mt-4 flex gap-2">
              <ExternalButton href={whatsappLink(whatsappMessages.general())} variant="whatsapp" size="sm">Escribir</ExternalButton>
              <ButtonLink href="/financiamiento" variant="secondary" size="sm">Solicitar crédito</ButtonLink>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
