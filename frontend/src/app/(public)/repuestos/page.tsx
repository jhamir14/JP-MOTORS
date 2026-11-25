import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/public/PageHero";
import { productosPorCategoria } from "@/lib/server/catalogo";
import { CatalogoRepuestos } from "./CatalogoRepuestos";

export const metadata: Metadata = {
  title: "Repuestos y accesorios",
  description: "Lubricantes, llantas, cascos y repuestos originales para tu moto o mototaxi. Haz tu pedido por WhatsApp.",
};

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RepuestosPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, repuestos] = await Promise.all([searchParams, productosPorCategoria("REPUESTO")]);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  return (
    <main>
      <PageHero
        eyebrow="Repuestos y accesorios"
        title="Mantén tu vehículo trabajando"
        imagen="/repuestos/llanta_offroad.webp"
        alt="Llanta para moto"
        posicion="80% center"
        aside={
          <ul className="grid grid-cols-3 gap-3" aria-label="Destacados">
            {[
              ["/repuestos/casco.webp", "Cascos"],
              ["/repuestos/aceite_sintetico.webp", "Lubricantes"],
              ["/repuestos/cadena.webp", "Transmisión"],
            ].map(([src, t]) => (
              <li key={t} className="showcase relative aspect-[3/4] w-24 overflow-hidden rounded-2xl ring-1 ring-white/15 md:w-32">
                <Image src={src} alt={t} fill sizes="128px" className="object-cover mix-blend-lighten" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-semibold text-white">{t}</span>
              </li>
            ))}
          </ul>
        }
      >
        <p>Repuestos originales, lubricantes y accesorios de seguridad. Pídelos por WhatsApp y coordinamos la entrega.</p>
      </PageHero>
      <section className="py-10 md:py-14">
        <div className="container">
          <CatalogoRepuestos repuestos={repuestos} qInicial={q} />
        </div>
      </section>
    </main>
  );
}
