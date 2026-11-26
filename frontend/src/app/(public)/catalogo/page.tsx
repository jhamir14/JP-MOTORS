import type { Metadata } from "next";
import Image from "next/image";
import { LINEAS, type LineaId } from "@/lib/catalogo";
import { obtenerCatalogo } from "@/lib/server/catalogo";
import { CatalogoCliente } from "./CatalogoCliente";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Motos, mototaxis, celulares y repuestos nuevos en Inversiones JP. Revisa los modelos y consulta con un asesor por WhatsApp.",
  alternates: { canonical: "/catalogo" },
};

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CatalogoPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, productos] = await Promise.all([searchParams, obtenerCatalogo()]);
  const linea = primero(sp.linea);

  return (
    <main>
      <section className="noche relative isolate overflow-hidden">
        <Image src="/escenas/showroom.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[50%_60%] opacity-45" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-noche/40 via-noche/70 to-noche" />
        <div className="container pt-14 pb-28 md:pt-20 md:pb-36">
          <h1 className="display entrada max-w-3xl text-[2.8rem] text-white md:text-[4.4rem]">Catálogo</h1>
          <p className="entrada mt-5 max-w-xl text-[1.05rem] text-white/70" style={{ "--retraso": "150ms" } as React.CSSProperties}>
            Todos nuestros modelos en un solo lugar. Elige el que necesitas y consulta disponibilidad con un asesor.
          </p>
        </div>
      </section>

      <CatalogoCliente
        productos={productos}
        inicial={{
          linea: LINEAS.some((l) => l.id === linea) ? (linea as LineaId) : "todos",
          q: primero(sp.q),
          orden: primero(sp.orden),
        }}
      />
    </main>
  );
}
