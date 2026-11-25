import type { Metadata } from "next";
import { SectionHeading } from "@/components/public/SectionHeading";
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
      <section className="border-b border-line-soft bg-surface">
        <div className="container py-12 md:py-16">
          <SectionHeading as="h1" eyebrow="Repuestos y accesorios" title="Mantén tu vehículo trabajando">
            Repuestos originales, lubricantes y accesorios de seguridad. Pídelos por WhatsApp y coordinamos la entrega.
          </SectionHeading>
        </div>
      </section>
      <section className="py-10 md:py-14">
        <div className="container">
          <CatalogoRepuestos repuestos={repuestos} qInicial={q} />
        </div>
      </section>
    </main>
  );
}
