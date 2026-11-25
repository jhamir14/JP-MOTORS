import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaProducto, JsonLdProducto, metadataProducto } from "@/components/public/FichaProducto";
import { siteConfig } from "@/lib/config";
import { obtenerTasasPublicas, productoPorSlug, productosPorCategoria } from "@/lib/server/catalogo";

const CELULARES = ["CELULAR"] as const;

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

export async function generateStaticParams() {
  return (await productosPorCategoria("CELULAR")).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const producto = await productoPorSlug((await params).slug, CELULARES);
  if (!producto) return { title: "Celular no encontrado" };
  return metadataProducto(producto, `/celulares/${producto.slug}`);
}

export default async function CelularPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [producto, tasas] = await Promise.all([productoPorSlug(slug, CELULARES), obtenerTasasPublicas()]);
  if (!producto) notFound();
  return (
    <>
      <JsonLdProducto producto={producto} url={`${siteConfig.url}/celulares/${producto.slug}`} />
      <FichaProducto producto={producto} tasas={tasas} volver={{ href: "/celulares", label: "Volver a celulares" }} />
    </>
  );
}
