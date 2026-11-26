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
      ...Object.entries(motosLegado).map(([id, slug]) => ({ source: `/motos/${id}`, destination: `/catalogo/${slug}`, permanent: true })),
      { source: "/motos", destination: "/catalogo?linea=motos", permanent: true },
      // Rediseño: todas las líneas viven ahora en /catalogo y la web ya no muestra simulador ni solicitud en línea.
      { source: "/vehiculos/torito-bajaj", destination: "/catalogo?linea=mototaxis", permanent: true },
      { source: "/vehiculos/:slug", destination: "/catalogo/:slug", permanent: true },
      { source: "/vehiculos", destination: "/catalogo?linea=motos", permanent: true },
      { source: "/celulares/:slug", destination: "/catalogo/:slug", permanent: true },
      { source: "/celulares", destination: "/catalogo?linea=celulares", permanent: true },
      { source: "/repuestos", destination: "/catalogo?linea=repuestos", permanent: true },
      { source: "/financiamiento", destination: "/catalogo", permanent: false },
      // La web ya no ofrece préstamos en efectivo: solo financia motos, mototaxis y celulares.
      { source: "/prestamos", destination: "/", permanent: true },
      // Solo ids numéricos: /motos/*.webp son fotos de public/ y no deben redirigirse.
      { source: "/motos/:id(\\d+)", destination: "/catalogo?linea=motos", permanent: true },
    ];
  },
};

export default nextConfig;
