import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ExternalButton, buttonClasses } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { getMotoById, motos } from "@/data/motos";
import { formatSoles, formatUsd } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { Simulador } from "@/components/public/Simulador";

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

  const nombre = `${moto.marca} ${moto.nombre}`;

  return (
    <main>
      <div className="container pt-6">
        <Link href="/motos" className="text-sm font-medium text-muted hover:text-brand">← Volver a vehículos</Link>
      </div>

      <section className="container grid items-start gap-8 pt-6 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <div className="flex flex-col gap-6">
          <div className="showcase relative h-[300px] overflow-hidden rounded-3xl md:h-[440px]">
            <Badge tone="dark" className="absolute top-4 left-4 z-[1]">{moto.categoria}</Badge>
            <Image
              src={moto.imagen}
              alt={`Moto ${nombre}`}
              fill
              priority
              sizes="(max-width: 768px) 90vw, 620px"
              className="object-contain p-8 mix-blend-lighten"
            />
          </div>

          <div>
            <span className="eyebrow">{moto.marca}</span>
            <h1 className="mt-2 text-[2.2rem] md:text-[2.8rem]">{moto.nombre}</h1>
            <p className="mt-3 text-lg text-muted">{moto.descripcion}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(moto.specs).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-line-soft bg-surface p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{key}</dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="flex flex-col gap-5 md:sticky md:top-28">
          <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card">
            <div className="text-sm font-semibold text-muted">Precio al contado</div>
            <div className="mt-1 text-[2.4rem] leading-none font-extrabold tabular">{formatSoles(moto.precio)}</div>
            <div className="mt-1 text-sm text-muted tabular">USD {formatUsd(moto.precioUsd)} · incluye tarjeta de rodaje y placas</div>
            <div className="mt-5 flex gap-3">
              <a href="#simulador" className={buttonClasses({}, "flex-1")}>Simular cuotas</a>
              <ExternalButton href={whatsappLink(whatsappMessages.moto(nombre))} variant="outline" className="flex-1">
                <IconWhatsApp size={18} className="text-whatsapp" /> Consultar
              </ExternalButton>
            </div>
          </div>
          <div id="simulador" className="scroll-mt-28">
            <Simulador modos={["vehicular"]} producto={{ nombre, precio: moto.precio }} />
          </div>
        </aside>
      </section>

      {moto.galeria.length > 0 && (
        <section className="border-t border-line-soft bg-surface py-14">
          <div className="container">
            <h2 className="text-[1.8rem]">Galería</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {moto.galeria.map((src, i) => (
                <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
                  <Image
                    src={src}
                    alt={`${moto.nombre} — foto ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 45vw, 280px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
