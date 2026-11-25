import { extendTailwindMerge } from "tailwind-merge";

// Registrar los tamaños de sombra propios del tema para que no se confundan con colores.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { shadow: [{ shadow: ["card", "lift"] }] } },
});

/**
 * Une clases condicionales y resuelve conflictos de Tailwind (la última gana):
 * cn("px-4 inline-flex", "px-3 hidden") → "px-3 hidden".
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
