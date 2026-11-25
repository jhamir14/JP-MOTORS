import type { Metadata } from "next";
import Image from "next/image";
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
      <section className="relative isolate overflow-hidden bg-brand-ink text-white">
        <Image src="/celulares/celulares-escena.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[30%_center] opacity-60 md:opacity-90" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#071d45_0%,rgba(7,29,69,0.88)_45%,rgba(7,29,69,0.55)_100%)]" />
        <div className="container grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-16">
          <div>
            <span className="eyebrow text-[#7ff0c4]">Celulares a crédito</span>
            <h1 className="mt-3 text-[2.2rem] text-white md:text-[3rem]">Estrena el celular que quieres, pagando por semana</h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Trabajamos con todas las marcas. Elige tu equipo, simula tu cuota y llévatelo con una evaluación rápida.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {ventajas.map((v) => (
                <li key={v} className="flex items-center gap-2.5 text-sm font-medium text-white/90">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[#7ff0c4]">
                    <IconCheck size={14} strokeWidth={3} />
                  </span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-fg">
            <Simulador tasas={tasas} modos={["celular"]} />
          </div>
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
