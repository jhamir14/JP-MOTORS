import type { Metadata } from "next";
import { ButtonLink, Card, ExternalButton } from "@/components/ui";
import { IconClock, IconMapPin, IconShield, IconTrend, IconUser, IconWhatsApp } from "@/components/icons";
import { SectionHeading } from "@/components/public/SectionHeading";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Inversiones JP es una empresa de financiamiento para emprendedores peruanos: préstamos en efectivo, crédito vehicular y celulares en cuotas.",
};

const valores = [
  { Icon: IconShield, titulo: "Transparencia", texto: "Te mostramos la cuota, el total a pagar y la TEA antes de firmar. Sin costos escondidos." },
  { Icon: IconUser, titulo: "Cercanía", texto: "Te atiende una persona, no un sistema. Conocemos tu negocio y tu zona." },
  { Icon: IconTrend, titulo: "Crecimiento", texto: "Premiamos la puntualidad con más acceso a crédito y mejores condiciones." },
];

const preguntas = [
  {
    p: "¿Qué es Inversiones JP?",
    r: "Somos una empresa de financiamiento directo. Nacimos vendiendo motos a crédito y hoy ofrecemos préstamos en efectivo, crédito vehicular y celulares en cuotas.",
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
      <section className="border-b border-line-soft bg-surface">
        <div className="container grid items-center gap-10 py-12 md:grid-cols-[1.3fr_1fr] md:py-20">
          <div>
            <span className="eyebrow">Quiénes somos</span>
            <h1 className="mt-3 text-[2.2rem] md:text-[3rem]">La financiera del emprendedor peruano</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              En Inversiones JP financiamos las herramientas y el capital que mueven el trabajo diario: la moto o
              mototaxi para generar ingresos, el celular para estar conectado y el efectivo para hacer crecer un negocio.
            </p>
          </div>
          <Card className="grid gap-5 p-6 md:p-8">
            <div>
              <div className="eyebrow">Misión</div>
              <p className="mt-2 text-[0.95rem]">
                Dar acceso a crédito justo y rápido a trabajadores independientes que la banca tradicional no atiende.
              </p>
            </div>
            <div className="border-t border-line-soft pt-5">
              <div className="eyebrow">Visión</div>
              <p className="mt-2 text-[0.95rem]">
                Ser la empresa de financiamiento de confianza de los emprendedores de Lima y provincias.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-16 md:py-20">
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
