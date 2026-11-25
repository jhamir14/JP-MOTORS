/**
 * Configuración pública centralizada del sitio.
 * Se puede sobrescribir con variables de entorno (ver `.env.example`).
 * Las tasas de cada servicio y los planes de crédito se administran desde el panel (/admin)
 * y viven en las tablas `tasa_servicio` y `plan_credito`.
 */

export const siteConfig = {
  name: "Inversiones JP",
  legalName: "Inversiones Multimarca JP",
  /** RUC de la empresa (Libro de Reclamaciones y páginas legales). Se puede sobrescribir con NEXT_PUBLIC_RUC. */
  ruc: process.env.NEXT_PUBLIC_RUC || "10479269217",
  emailContacto: process.env.NEXT_PUBLIC_EMAIL_CONTACTO ?? "contacto@jpmotorshonda.com",
  tagline: "Financiamiento de motos, mototaxis y celulares",
  description:
    "Inversiones JP: crédito vehicular para motos y mototaxis, y celulares en cuotas semanales. Crédito directo, evaluación rápida y pagos diarios, semanales o mensuales.",
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
