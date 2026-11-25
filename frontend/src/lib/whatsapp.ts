import { siteConfig } from "./config";
import { formatSoles } from "./format";

/** Construye un enlace wa.me con el mensaje codificado correctamente. */
export function whatsappLink(message: string, phone: string = siteConfig.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const whatsappMessages = {
  general: () => "Hola, quisiera información sobre los créditos y préstamos de Inversiones JP.",
  prestamo: (monto?: number) =>
    monto ? `Hola, quisiera solicitar un préstamo de ${formatSoles(monto)}.` : "Hola, quisiera información sobre los préstamos en efectivo.",
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
  repuesto: (nombre: string) => `Hola, quisiera pedir el repuesto: ${nombre}.`,
};
