import { siteConfig } from "./config";
import { formatSoles } from "./format";

/** Construye un enlace wa.me con el mensaje codificado correctamente. */
export function whatsappLink(message: string, phone: string = siteConfig.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Número de WhatsApp del asesor del área de un producto (celulares o motos/motokar/toritos). */
export function whatsappDeArea(producto: { categoria: string }): string {
  return producto.categoria === "CELULAR" ? siteConfig.whatsappAreas.CREDITO_CELULAR : siteConfig.whatsappAreas.CREDITO_VEHICULAR;
}

/** Número del asesor según el servicio de una solicitud (CREDITO_CELULAR, CREDITO_VEHICULAR…); el general si no es de productos. */
export function whatsappDeServicio(servicio: string | null | undefined): string {
  if (servicio === "CREDITO_CELULAR") return siteConfig.whatsappAreas.CREDITO_CELULAR;
  if (servicio === "CREDITO_VEHICULAR") return siteConfig.whatsappAreas.CREDITO_VEHICULAR;
  return siteConfig.whatsappNumber;
}

export const whatsappMessages = {
  general: () => "Hola, quisiera información sobre las motos, motokar, toritos y celulares de Inversiones JP.",
  producto: (nombre: string) => `Hola, vi el ${nombre} en el catálogo de Inversiones JP y quisiera más información.`,
  financiamiento: (nombre: string) =>
    `Hola, vi el ${nombre} en la web de Inversiones JP. ¿Cómo sale en cuotas? Quisiera conocer el financiamiento.`,
  moto: (modelo: string) => `Hola, tengo interés en el crédito vehicular para la ${modelo} que vi en la web.`,
  celular: (modelo: string) => `Hola, quisiera el ${modelo} a crédito. ¿Qué requisitos necesito?`,
  simulacion: (p: { producto: string; inicial: number; plazo: string; cuota: number }) =>
    [
      `Hola, hice una simulación para: ${p.producto}.`,
      `Cuota inicial: ${formatSoles(p.inicial, true)}`,
      `Plazo: ${p.plazo}`,
      `Cuota estimada: ${formatSoles(p.cuota, true)}`,
      "¿Podrían evaluarme?",
    ].join("\n"),
};

export type Plataforma = "android" | "ios" | "escritorio";

export function plataformaDe(userAgent: string): Plataforma {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "escritorio";
}

/**
 * Convierte un enlace wa.me en uno que abre el WhatsApp NORMAL (no WhatsApp Business) cuando el celular tiene ambos:
 *   · Android: intent dirigido al paquete com.whatsapp; si no está instalado, el navegador sigue al wa.me original.
 *   · iPhone: esquema whatsapp:// de la app normal.
 *   · Computadora: wa.me de siempre (WhatsApp Web o de escritorio).
 */
export function enlaceWhatsAppNormal(waMe: string, plataforma: Plataforma): string {
  let url: URL;
  try {
    url = new URL(waMe);
  } catch {
    return waMe;
  }
  if (url.hostname !== "wa.me" || plataforma === "escritorio") return waMe;
  const telefono = url.pathname.replace(/\D/g, "");
  const texto = url.searchParams.get("text") ?? "";
  const consulta = `phone=${telefono}${texto ? `&text=${encodeURIComponent(texto)}` : ""}`;
  if (plataforma === "ios") return `whatsapp://send?${consulta}`;
  return `intent://send/?${consulta}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(waMe)};end`;
}
