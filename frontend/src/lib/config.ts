/**
 * Configuración pública centralizada del sitio.
 * Se puede sobrescribir con variables de entorno (ver `.env.example`).
 * Las tasas de cada servicio y los planes de crédito se administran desde el panel (/admin)
 * y viven en las tablas `tasa_servicio` y `plan_credito`.
 */

export const siteConfig = {
  name: "Inversiones JP",
  legalName: "Inversiones Multimarca JP",
  /** RUC de la razón social (se muestra en el Libro de Reclamaciones y páginas legales). */
  ruc: process.env.NEXT_PUBLIC_RUC ?? "",
  emailContacto: process.env.NEXT_PUBLIC_EMAIL_CONTACTO ?? "contacto@jpmotorshonda.com",
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
  /** Préstamos en efectivo: montos de referencia (la tasa se informa en la evaluación). */
  prestamoMontoMin: 100,
  prestamoMontoMax: 5000,
} as const;
