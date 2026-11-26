import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconClock, IconMapPin, IconWhatsApp } from "@/components/icons";
import { HeroOrbita } from "@/components/public/HeroOrbita";
import { JsonLdEmpresa } from "@/components/public/JsonLdEmpresa";
import { ProductoCard } from "@/components/public/ProductoCard";
import { Revelar } from "@/components/public/Revelar";
import { LINEAS, lineaDe, type LineaId, type Producto } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { obtenerCatalogo } from "@/lib/server/catalogo";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Inversiones JP | Motos, mototaxis y celulares a crédito en Lima" },
  description:
    "Inversiones JP, Santa Anita (Lima): motos, mototaxis y celulares nuevos con financiamiento directo, sin bancos. Mira el catálogo y conversa con un asesor por WhatsApp.",
  alternates: { canonical: "/" },
};

const fotosLinea: Record<LineaId, { src: string; alt: string; texto: string; posicion: string }> = {
  motos: {
    src: "/escenas/repartidora.webp",
    alt: "Repartidora sonriente manejando su moto por una calle de Lima",
    texto: "Para repartir, ir al trabajo o moverte por la ciudad.",
    posicion: "50% 30%",
  },
  mototaxis: {
    src: "/escenas/mototaxista.webp",
    alt: "Mototaxista apoyado en su mototaxi roja al anochecer",
    texto: "De pasajeros o de carga, listas para trabajar desde el primer día.",
    posicion: "40% 40%",
  },
  celulares: {
    src: "/escenas/celular-mercado.webp",
    alt: "Comerciante usando su celular nuevo en un puesto del mercado",
    texto: "Equipos nuevos para vender, cobrar y estar en contacto.",
    posicion: "50% 50%",
  },
};

const pasos = [
  { titulo: "Elige tu modelo", texto: "Revisa el catálogo y encuentra la moto, la mototaxi o el celular que necesitas." },
  { titulo: "Conversa con un asesor", texto: "Por WhatsApp o en nuestra oficina de Santa Anita. Te explicamos los requisitos y resolvemos tus dudas." },
  { titulo: "Llévatelo", texto: "Recibes tu producto nuevo, con garantía y con sus documentos en regla." },
];

const historias = [
  { src: "/escenas/mototaxista.webp", alt: "Mototaxista junto a su mototaxi en una avenida iluminada", titulo: "Para quien trabaja con su mototaxi", clase: "md:col-span-7 md:row-span-2", posicion: "35% 45%" },
  { src: "/escenas/repartidora.webp", alt: "Repartidora manejando su moto", titulo: "Para quien reparte en moto", clase: "md:col-span-5", posicion: "50% 25%" },
  { src: "/escenas/celular-mercado.webp", alt: "Manos de una comerciante con su celular nuevo", titulo: "Para quien vende desde su celular", clase: "md:col-span-5", posicion: "50% 55%" },
];

/** Destacados primero; se reparte entre líneas para que el bloque no quede todo de un solo tipo. */
function seleccion(catalogo: Producto[], n: number) {
  const orden = [...catalogo].sort((a, b) => Number(b.destacado) - Number(a.destacado));
  const elegidos: Producto[] = [];
  const porLinea = new Map<string, number>();
  for (const p of orden) {
    const l = lineaDe(p).id;
    if ((porLinea.get(l) ?? 0) >= 2) continue;
    porLinea.set(l, (porLinea.get(l) ?? 0) + 1);
    elegidos.push(p);
    if (elegidos.length === n) break;
  }
  return elegidos;
}

export default async function Home() {
  const catalogo = await obtenerCatalogo();
  const conteo = (id: LineaId) => catalogo.filter((p) => lineaDe(p).id === id).length;
  const destacados = seleccion(catalogo, 4);

  return (
    <main>
      <JsonLdEmpresa />
      {/* ───────────── Hero ───────────── */}
      <section className="noche relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:120px_100%] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="container grid items-center gap-12 pt-10 pb-16 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pt-16 md:pb-24 lg:gap-16">
          <div className="text-center md:text-left">
            <p className="entrada inline-flex items-center gap-2 text-sm font-medium text-oro-claro" style={{ "--retraso": "100ms" } as React.CSSProperties}>
              <IconMapPin size={16} /> Santa Anita, Lima
            </p>
            <h1 className="display entrada mt-5 text-[2.6rem] text-white sm:text-[3.3rem] lg:text-[4.3rem]" style={{ "--retraso": "200ms" } as React.CSSProperties}>
              Motos, mototaxis y celulares para salir a trabajar.
            </h1>
            <p className="entrada mx-auto mt-6 max-w-[34rem] text-[1.08rem] leading-relaxed text-white/70 md:mx-0" style={{ "--retraso": "350ms" } as React.CSSProperties}>
              Te ayudamos a tener tu moto, tu mototaxi o tu celular nuevo con financiamiento directo, sin bancos de por
              medio. Mira el catálogo y conversa con un asesor.
            </p>
            <div className="entrada mt-9 flex flex-col justify-center gap-3 sm:flex-row md:justify-start" style={{ "--retraso": "500ms" } as React.CSSProperties}>
              <Link href="/catalogo" className="btn-oro">
                Ver el catálogo <IconArrowRight size={18} />
              </Link>
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="btn-claro">
                <IconWhatsApp size={18} /> Escribir por WhatsApp
              </a>
            </div>
          </div>

          <div className="entrada" style={{ "--retraso": "150ms" } as React.CSSProperties}>
            <HeroOrbita />
          </div>
        </div>
      </section>

      {/* ───────────── Líneas ───────────── */}
      <section className="bg-niebla py-20 md:py-28">
        <div className="container">
          <Revelar className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-end">
            <h2 className="display text-[2.2rem] text-tinta md:text-[3.2rem]">Elige por dónde empezar</h2>
            <p className="max-w-md text-[1.02rem] text-pizarra md:justify-self-end">
              Tres líneas, un mismo trato: productos nuevos, asesoría de una persona real y documentos claros.
            </p>
          </Revelar>

          <Revelar retraso={120} className="mt-12">
            <ul className="flex flex-col gap-3 md:h-[520px] md:flex-row">
              {LINEAS.map((l) => {
                const foto = fotosLinea[l.id];
                const total = conteo(l.id);
                return (
                  <li key={l.id} className="group/linea relative md:flex-1 md:transition-[flex-grow] md:duration-700 md:ease-[cubic-bezier(0.2,0.8,0.2,1)] md:hover:flex-[2.4] md:focus-within:flex-[2.4]">
                    <Link
                      href={`/catalogo?linea=${l.id}`}
                      className="relative flex h-[220px] overflow-hidden rounded-[1.75rem] bg-noche focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro md:h-full"
                    >
                      <Image
                        src={foto.src}
                        alt={foto.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/linea:scale-105"
                        style={{ objectPosition: foto.posicion }}
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche via-noche/40 to-transparent" />
                      <span className="relative mt-auto flex w-full items-end justify-between gap-4 p-6">
                        <span>
                          <span className="block text-sm font-medium text-oro-claro tabular">
                            {total} {total === 1 ? "modelo" : "modelos"}
                          </span>
                          <span className="display-sm mt-1 block text-[1.7rem] text-white">{l.nombre}</span>
                          <span className="mt-2 block max-w-xs text-sm text-white/70 md:max-h-0 md:overflow-hidden md:opacity-0 md:transition-[max-height,opacity] md:duration-500 md:group-hover/linea:max-h-20 md:group-hover/linea:opacity-100 md:group-focus-within/linea:max-h-20 md:group-focus-within/linea:opacity-100">
                            {foto.texto}
                          </span>
                        </span>
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition-colors duration-500 group-hover/linea:border-oro group-hover/linea:bg-oro group-hover/linea:text-noche">
                          <IconArrowRight size={18} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Revelar>
        </div>
      </section>

      {/* ───────────── Destacados ───────────── */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <Revelar className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="display text-[2.2rem] text-tinta md:text-[3.2rem]">Los más pedidos</h2>
              <p className="mt-4 max-w-lg text-[1.02rem] text-pizarra">
                Los modelos que más eligen nuestros clientes este mes. Consulta disponibilidad con un asesor.
              </p>
            </div>
            <Link href="/catalogo" className="btn-linea self-start md:self-auto">
              Ver todo el catálogo <IconArrowRight size={18} />
            </Link>
          </Revelar>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {destacados.map((p, i) => (
              <ProductoCard key={p.id} producto={p} indice={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Cómo trabajamos ───────────── */}
      <section className="relative overflow-hidden bg-niebla py-20 md:py-28">
        <div className="container grid items-center gap-14 md:grid-cols-2 lg:gap-20">
          <Revelar className="relative mx-auto w-full max-w-[520px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-noche">
              <Image
                src="/escenas/entrega-llaves.webp"
                alt="Asesor de Inversiones JP entregando las llaves de su moto a un cliente"
                fill
                sizes="(max-width: 768px) 90vw, 520px"
                className="object-cover object-[45%_50%]"
              />
            </div>
            <div aria-hidden className="anillo girar-medio absolute -right-8 -bottom-8 size-40 [--grosor:2px] md:-right-12 md:size-48" />
            <div aria-hidden className="anillo absolute -top-6 -left-6 size-20 opacity-60 [--grosor:1.5px]" />
          </Revelar>

          <div>
            <Revelar>
              <h2 className="display text-[2.2rem] text-tinta md:text-[3.2rem]">Así de simple</h2>
              <p className="mt-4 max-w-md text-[1.02rem] text-pizarra">
                Sin colas ni trámites bancarios. Te atiende una persona que conoce tu trabajo y tu zona.
              </p>
            </Revelar>
            <ol className="relative mt-10 flex flex-col gap-9 border-l border-tinta/10 pl-8">
              {pasos.map((p, i) => (
                <Revelar as="li" key={p.titulo} retraso={i * 140} className="relative">
                  <span className="absolute top-0.5 -left-[3.05rem] flex size-9 items-center justify-center rounded-full bg-noche text-sm font-bold text-oro-claro ring-4 ring-niebla">
                    {i + 1}
                  </span>
                  <h3 className="display-sm text-[1.35rem] text-tinta">{p.titulo}</h3>
                  <p className="mt-2 max-w-md text-pizarra">{p.texto}</p>
                </Revelar>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────────── Historias en la calle ───────────── */}
      <section className="noche py-20 md:py-28">
        <div className="container">
          <Revelar className="max-w-2xl">
            <h2 className="display text-[2.2rem] text-white md:text-[3.2rem]">Hecho para quienes trabajan por su cuenta</h2>
            <p className="mt-5 text-[1.02rem] text-white/65">
              Mototaxistas, repartidores, comerciantes. Financiamos la herramienta con la que generas tus ingresos.
            </p>
          </Revelar>
          <div className="mt-12 grid auto-rows-[260px] gap-4 md:auto-rows-[280px] md:grid-cols-12">
            {historias.map((h, i) => (
              <Revelar key={h.src} retraso={i * 120} className={`group relative overflow-hidden rounded-[1.75rem] bg-marino ${h.clase}`}>
                <figure className="absolute inset-0 m-0">
                  <Image
                    src={h.src}
                    alt={h.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.04]"
                    style={{ objectPosition: h.posicion }}
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-noche/85 via-transparent to-transparent" />
                  <figcaption className="display-sm absolute inset-x-0 bottom-0 p-6 text-[1.25rem] text-white md:p-8 md:text-[1.45rem]">{h.titulo}</figcaption>
                </figure>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Visítanos ───────────── */}
      <section className="relative isolate overflow-hidden bg-noche">
        <Image src="/escenas/showroom.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-center" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050e24_0%,rgba(5,14,36,0.88)_40%,rgba(5,14,36,0.35)_100%)]" />
        <div className="container py-24 md:py-32">
          <Revelar className="max-w-xl">
            <h2 className="display text-[2.4rem] text-white md:text-[3.6rem]">Ven a verlos en persona</h2>
            <p className="mt-5 text-[1.05rem] text-white/70">
              Escríbenos y separa tu cita. Te mostramos los modelos y te explicamos todo con calma.
            </p>
            <ul className="mt-8 flex flex-col gap-3 text-white/80">
              <li className="flex items-center gap-3"><IconMapPin size={18} className="text-oro" /> {siteConfig.address.lines.join(" ")}</li>
              <li className="flex items-center gap-3"><IconClock size={18} className="text-oro" /> {siteConfig.horario}</li>
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="btn-oro">
                <IconWhatsApp size={18} /> Separar una cita
              </a>
              <Link href="/nosotros" className="btn-claro">Conocer Inversiones JP</Link>
            </div>
          </Revelar>
        </div>
      </section>
    </main>
  );
}
