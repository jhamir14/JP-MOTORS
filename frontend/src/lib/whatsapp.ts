import { siteConfig } from "./config";

/** Construye un enlace wa.me con el mensaje codificado correctamente. */
export function whatsappLink(message: string, phone: string = siteConfig.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const whatsappMessages = {
  general: () => "Hola, quisiera asesoramiento para comprar una moto.",
  moto: (modelo: string) => `Hola, tengo interés en comprar la moto ${modelo} que vi en la web.`,
  simulacion: (p: { modelo: string; inicial: number; plazo: number; cuota: number }) =>
    [
      `Hola, he realizado una simulación para la moto ${p.modelo}.`,
      `Cuota inicial: S/ ${p.inicial.toFixed(2)}`,
      `Plazo: ${p.plazo} meses`,
      `Cuota mensual estimada: S/ ${p.cuota.toFixed(2)}`,
      "¿Podrían evaluarme?",
    ].join("\n"),
  repuesto: (nombre: string) => `Hola, quisiera pedir el repuesto: ${nombre}.`,
};
