import type { Metadata } from "next";
import { IconCheck } from "@/components/icons";
import { SectionHeading } from "@/components/public/SectionHeading";
import { Simulador } from "@/components/public/Simulador";
import { obtenerTasasPublicas, productosPorCategoria } from "@/lib/server/catalogo";
import { CatalogoCelulares } from "./CatalogoCelulares";

export const metadata: Metadata = {
  title: "Celulares a crédito",
  description: "iPhone, Samsung, Xiaomi y Honor en cuotas semanales o quincenales, sin boletas de pago. Simula tu cuota y solicítalo en minutos.",
};

const ventajas = [
  "Sin inicial obligatoria",
  "Cuotas semanales o quincenales",
  "Equipos nuevos y con garantía",
  "Entrega el mismo día de la aprobación",
];

export const revalidate = 300;

export default async function CelularesPage() {
  const [celulares, tasas] = await Promise.all([productosPorCategoria("CELULAR"), obtenerTasasPublicas()]);
  return (
    <main>
      <section className="border-b border-line-soft bg-surface">
        <div className="container grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-16">
          <div>
            <span className="eyebrow">Celulares a crédito</span>
            <h1 className="mt-3 text-[2.2rem] md:text-[3rem]">Estrena el celular que quieres, pagando por semana</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Trabajamos con todas las marcas. Elige tu equipo, simula tu cuota y llévatelo con una evaluación rápida.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {ventajas.map((v) => (
                <li key={v} className="flex items-center gap-2.5 text-sm font-medium">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <IconCheck size={14} strokeWidth={3} />
                  </span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <Simulador tasas={tasas} modos={["celular"]} />
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container">
          <SectionHeading eyebrow="Catálogo" title="Modelos disponibles" className="mb-8">
            Precios al contado y cuota desde el plan publicado de cada modelo. ¿Buscas otro modelo? Escríbenos y lo conseguimos.
          </SectionHeading>
          <CatalogoCelulares celulares={celulares} />
        </div>
      </section>
    </main>
  );
}
