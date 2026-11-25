import type { NextConfig } from "next";

/** Enlaces antiguos /motos/<id> (campañas ya publicadas) → nuevas fichas por slug. */
const motosLegado: Record<string, string> = {
  "1": "honda-cb190r",
  "2": "honda-cb125f-twister",
  "3": "honda-navi",
  "4": "honda-cb190r", // duplicado de la id 1 en la web anterior
  "5": "honda-motokar-gl150",
};

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Fotos del catálogo (máx. 5 MB) y documentos KYC (máx. 8 MB) subidos desde el panel.
    serverActions: { bodySizeLimit: "9mb" },
  },
  async redirects() {
    return [
      ...Object.entries(motosLegado).map(([id, slug]) => ({ source: `/motos/${id}`, destination: `/vehiculos/${slug}`, permanent: true })),
      { source: "/motos", destination: "/vehiculos", permanent: true },
      // La web ya no ofrece préstamos en efectivo: solo financia motos, mototaxis y celulares.
      { source: "/prestamos", destination: "/", permanent: true },
      // Solo ids numéricos: /motos/*.webp son fotos de public/ y no deben redirigirse.
      { source: "/motos/:id(\\d+)", destination: "/vehiculos", permanent: true },
    ];
  },
};

export default nextConfig;
