/**
 * Fotos de estudio de los celulares del catálogo (fondo transparente, 900×900, en /public/celulares/modelos).
 * Se usan cuando el producto aún no tiene una foto subida desde el panel: lo que se sube en /admin tiene prioridad.
 */
const CELULARES = [
  "apple-iphone-16",
  "apple-iphone-15-pro",
  "apple-iphone-15",
  "apple-iphone-13",
  "samsung-galaxy-s24-plus",
  "samsung-galaxy-a56",
  "xiaomi-redmi-note-13-pro-5g",
  "xiaomi-redmi-note-15",
  "honor-magic-7-lite",
  "honor-x8c",
] as const;

const FOTOS: Record<string, string> = Object.fromEntries(CELULARES.map((slug) => [slug, `/celulares/modelos/${slug}.webp`]));

export const fotoPorDefecto = (slug: string): string | undefined => FOTOS[slug];
