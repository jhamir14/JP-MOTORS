import type { Metadata } from "next";
import { CatalogoMotos } from "./CatalogoMotos";
import { PRECIO_MAXIMO_CATALOGO, getCategoriasConStock, motos } from "@/data/motos";

export const metadata: Metadata = {
  title: "Catálogo de motos",
  description: "Motos Honda nuevas con precio al contado y financiamiento directo. Filtra por categoría, precio y modelo.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function MotosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const precioMax = Number(first(sp.precioMax));

  return (
    <main className="min-h-screen bg-bg">
      <section className="border-b border-line-soft bg-surface py-15">
        <div className="container">
          <h1 className="mb-2 text-5xl font-black uppercase">
            Catálogo de <span className="text-accent [-webkit-text-fill-color:currentColor]">motos</span>
          </h1>
          <p className="text-lg">Modelos Honda con entrega inmediata, al contado o con financiamiento directo.</p>
        </div>
      </section>

      <CatalogoMotos
        motos={motos}
        categorias={getCategoriasConStock()}
        precioMaximo={PRECIO_MAXIMO_CATALOGO}
        inicial={{
          q: first(sp.q),
          categoria: first(sp.categoria),
          precioMax: Number.isFinite(precioMax) && precioMax > 0 ? precioMax : PRECIO_MAXIMO_CATALOGO,
          orden: first(sp.orden),
        }}
      />
    </main>
  );
}
