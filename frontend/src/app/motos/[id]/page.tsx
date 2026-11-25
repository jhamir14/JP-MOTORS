import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalButton, buttonClasses } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { getMotoById, motos } from "@/data/motos";
import { formatSoles, formatUsd } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { SimuladorCredito } from "./SimuladorCredito";

type Params = Promise<{ id: string }>;

/** Solo ids enteros positivos ("1"), nunca "1abc" ni "01". */
const parseId = (raw: string) => (/^[1-9]\d*$/.test(raw) ? Number(raw) : NaN);

export const dynamicParams = false; // cualquier id fuera del catálogo responde 404 real

export function generateStaticParams() {
  return motos.map((m) => ({ id: String(m.id) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const moto = getMotoById(parseId((await params).id));
  if (!moto) return { title: "Moto no encontrada" };
  const title = `${moto.marca} ${moto.nombre}`;
  return {
    title,
    description: `${title} desde ${formatSoles(moto.precio)} al contado o en cuotas. ${moto.descripcion}`,
    openGraph: { title, description: moto.descripcion, images: [{ url: moto.imagen, alt: title }] },
    alternates: { canonical: `/motos/${moto.id}` },
  };
}

export default async function MotoDetallePage({ params }: { params: Params }) {
  const moto = getMotoById(parseId((await params).id));
  if (!moto) notFound();

  return (
    <main className="min-h-screen bg-bg">
      <div className="container pt-8 pb-4">
        <Link href="/motos" className="text-[0.9rem] text-muted hover:text-white">← Volver al catálogo</Link>
      </div>

      <div className="container grid grid-cols-[repeat(auto-fit,minmax(min(100%,450px),1fr))] items-center gap-15 pt-10 pb-25">
        {/* Exhibición */}
        <div className="relative flex h-[340px] w-full items-center justify-center rounded-3xl border border-line-soft bg-white/[0.02] p-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.5),0_20px_40px_rgba(0,0,0,0.4)] md:h-[500px]">
          <div className="absolute z-0 h-3/5 w-3/5 bg-accent opacity-15 blur-[120px]" />
          <Image
            src={moto.imagen}
            alt={`Moto ${moto.marca} ${moto.nombre}`}
            fill
            priority
            sizes="(max-width: 768px) 90vw, 560px"
            className="z-[1] object-contain p-10 mix-blend-screen [filter:contrast(1.15)_drop-shadow(0_20px_20px_rgba(0,0,0,0.8))]"
          />
        </div>

        {/* Ficha */}
        <div className="flex flex-col">
          <span className="mb-2 text-[0.85rem] font-extrabold uppercase tracking-[2px] text-accent">Segmento {moto.categoria}</span>
          <h1 className="mb-6 text-[3.5rem] font-black uppercase">{moto.nombre}</h1>
          <p className="mb-8 text-lg">{moto.descripcion}</p>

          <dl className="mb-10 grid grid-cols-2 gap-4">
            {Object.entries(moto.specs).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1 rounded-xl border border-line-soft bg-[rgba(15,17,21,0.5)] p-4">
                <dt className="text-xs font-bold uppercase text-muted">{key}</dt>
                <dd className="text-lg font-extrabold text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.5)_100%)] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-2">
              <span className="text-[0.9rem] font-bold uppercase text-muted">Precio lista contado</span>
              <span className="text-5xl leading-none font-black text-white">{formatSoles(moto.precio)}</span>
              <span className="text-xl font-bold text-muted">USD {formatUsd(moto.precioUsd)}</span>
              <span className="mt-2 text-[0.8rem] font-bold text-accent">* Incluye tarjeta de rodaje y 3 placas.</span>
            </div>

            <div className="flex flex-wrap gap-4">
              <a href="#simulador" className={buttonClasses({ size: "lg" }, "min-w-[200px] flex-[2] font-black")}>
                Cotizar crédito
              </a>
              <ExternalButton
                href={whatsappLink(whatsappMessages.moto(`${moto.marca} ${moto.nombre}`))}
                variant="whatsapp"
                size="lg"
                caps={false} className="min-w-[160px] flex-1"
              >
                <IconWhatsApp /> Escríbenos
              </ExternalButton>
            </div>
          </div>
        </div>
      </div>

      {/* Galería */}
      <section className="border-t border-line-soft py-15">
        <div className="container">
          <h2 className="mb-10 text-center text-[2rem] font-black uppercase">
            Conócela más de <span className="text-accent">cerca</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
            {moto.galeria.map((src, i) => (
              <div key={src} className="group relative h-[250px] overflow-hidden rounded-2xl border border-line-soft bg-white/[0.02]">
                <Image
                  src={src}
                  alt={`${moto.nombre} — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 90vw, 300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <SimuladorCredito modelo={`${moto.marca} ${moto.nombre}`} precio={moto.precio} />
    </main>
  );
}
