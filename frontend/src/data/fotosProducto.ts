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
  "samsung-galaxy-a36-5g",
  "apple-iphone-16-pro-max",
  "apple-iphone-17",
  "apple-iphone-17-pro",
  "apple-iphone-17-pro-max",
  "apple-iphone-18-pro-max",
  "samsung-galaxy-a17-4g",
  "samsung-galaxy-a27-5g",
  "samsung-galaxy-a54-5g",
  "samsung-galaxy-a57-5g",
  "zte-nubia-neo-3-gt",
  "zte-nubia-air-5g",
  "zte-nubia-neo-5-5g",
  "zte-nubia-focus-2-ultra",
  "zte-nubia-focus-pro-5g",
  "zte-nubia-neo-5-gt-5g",
  "honor-x7d-5g",
  "honor-400-lite-5g",
  "honor-magic-8-lite",
  "honor-400-5g",
  "honor-400-pro-5g",
  "xiaomi-redmi-note-14",
  "xiaomi-redmi-note-14-pro-5g",
  "xiaomi-redmi-note-15-pro-4g",
  "xiaomi-poco-x7-pro",
  "xiaomi-poco-x8-pro",
  "motorola-moto-g56-5g",
  "motorola-moto-g77-5g",
  "motorola-moto-edge-50-fusion",
  "motorola-moto-g86-power",
  "motorola-moto-edge-70-fusion",
  "motorola-moto-edge-50-buds-combo",
] as const;

const FOTOS: Record<string, string> = Object.fromEntries(CELULARES.map((slug) => [slug, `/celulares/modelos/${slug}.webp`]));

export const fotoPorDefecto = (slug: string): string | undefined => FOTOS[slug];
