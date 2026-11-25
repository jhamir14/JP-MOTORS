import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { IconBanknote, IconCalendar, IconCheck, IconClock, IconShield, IconTrend, IconWallet } from "@/components/icons";
import { SectionHeading } from "@/components/public/SectionHeading";
import { SelectorMonto } from "./SelectorMonto";

export const metadata: Metadata = {
  title: "Préstamos en efectivo",
  description:
    "Préstamos en efectivo para capital de trabajo y emergencias, con pagos diarios o semanales y evaluación en 24 horas. Tu línea crece con tu puntualidad.",
};

const usos = [
  { Icon: IconWallet, titulo: "Capital de trabajo", texto: "Compra mercadería, insumos o repuestos para tu negocio." },
  { Icon: IconShield, titulo: "Emergencias", texto: "Salud, reparaciones o gastos imprevistos que no pueden esperar." },
  { Icon: IconTrend, titulo: "Crecer tu negocio", texto: "Invierte en herramientas o en ampliar tu puesto de trabajo." },
];

const niveles = [
  { nivel: "Primer préstamo", detalle: "Montos iniciales para conocernos", color: "bg-brand-soft text-brand" },
  { nivel: "Cliente puntual", detalle: "Montos mayores y renovación inmediata", color: "bg-accent-soft text-accent" },
  { nivel: "Cliente preferente", detalle: "Las mejores condiciones y atención prioritaria", color: "bg-gold-soft text-[#8a5d00]" },
];

const beneficios = [
  { Icon: IconClock, texto: "Evaluación en menos de 24 horas" },
  { Icon: IconCalendar, texto: "Cuotas diarias (lun. a sáb.) o semanales" },
  { Icon: IconBanknote, texto: "Desembolso en efectivo o transferencia" },
  { Icon: IconCheck, texto: "Sin boletas de pago ni aval bancario" },
];

export default function PrestamosPage() {
  return (
    <main>
      <section className="border-b border-line-soft bg-surface">
        <div className="container grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-20">
          <div>
            <span className="eyebrow">Préstamos en efectivo</span>
            <h1 className="mt-3 text-[2.2rem] md:text-[3.1rem]">Dinero para tu negocio, cuando lo necesitas</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Préstamos de libre disponibilidad con pagos que acompañan tus ingresos. Si ya eres cliente de Inversiones JP,
              tu historial de pagos te abre montos mayores.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {beneficios.map(({ Icon, texto }) => (
                <li key={texto} className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon size={18} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>
          <SelectorMonto />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <SectionHeading eyebrow="¿Para qué lo puedes usar?" title="Un préstamo para cada necesidad" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {usos.map(({ Icon, titulo, texto }) => (
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

      <section className="bg-surface-2 py-16 md:py-20">
        <div className="container grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <SectionHeading eyebrow="Tu historial cuenta" title="Mientras más puntual, más crece tu línea">
            Cada préstamo que pagas a tiempo mejora tu calificación interna. Así premiamos a quienes confían en nosotros.
          </SectionHeading>
          <ol className="flex flex-col gap-3">
            {niveles.map((n, i) => (
              <li key={n.nivel} className="flex items-center gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${n.color}`}>
                  {i + 1}
                </span>
                <div>
                  <div className="font-bold">{n.nivel}</div>
                  <div className="text-sm text-muted">{n.detalle}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16">
        <div className="container flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-ink p-8 text-white md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-[1.6rem] text-white md:text-[2rem]">Requisitos simples</h2>
            <p className="mt-2 max-w-xl text-white/70">
              DNI vigente, recibo de luz o agua y un celular con WhatsApp. Para montos mayores podemos pedirte un garante.
            </p>
          </div>
          <ButtonLink href="/financiamiento?servicio=PRESTAMO_EFECTIVO" size="lg">Solicitar préstamo</ButtonLink>
        </div>
      </section>
    </main>
  );
}
