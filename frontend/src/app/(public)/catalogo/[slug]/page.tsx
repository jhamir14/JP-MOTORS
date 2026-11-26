import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaProducto, JsonLdProducto, metadataProducto } from "@/components/public/FichaProducto";
import { hrefProducto, lineaDe } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { obtenerCatalogo } from "@/lib/server/catalogo";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

const buscar = async (slug: string) => (await obtenerCatalogo()).find((p) => p.slug === slug) ?? null;

export async function generateStaticParams() {
  return (await obtenerCatalogo()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const producto = await buscar((await params).slug);
  if (!producto) return { title: "Producto no encontrado" };
  return metadataProducto(producto);
}

export default async function ProductoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const catalogo = await obtenerCatalogo();
  const producto = catalogo.find((p) => p.slug === slug);
  if (!producto) notFound();

  const linea = lineaDe(producto).id;
  const relacionados = catalogo
    .filter((p) => p.id !== producto.id && lineaDe(p).id === linea)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado) || Math.abs(a.precio - producto.precio) - Math.abs(b.precio - producto.precio))
    .slice(0, 3);

  return (
    <>
      <JsonLdProducto producto={producto} url={`${siteConfig.url}${hrefProducto(producto)}`} />
      <FichaProducto producto={producto} relacionados={relacionados} />
    </>
  );
}
