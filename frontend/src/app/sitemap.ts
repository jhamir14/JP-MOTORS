import type { MetadataRoute } from "next";
import { hrefProducto } from "@/lib/catalogo";
import { siteConfig } from "@/lib/config";
import { obtenerCatalogo } from "@/lib/server/catalogo";

export const revalidate = 3600;

/** Mapa del sitio para Google: páginas públicas y la ficha de cada producto publicado. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const ahora = new Date();
  const absoluta = (u: string) => (/^https?:\/\//.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`);
  const paginas: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/motos`, lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/celulares`, lastModified: ahora, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/cotizar`, lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/nosotros`, lastModified: ahora, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/libro-reclamaciones`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/mis-datos`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const productos = (await obtenerCatalogo()).map((p) => ({
    url: `${base}${hrefProducto(p)}`,
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: p.destacado ? 0.8 : 0.6,
    images: p.imagenes[0] ? [absoluta(p.imagenes[0].url)] : undefined,
  }));
  return [...paginas, ...productos];
}
