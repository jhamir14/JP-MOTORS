import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconClock, IconMapPin, IconWhatsApp } from "@/components/icons";
import { Revelar } from "@/components/public/Revelar";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Inversiones JP es una empresa de Santa Anita, Lima, que financia motos, mototaxis y celulares para trabajadores independientes y emprendedores.",
  alternates: { canonical: "/nosotros" },
};

const valores = [
  { titulo: "Transparencia", texto: "Te explicamos todas las condiciones antes de firmar. Sin letras pequeñas ni costos escondidos." },
  { titulo: "Cercanía", texto: "Te atiende una persona, no un sistema. Conocemos tu negocio, tu zona y cómo generas tus ingresos." },
  { titulo: "Crecimiento", texto: "Cuando cumples, te abrimos más puertas: tu buen historial con nosotros cuenta para lo que viene." },
];

const preguntas = [
  {
    p: "¿Qué es Inversiones JP?",
    r: "Somos una empresa de financiamiento directo. Nacimos vendiendo motos a crédito y hoy financiamos motos, mototaxis y celulares. No prestamos dinero en efectivo.",
  },
  {
    p: "¿Necesito boletas de pago o estar en planilla?",
    r: "No. Atendemos a trabajadores independientes, mototaxistas, comerciantes y emprendedores. Evaluamos tu actividad y tu capacidad de pago.",
  },
  {
    p: "¿Qué documentos necesito?",
    r: "DNI vigente (o carné de extranjería), un recibo de luz o agua de tu domicilio y un celular con WhatsApp. Para vehículos pedimos además un garante.",
  },
  {
    p: "¿Revisan centrales de riesgo?",
    r: "Sí, pero no son lo único que miramos. También consideramos tu trabajo y, si ya eres cliente, tu historial con nosotros.",
  },
  {
    p: "¿Puedo ver los modelos en persona?",
    r: "Sí. Escríbenos por WhatsApp para separar una cita en nuestra oficina de Santa Anita y te mostramos los modelos disponibles.",
  },
];

export default function NosotrosPage() {
  return (
    <main>
      {/* ───────────── Hero ───────────── */}
      <section className="noche relative isolate overflow-hidden">
        <div className="container grid items-center gap-12 pt-10 pb-20 md:grid-cols-[1.25fr_1fr] md:gap-16 md:pt-16 md:pb-28">
          <div>
            <p className="entrada text-sm font-medium text-oro-claro">Quiénes somos</p>
            <h1 className="display entrada mt-5 text-[2.5rem] text-white md:text-[2.9rem] lg:text-[3.5rem]" style={{ "--retraso": "120ms" } as React.CSSProperties}>
              Financiamos la herramienta con la que trabajas.
            </h1>
            <p className="entrada mt-6 max-w-lg text-[1.08rem] leading-relaxed text-white/70" style={{ "--retraso": "260ms" } as React.CSSProperties}>
              En Inversiones JP ayudamos a mototaxistas, repartidores y comerciantes a tener su moto, su mototaxi o su
              celular nuevo, sin depender de un banco.
            </p>
          </div>

          <div className="entrada relative mx-auto w-full max-w-[480px]" style={{ "--retraso": "200ms" } as React.CSSProperties}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[2rem] bg-marino">
              <Image
                src="/escenas/entrega-llaves.webp"
                alt="Asesor de Inversiones JP entregando las llaves a un cliente"
                fill
                priority
                sizes="(max-width: 768px) 90vw, 480px"
                className="object-cover object-[40%_50%]"
              />
            </div>
            <div aria-hidden className="absolute -inset-3 rounded-t-full rounded-b-[2.4rem] border border-oro/50 md:-inset-4" />
            <div className="flotar absolute -bottom-6 -left-4 flex items-center gap-3 rounded-full bg-white py-2 pr-5 pl-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] md:-left-10">
              <Image src="/marca/logo-inversiones-jp.webp" alt="" width={44} height={44} className="rounded-full" />
              <span className="text-sm leading-tight font-semibold text-tinta">
                Atención personal
                <span className="block text-xs font-normal text-pizarra">en Santa Anita, Lima</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Historia ───────────── */}
      <section className="overflow-hidden bg-white py-20 md:py-28">
        <div className="container grid items-center gap-12 md:grid-cols-[1fr_1.1fr] md:gap-20">
          <Revelar className="relative order-2 md:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-noche">
              <Image
                src="/escenas/mototaxista.webp"
                alt="Mototaxista sonriente junto a su mototaxi"
                fill
                sizes="(max-width: 768px) 90vw, 560px"
                className="object-cover object-[35%_45%]"
              />
            </div>
            <div aria-hidden className="anillo absolute -top-8 -right-6 size-28 opacity-80 [--grosor:2px]" />
          </Revelar>
          <Revelar retraso={120} className="order-1 md:order-2">
            <p className="display-sm text-[1.6rem] text-tinta md:text-[2.15rem]">
              Empezamos vendiendo motos a crédito. Hoy también financiamos mototaxis y celulares, siempre con la misma
              idea: que el trabajo de cada día te permita pagar lo que te ayuda a trabajar.
            </p>
            <p className="mt-6 max-w-lg text-pizarra">
              Atendemos a quienes la banca tradicional suele dejar de lado: trabajadores independientes, transportistas y
              pequeños comerciantes de Lima y provincias.
            </p>
          </Revelar>
        </div>
      </section>

      {/* ───────────── Misión y visión ───────────── */}
      <section className="noche py-20 md:py-28">
        <div className="container grid gap-12 md:grid-cols-2 md:gap-20">
          <Revelar className="border-t border-oro/50 pt-8">
            <h2 className="text-sm font-semibold text-oro-claro">Misión</h2>
            <p className="display-sm mt-4 text-[1.5rem] text-white md:text-[1.9rem]">
              Dar acceso a crédito justo y rápido a trabajadores independientes que la banca tradicional no atiende.
            </p>
          </Revelar>
          <Revelar retraso={140} className="border-t border-oro/50 pt-8">
            <h2 className="text-sm font-semibold text-oro-claro">Visión</h2>
            <p className="display-sm mt-4 text-[1.5rem] text-white md:text-[1.9rem]">
              Ser la empresa de financiamiento de confianza de los emprendedores de Lima y provincias.
            </p>
          </Revelar>
        </div>
      </section>

      {/* ───────────── Valores ───────────── */}
      <section className="bg-niebla py-20 md:py-28">
        <div className="container">
          <Revelar>
            <h2 className="display text-[2.2rem] text-tinta md:text-[3.2rem]">Cómo trabajamos</h2>
          </Revelar>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {valores.map((v, i) => (
              <Revelar
                key={v.titulo}
                retraso={i * 120}
                className="group relative overflow-hidden rounded-[1.75rem] bg-white p-8 ring-1 ring-tinta/[0.06] transition-colors duration-500 hover:bg-noche"
              >
                <div aria-hidden className="anillo absolute -top-16 -right-16 size-40 opacity-30 transition-[opacity,transform] duration-700 [--grosor:1.5px] group-hover:scale-110 group-hover:opacity-80" />
                <h3 className="display-sm relative text-[1.5rem] text-tinta transition-colors duration-500 group-hover:text-white">{v.titulo}</h3>
                <p className="relative mt-4 text-pizarra transition-colors duration-500 group-hover:text-white/70">{v.texto}</p>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Preguntas frecuentes ───────────── */}
      <section id="preguntas" className="scroll-mt-24 bg-white py-20 md:py-28">
        <div className="container grid gap-12 md:grid-cols-[1fr_1.5fr]">
          <Revelar>
            <h2 className="display text-[2.2rem] text-tinta md:text-[3rem]">Preguntas frecuentes</h2>
            <p className="mt-5 max-w-sm text-pizarra">¿No encuentras tu respuesta? Escríbenos y un asesor te atiende.</p>
            <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="btn-linea mt-8">
              <IconWhatsApp size={18} /> Preguntar por WhatsApp
            </a>
          </Revelar>
          <Revelar retraso={120} className="divide-y divide-tinta/10 border-y border-tinta/10">
            {preguntas.map(({ p, r }) => (
              <details key={p} className="group py-2 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.08rem] font-semibold text-tinta">
                  {p}
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-tinta/15 transition-[background-color,border-color,transform] duration-500 group-open:rotate-[135deg] group-open:border-oro group-open:bg-oro">
                    <span className="absolute h-px w-3.5 bg-tinta" />
                    <span className="absolute h-3.5 w-px bg-tinta" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-5 text-pizarra motion-safe:animate-[aparecer_0.5s_ease-out]">{r}</p>
              </details>
            ))}
          </Revelar>
        </div>
      </section>

      {/* ───────────── Contacto ───────────── */}
      <section id="contacto" className="relative isolate overflow-hidden bg-noche">
        <Image src="/escenas/showroom.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-[70%_50%] opacity-60" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-noche via-noche/85 to-noche/40" />
        <div className="container grid gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:items-end md:py-28">
          <Revelar>
            <h2 className="display text-[2.3rem] text-white md:text-[3.4rem]">Conversemos</h2>
            <p className="mt-5 max-w-md text-white/70">Te atendemos por WhatsApp o en nuestra oficina, con cita previa.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="btn-oro">
                <IconWhatsApp size={18} /> +51 {siteConfig.telefonoVisible}
              </a>
              <Link href="/catalogo" className="btn-claro">
                Ver el catálogo <IconArrowRight size={18} />
              </Link>
            </div>
          </Revelar>
          <Revelar retraso={140}>
            <ul className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-noche/60 p-7 text-white/80 backdrop-blur-md">
              <li className="flex gap-3">
                <IconMapPin size={20} className="mt-0.5 shrink-0 text-oro" />
                <span>
                  {siteConfig.address.name}: {siteConfig.address.lines.join(" ")}
                  <span className="block text-sm text-white/50">{siteConfig.address.reference}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <IconClock size={20} className="mt-0.5 shrink-0 text-oro" /> {siteConfig.horario}
              </li>
            </ul>
          </Revelar>
        </div>
      </section>
    </main>
  );
}
