/**
 * Configuración pública centralizada del sitio.
 * Todos los valores que antes estaban repetidos en varios archivos viven aquí.
 * Se pueden sobrescribir con variables de entorno (ver `.env.example`).
 */

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== "" ? n : fallback;
};

export const siteConfig = {
  name: "Inversiones JP",
  legalName: "Inversiones Multimarca JP",
  tagline: "Motos, créditos y financiamiento a tu medida",
  description:
    "Inversiones JP: motos Honda nuevas, repuestos originales y créditos directos con cuotas a tu medida en todo el Perú.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es_PE",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51902423015",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "G-C6RTDH3SXY",
  address: {
    name: "Tienda Central",
    lines: ["Av. Los Motores 1234,", "Distrito Financiero, Perú."],
    reference: "A dos cuadras del Óvalo.",
  },
} as const;

export const creditConfig = {
  /** Tasa referencial mensual para el simulador vehicular (2% = 0.02). */
  tasaVehicularMensual: num(process.env.NEXT_PUBLIC_TASA_VEHICULAR_MENSUAL, 0.02),
  plazosVehicularMeses: [6, 12, 18, 24, 36],
  plazoVehicularPorDefecto: 12,
} as const;
