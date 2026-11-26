import type { Metadata } from "next";
import { obtenerCatalogo, obtenerTasasPublicas } from "@/lib/server/catalogo";
import { Cotizador } from "./Cotizador";

export const metadata: Metadata = {
  title: "Cotiza tu cuota",
  description:
    "Calcula al instante la cuota de tu moto, motocar, torito o celular en Inversiones JP: elige el modelo, la inicial y el plazo, y recibe tu cotización por WhatsApp o correo.",
  alternates: { canonical: "/cotizar" },
};

export default async function CotizarPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const [catalogo, tasas, { producto }] = await Promise.all([obtenerCatalogo(), obtenerTasasPublicas(), searchParams]);
  const inicial = catalogo.find((p) => p.slug === producto)?.slug ?? null;

  return (
    <main>
      <section className="noche relative isolate overflow-hidden">
        <div aria-hidden className="anillo girar-lento pointer-events-none absolute -top-40 -right-40 -z-10 size-[460px] opacity-20 [--grosor:2px]" />
        <div className="container pt-12 pb-28 text-center md:pt-16 md:pb-32">
          <p className="entrada text-sm font-medium text-oro-claro">Cotizador en línea</p>
          <h1 className="display entrada mx-auto mt-4 max-w-3xl text-[2.4rem] text-white md:text-[3.6rem]" style={{ "--retraso": "100ms" } as React.CSSProperties}>
            Calcula tu cuota en segundos
          </h1>
          <p className="entrada mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-white/70" style={{ "--retraso": "200ms" } as React.CSSProperties}>
            Elige el modelo, la inicial y el plazo. Te enviamos la cotización y un asesor te contacta por WhatsApp.
          </p>
        </div>
      </section>
      <Cotizador productos={catalogo} tasas={tasas} slugInicial={inicial} />
    </main>
  );
}
