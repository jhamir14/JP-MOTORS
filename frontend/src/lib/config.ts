/**
 * Configuración pública centralizada del sitio.
 * Se puede sobrescribir con variables de entorno (ver `.env.example`).
 * Las tasas reales de cada servicio viven en la tabla `tasa_servicio` de la base de datos;
 * estos valores son el respaldo mientras la web pública no lee de la base de datos.
 */

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== "" ? n : fallback;
};

export const siteConfig = {
  name: "Inversiones JP",
  legalName: "Inversiones Multimarca JP",
  tagline: "Créditos y préstamos para emprendedores",
  description:
    "Inversiones JP: préstamos en efectivo, crédito vehicular para motos y mototaxis, y celulares en cuotas semanales. Evaluación rápida y pagos diarios, semanales o mensuales.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es_PE",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51902423015",
  telefonoVisible: "902 423 015",
  horario: "Lun. a sáb. · 9:00 a. m. – 7:00 p. m.",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "G-C6RTDH3SXY",
  address: {
    name: "Oficina principal",
    lines: ["Santa Anita, Lima"],
    reference: "Atención presencial con cita previa.",
  },
} as const;

export const creditConfig = {
  /** Crédito vehicular: tasa referencial mensual (2% = 0.02), cuota fija (francés). */
  tasaVehicularMensual: num(process.env.NEXT_PUBLIC_TASA_VEHICULAR_MENSUAL, 0.02),
  plazosVehicularMeses: [6, 12, 18, 24, 36],
  plazoVehicularPorDefecto: 12,
  /** Celulares: tasa referencial semanal (1.2% = 0.012), cuota fija. */
  tasaCelularSemanal: num(process.env.NEXT_PUBLIC_TASA_CELULAR_SEMANAL, 0.012),
  plazosCelularSemanas: [8, 12, 16, 26, 39, 52],
  plazoCelularPorDefecto: 16,
  /** Préstamos en efectivo: montos de referencia (la tasa se informa en la evaluación). */
  prestamoMontoMin: 100,
  prestamoMontoMax: 5000,
} as const;
