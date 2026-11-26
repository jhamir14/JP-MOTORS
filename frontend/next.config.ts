import type { NextConfig } from "next";

/** Enlaces antiguos /motos/<id> (campañas ya publicadas) → nuevas fichas por slug. */
const motosLegado: Record<string, string> = {
  "1": "honda-cb190r",
  "2": "honda-cb125f-twister",
  "3": "honda-navi",
  "4": "honda-cb190r", // duplicado de la id 1 en la web anterior
  "5": "honda-motokar-gl150",
};

/**
 * Fase 9 · Cabeceras de seguridad para todo el sitio. No se usa una CSP completa porque Google Tag Manager /
 * GA4 inyectan scripts de terceros; se limita al menos quién puede incrustar la web (anti-clickjacking).
 * La geolocalización y la cámara quedan solo para el propio sitio (GPS del domicilio y fotos KYC en el panel).
 */
const cabecerasSeguridad = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://formsubmit.co; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      // El panel y las APIs privadas nunca se incrustan ni se indexan.
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Fotos del catálogo (máx. 5 MB) y documentos KYC (máx. 8 MB) subidos desde el panel.
    serverActions: { bodySizeLimit: "9mb" },
  },
  async redirects() {
    return [
      // Dominio anterior: todo se redirige (301) al dominio oficial conservando la ruta, para no perder visitas ni posicionamiento.
      ...["jpmotorshonda.com", "www.jpmotorshonda.com"].map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: "https://inversiones-jp.com/:path*",
        permanent: true,
      })),
      ...Object.entries(motosLegado).map(([id, slug]) => ({ source: `/motos/${id}`, destination: `/catalogo/${slug}`, permanent: true })),
      // Catálogos separados: vehículos en /motos y celulares en /celulares (las fichas siguen en /catalogo/:slug).
      { source: "/vehiculos/torito-bajaj", destination: "/motos?tipo=mototaxis", permanent: true },
      { source: "/vehiculos/:slug", destination: "/catalogo/:slug", permanent: true },
      { source: "/vehiculos", destination: "/motos", permanent: true },
      // Sin punto en el slug: /celulares/*.webp son fotos de public/.
      { source: "/celulares/:slug([a-z0-9-]+)", destination: "/catalogo/:slug", permanent: true },
      { source: "/repuestos", destination: "/motos", permanent: true },
      { source: "/financiamiento", destination: "/motos", permanent: false },
      // La web ya no ofrece préstamos en efectivo: solo financia motos, motocar, toritos y celulares.
      { source: "/prestamos", destination: "/", permanent: true },
      // Solo ids numéricos: /motos/*.webp son fotos de public/ y no deben redirigirse.
      { source: "/motos/:id(\\d+)", destination: "/motos", permanent: true },
    ];
  },
};

export default nextConfig;
