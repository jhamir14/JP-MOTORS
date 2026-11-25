import Image from "next/image";
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

const lineas = [
  { titulo: "Motos", detalle: "Honda 0 km", href: "/vehiculos", imagen: "/motos/cb190r.webp", alt: "Moto Honda CB190R", sobreNegro: true },
  { titulo: "Mototaxis", detalle: "Para tu negocio", href: "/vehiculos/torito-bajaj", imagen: "/motos/nl150.webp", alt: "Mototaxi roja", sobreNegro: true },
  { titulo: "Celulares", detalle: "Cuotas semanales", href: "/celulares", imagen: "/celulares/celulares-cuadrado.webp", alt: "Celulares", sobreNegro: false },
  { titulo: "Repuestos", detalle: "Cascos, llantas y más", href: "/repuestos", imagen: "/repuestos/llantas.webp", alt: "Llantas para moto", sobreNegro: true },
];

const galeria = [
  { src: "/motos/gallery/gallery-4.webp", alt: "Cliente junto a su moto", texto: "Tu moto, tu negocio", clase: "col-span-2 row-span-2" },
  { src: "/motos/gallery/gallery-2.webp", alt: "Moto vista desde atrás en la calle", texto: "Lista para la ruta", clase: "" },
  { src: "/motos/nl125.webp", alt: "Mototaxi azul", texto: "Mototaxis", clase: "" },
  { src: "/motos/gallery/gallery-3.webp", alt: "Moto naked roja", texto: "Diseño y potencia", clase: "" },
  { src: "/motos/xr190l.webp", alt: "Moto de aventura", texto: "Para todo terreno", clase: "" },
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
      {/* ───────────── Hero con foto ───────────── */}
      <section className="relative isolate overflow-hidden bg-brand-ink text-white">
        <Image
          src="/hero_bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[60%_center]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,#071d45_0%,rgba(7,29,69,0.85)_38%,rgba(7,29,69,0.25)_70%,rgba(7,29,69,0.6)_100%),radial-gradient(50%_60%_at_0%_100%,rgba(37,99,235,0.35)_0%,transparent_70%)]"
        />
        <div className="container relative grid items-center gap-10 pt-12 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-20 md:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#7ff0c4] backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#2fd39b]" /> Financiamiento para emprendedores
            </span>
            <h1 className="mt-5 text-[2.3rem] leading-[1.08] text-white md:text-[3.4rem]">
              Financiamos tu trabajo
              <br className="hidden md:block" /> y <span className="text-[#7ff0c4]">tus proyectos</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
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

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["/financing_person.webp", "/financing_worker.webp", "/motos/gallery/gallery-4.webp"].map((src) => (
                  <span key={src} className="relative size-11 overflow-hidden rounded-full border-2 border-brand-ink bg-brand">
                    <Image src={src} alt="" fill sizes="44px" className="object-cover object-top" />
                  </span>
                ))}
              </div>
              <p className="text-sm text-white/80">
                <strong className="text-white">Emprendedores que ya trabajan</strong>
                <br />con su moto, mototaxi o celular JP
              </p>
            </div>

            <ul className="mt-8 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
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

      {/* ───────────── Lo que financiamos (franja de fotos) ───────────── */}
      <section aria-label="Lo que financiamos" className="relative z-10 -mt-8 md:-mt-12">
        <div className="container">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {lineas.map((l) => (
              <li key={l.titulo}>
                <Link href={l.href} className="showcase group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/10">
                  <Image
                    src={l.imagen}
                    alt={l.alt}
                    fill
                    sizes="(max-width: 768px) 45vw, 280px"
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${l.sobreNegro ? "mix-blend-lighten" : ""}`}
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 md:p-4 md:pt-12">
                    <span className="block text-base font-bold text-white md:text-lg">{l.titulo}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-white/75">
                      {l.detalle} <IconArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Servicios ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="Nuestros servicios" title="Un solo lugar para financiar lo que necesitas">
            Elige el producto que mejor se ajusta a tu momento. Todos con evaluación rápida y atención personalizada.
          </SectionHeading>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {servicios.map(({ id, titulo, resumen, href, cta, Icon, puntos, etiqueta, imagen }) => (
              <Card key={id} interactive className="flex flex-col">
                <Link href={href} className={`group relative block h-48 overflow-hidden ${imagen.sobreNegro ? "showcase" : "bg-brand-ink"}`}>
                  <Image
                    src={imagen.src}
                    alt={imagen.alt}
                    fill
                    sizes="(max-width: 768px) 90vw, 380px"
                    className={imagen.sobreNegro ? "object-contain p-4 mix-blend-lighten transition-transform duration-500 group-hover:scale-105" : "object-cover transition-transform duration-500 group-hover:scale-105"}
                  />
                  {etiqueta && (
                    <span className="absolute top-3 right-3 rounded-full bg-gold-soft px-2.5 py-1 text-[0.7rem] font-bold text-[#8a5d00]">{etiqueta}</span>
                  )}
                </Link>
                <div className="relative flex flex-1 flex-col p-6 pt-9">
                  <span className="absolute -top-6 left-6 flex size-12 items-center justify-center rounded-xl bg-surface text-brand shadow-lift">
                    <Icon size={24} />
                  </span>
                  <h3 className="text-xl">{titulo}</h3>
                  <p className="mt-2 text-sm text-muted">{resumen}</p>
                  <ul className="mt-4 flex flex-col gap-2 text-sm">
                    {puntos.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <IconCheck size={16} className="shrink-0 text-accent" strokeWidth={2.6} /> {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={href} className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand transition-all hover:gap-2.5">
                    {cta} <IconArrowRight size={16} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Cómo funciona ───────────── */}
      <section className="border-y border-line-soft bg-surface py-16 md:py-24">
        <div className="container grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-brand-ink shadow-lift">
              <Image src="/financing_worker.webp" alt="Cliente feliz con las llaves de su moto nueva" fill sizes="(max-width: 768px) 90vw, 480px" className="object-cover object-top" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-ink/80 to-transparent" />
            </div>
            <div className="absolute -right-2 bottom-8 max-w-[230px] rounded-2xl bg-surface p-4 shadow-lift md:-right-8">
              <div className="flex items-center gap-2 text-sm font-bold text-accent">
                <IconCheck size={18} strokeWidth={3} /> Crédito aprobado
              </div>
              <p className="mt-1 text-xs text-muted">Recibe tu producto y págalo en cuotas que se ajustan a tus ingresos.</p>
            </div>
            <div className="absolute top-6 -left-2 flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lift md:-left-6">
              <IconClock size={14} /> Respuesta en 24 h
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Cómo funciona" title="Tu crédito en 4 pasos">
              Sin colas ni papeleo innecesario. Te acompañamos de principio a fin.
            </SectionHeading>
            <ol className="mt-10 grid gap-6">
              {pasos.map(({ Icon, titulo, texto }, i) => (
                <li key={titulo} className="flex gap-4">
                  <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_8px_20px_rgba(11,59,140,0.25)]">
                    <Icon size={22} />
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="text-lg">{titulo}</h3>
                    <p className="mt-1 text-sm text-muted">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────────── Frecuencias ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container grid items-center gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <div>
            <SectionHeading eyebrow="Pagos flexibles" title="Paga como trabajas">
              Si cobras por día, paga por día. Elegimos contigo la frecuencia que mejor acompaña tus ingresos y te
              recordamos cada cuota por WhatsApp.
            </SectionHeading>
            <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-3xl shadow-lift">
              <Image src="/motos/gallery/gallery-1.webp" alt="Moto estacionada en una calle de la ciudad" fill sizes="(max-width: 768px) 90vw, 460px" className="object-cover" />
              <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-ink backdrop-blur">
                <IconWallet size={14} className="text-accent" /> Yape · Plin · Efectivo
              </span>
            </div>
          </div>
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

      {/* ───────────── Galería ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container">
          <SectionHeading eyebrow="En la calle" title="Hechas para trabajar todos los días" align="center">
            Motos y mototaxis 0 km, listas para salir a trabajar desde el primer día.
          </SectionHeading>
          <div className="mt-10 grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
            {galeria.map((g) => (
              <figure key={g.src} className={`group relative overflow-hidden rounded-2xl bg-brand-ink ${g.clase}`}>
                <Image src={g.src} alt={g.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-sm font-semibold text-white">
                  {g.texto}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Historial + requisitos ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="relative isolate overflow-hidden rounded-3xl bg-brand-ink p-8 text-white md:p-12">
            <Image src="/finance_cta.webp" alt="" fill sizes="(max-width: 768px) 100vw, 700px" className="-z-10 object-cover object-center" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(7,29,69,0.92)_0%,rgba(11,59,140,0.7)_50%,rgba(7,29,69,0.1)_100%)]" />
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

          <Card className="relative overflow-hidden p-8 md:p-10">
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
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_80%_50%,rgba(47,211,155,0.25)_0%,transparent_70%)]" />
        <div className="container relative grid items-center gap-8 py-14 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <span className="eyebrow text-[#7ff0c4]">Empieza hoy</span>
            <h2 className="mt-2 text-[1.9rem] text-white md:text-[2.4rem]">¿Listo para recibir tus llaves?</h2>
            <p className="mt-2 max-w-md text-white/75">Solicita tu evaluación hoy. Es gratis, sin compromiso y te respondemos por WhatsApp.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/financiamiento" size="lg">
                Solicitar evaluación <IconArrowRight size={18} />
              </ButtonLink>
              <ExternalButton href={whatsappLink(whatsappMessages.general())} variant="light" size="lg">
                <IconWhatsApp size={20} className="text-whatsapp" /> WhatsApp
              </ExternalButton>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-[2rem] shadow-lift ring-4 ring-white/10">
            <Image src="/financing_person.webp" alt="Clienta sonriente con las llaves de su moto" fill sizes="340px" className="object-cover" />
          </div>
        </div>
      </section>
    </main>
  );
}
