import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaProducto, JsonLdProducto, metadataProducto } from "@/components/public/FichaProducto";
import { CATEGORIAS_VEHICULO } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { obtenerTasasPublicas, productoPorSlug, productosPorCategoria } from "@/lib/server/catalogo";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

export async function generateStaticParams() {
  return (await productosPorCategoria(...CATEGORIAS_VEHICULO)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const producto = await productoPorSlug((await params).slug, CATEGORIAS_VEHICULO);
  if (!producto) return { title: "Vehículo no encontrado" };
  return metadataProducto(producto, `/vehiculos/${producto.slug}`);
}

export default async function VehiculoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [producto, tasas] = await Promise.all([productoPorSlug(slug, CATEGORIAS_VEHICULO), obtenerTasasPublicas()]);
  if (!producto) notFound();
  return (
    <>
      <JsonLdProducto producto={producto} url={`${siteConfig.url}/vehiculos/${producto.slug}`} />
      <FichaProducto producto={producto} tasas={tasas} volver={{ href: "/vehiculos", label: "Volver a vehículos" }} />
    </>
  );
}
