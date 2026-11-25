import Link from "next/link";
import { ButtonLink, Card, ExternalButton } from "@/components/ui";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFile,
  IconShield,
  IconTrend,
  IconUser,
  IconWallet,
  IconWhatsApp,
} from "@/components/icons";
import { SectionHeading } from "@/components/public/SectionHeading";
import { Simulador } from "@/components/public/Simulador";
import { SelectorVertical } from "@/components/public/SelectorVertical";
import type { Producto } from "@/lib/catalogo";
import { obtenerCatalogo, obtenerTasasPublicas } from "@/lib/server/catalogo";
import { servicios } from "@/data/servicios";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const confianza = [
  { Icon: IconClock, texto: "Respuesta en 24 horas" },
  { Icon: IconCalendar, texto: "Pagos diarios, semanales o mensuales" },
  { Icon: IconWallet, texto: "Paga con Yape, Plin o efectivo" },
];

const pasos = [
  { Icon: IconUser, titulo: "Elige tu producto", texto: "Moto, mototaxi o celular. Simula tu cuota en segundos." },
  { Icon: IconFile, titulo: "Envía tu solicitud", texto: "Solo tu DNI y datos de contacto. Sin boletas de pago ni trámites bancarios." },
  { Icon: IconShield, titulo: "Te evaluamos", texto: "Un asesor revisa tu perfil y te llama o escribe por WhatsApp en menos de 24 h." },
  { Icon: IconTrend, titulo: "Llévatelo y trabaja", texto: "Recibe tu producto y págalo en cuotas. Con buen historial accedes a mejores condiciones." },
];

const frecuencias = [
  { nombre: "Diario", detalle: "Lunes a sábado (sin feriados)", uso: "Mototaxis y trabajo diario" },
  { nombre: "Semanal", detalle: "Cada 7 días", uso: "Celulares" },
  { nombre: "Quincenal", detalle: "Cada 15 días", uso: "Celulares" },
  { nombre: "Mensual", detalle: "Cada 30 días", uso: "Motos y mototaxis" },
];

const requisitos = [
  "DNI vigente (o carné de extranjería)",
  "Recibo de luz o agua de tu domicilio",
  "Celular con WhatsApp activo",
  "Garante para créditos vehiculares",
];

const preguntas = [
  {
    p: "¿Necesito boletas de pago o estar en planilla?",
    r: "No. Evaluamos a trabajadores independientes, mototaxistas, comerciantes y emprendedores según su actividad y capacidad de pago.",
  },
  {
    p: "¿Cuánto demora la aprobación?",
    r: "Normalmente te respondemos en menos de 24 horas hábiles después de recibir tu solicitud completa.",
  },
  {
    p: "¿Cómo pago mis cuotas?",
    r: "Puedes pagar en efectivo con nuestro cobrador, por Yape, Plin o transferencia. Te enviamos un recordatorio por WhatsApp antes de cada vencimiento.",
  },
  {
    p: "¿Prestan dinero en efectivo?",
    r: "No. Inversiones JP financia productos: motos, mototaxis y celulares. Te llevas el producto y lo pagas en cuotas.",
  },
  {
    p: "¿Qué pasa si una cuota vence en feriado?",
    r: "Los domingos y feriados no se cobran: el cronograma de pagos los excluye y la cuota pasa al siguiente día hábil.",
  },
];

export const revalidate = 300;

/** Destacados primero; si no hay suficientes, se completa con el resto de la línea. */
const destacados = (lista: Producto[], n: number) =>
  [...lista].sort((a, b) => Number(b.destacado) - Number(a.destacado)).slice(0, n);

export default async function Home() {
  const [catalogo, tasas] = await Promise.all([obtenerCatalogo(), obtenerTasasPublicas()]);
  const motos = destacados(catalogo.filter((p) => p.categoria === "MOTO_LINEAL"), 3);
  const toritos = destacados(catalogo.filter((p) => p.categoria === "TRIMOVIL_PASAJEROS" || p.categoria === "TRIMOVIL_CARGA"), 3);
  const celulares = destacados(catalogo.filter((p) => p.categoria === "CELULAR"), 4);

  return (
    <main>
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(47,211,155,0.22)_0%,transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgba(37,99,235,0.35)_0%,transparent_70%)]"
        />
        <div className="container relative grid items-center gap-10 pt-12 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-20 md:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#7ff0c4]">
              <span className="size-1.5 rounded-full bg-[#2fd39b]" /> Financiamiento para emprendedores
            </span>
            <h1 className="mt-5 text-[2.3rem] leading-[1.08] text-white md:text-[3.4rem]">
              Financiamos tu trabajo
              <br className="hidden md:block" /> y <span className="text-[#7ff0c4]">tus proyectos</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Motos y mototaxis para trabajar y celulares en cuotas. Crédito directo, sin bancos y con pagos que se
              adaptan a cómo generas tus ingresos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/financiamiento" size="lg">
                Solicitar mi crédito <IconArrowRight size={18} />
              </ButtonLink>
              <ExternalButton href={whatsappLink(whatsappMessages.general())} variant="light" size="lg">
                <IconWhatsApp size={20} className="text-whatsapp" /> Hablar con un asesor
              </ExternalButton>
            </div>

            <ul className="mt-9 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
              {confianza.map(({ Icon, texto }) => (
                <li key={texto} className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#7ff0c4]">
                    <Icon size={16} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <div id="simulador" className="scroll-mt-28 text-fg">
            <Simulador tasas={tasas} />
          </div>
        </div>
      </section>

      {/* ───────────── Servicios ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="Nuestros servicios" title="Un solo lugar para financiar lo que necesitas">
            Elige el producto que mejor se ajusta a tu momento. Todos con evaluación rápida y atención personalizada.
          </SectionHeading>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map(({ id, titulo, resumen, href, cta, Icon, puntos, etiqueta }) => (
              <Card key={id} interactive className="flex flex-col p-6">
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon size={24} />
                  </span>
                  {etiqueta && (
                    <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[0.7rem] font-bold text-[#8a5d00]">{etiqueta}</span>
                  )}
                </div>
                <h3 className="mt-5 text-xl">{titulo}</h3>
                <p className="mt-2 text-sm text-muted">{resumen}</p>
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  {puntos.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <IconCheck size={16} className="shrink-0 text-accent" strokeWidth={2.6} /> {p}
                    </li>
                  ))}
                </ul>
                <Link href={href} className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand hover:gap-2.5 transition-all">
                  {cta} <IconArrowRight size={16} />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Cómo funciona ───────────── */}
      <section className="border-y border-line-soft bg-surface py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="Cómo funciona" title="Tu crédito en 4 pasos" align="center">
            Sin colas ni papeleo innecesario. Te acompañamos de principio a fin.
          </SectionHeading>
          <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
            {pasos.map(({ Icon, titulo, texto }, i) => (
              <li key={titulo} className="relative text-center md:px-2">
                {i < pasos.length - 1 && (
                  <span aria-hidden className="absolute top-7 left-[calc(50%+40px)] hidden h-px w-[calc(100%-80px)] bg-line md:block" />
                )}
                <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_rgba(11,59,140,0.25)]">
                  <Icon size={24} />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg">{titulo}</h3>
                <p className="mt-2 text-sm text-muted">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Frecuencias ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container grid items-center gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <SectionHeading eyebrow="Pagos flexibles" title="Paga como trabajas">
            Si cobras por día, paga por día. Elegimos contigo la frecuencia que mejor acompaña tus ingresos y te
            recordamos cada cuota por WhatsApp.
          </SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            {frecuencias.map((f) => (
              <Card key={f.nombre} className="p-5">
                <div className="text-2xl font-extrabold text-brand">{f.nombre}</div>
                <div className="mt-1 text-sm font-semibold">{f.detalle}</div>
                <div className="mt-3 text-xs text-muted">{f.uso}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Productos a crédito: selector Motos / Toritos / Celulares ───────────── */}
      <section className="bg-surface-2 py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="Productos a crédito" title="¿Qué quieres financiar?">
            Elige una línea y mira la cuota desde la que puedes llevártelo.
          </SectionHeading>
          <div className="mt-8">
            <SelectorVertical motos={motos} toritos={toritos} celulares={celulares} />
          </div>
        </div>
      </section>

      {/* ───────────── Historial + requisitos ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-brand p-8 text-white md:p-12">
            <div aria-hidden className="absolute -right-16 -bottom-20 size-72 rounded-full bg-[#2fd39b]/20 blur-2xl" />
            <span className="eyebrow text-[#7ff0c4]">Clientes puntuales</span>
            <h2 className="mt-3 text-[1.9rem] text-white md:text-[2.3rem]">Tu puntualidad abre más puertas</h2>
            <p className="mt-4 max-w-lg text-white/80">
              Empieza con tu primer producto y, a medida que pagas a tiempo, accedes a mejores condiciones para tu
              siguiente moto, mototaxi o celular.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/vehiculos" variant="light">Ver vehículos</ButtonLink>
              <ButtonLink href="/celulares" variant="primary">Ver celulares</ButtonLink>
            </div>
          </div>

          <Card className="p-8 md:p-10">
            <span className="eyebrow">Requisitos</span>
            <h2 className="mt-3 text-[1.6rem]">Lo que necesitas</h2>
            <ul className="mt-6 flex flex-col gap-4">
              {requisitos.map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <IconCheck size={14} strokeWidth={3} />
                  </span>
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted">Los requisitos pueden variar según el producto y el monto solicitado.</p>
          </Card>
        </div>
      </section>

      {/* ───────────── Preguntas frecuentes ───────────── */}
      <section className="border-t border-line-soft bg-surface py-16 md:py-24">
        <div className="container grid gap-10 md:grid-cols-[1fr_1.5fr]">
          <SectionHeading eyebrow="Preguntas frecuentes" title="Resolvemos tus dudas">
            ¿No encuentras tu respuesta? Escríbenos por WhatsApp y un asesor te atiende.
          </SectionHeading>
          <div className="divide-y divide-line-soft rounded-2xl border border-line-soft">
            {preguntas.map(({ p, r }) => (
              <details key={p} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {p}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-brand transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── CTA final ───────────── */}
      <section className="bg-brand-ink py-14 text-white">
        <div className="container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-[1.7rem] text-white md:text-[2rem]">¿Listo para dar el siguiente paso?</h2>
            <p className="mt-2 text-white/70">Solicita tu evaluación hoy. Es gratis y sin compromiso.</p>
          </div>
          <ButtonLink href="/financiamiento" size="lg">
            Solicitar evaluación <IconArrowRight size={18} />
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
