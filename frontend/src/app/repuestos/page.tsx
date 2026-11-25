import type { Metadata } from "next";
import { SectionHeading } from "@/components/public/SectionHeading";
import { mockRepuestos } from "@/data/mockRepuestos";
import { CatalogoRepuestos } from "./CatalogoRepuestos";

export const metadata: Metadata = {
  title: "Repuestos y accesorios",
  description: "Lubricantes, llantas, cascos y repuestos originales para tu moto o mototaxi. Haz tu pedido por WhatsApp.",
};

export default function RepuestosPage() {
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
          <CatalogoRepuestos repuestos={mockRepuestos} />
        </div>
      </section>
    </main>
  );
}
