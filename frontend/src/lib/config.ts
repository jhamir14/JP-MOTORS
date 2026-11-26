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
  emailContacto: process.env.NEXT_PUBLIC_EMAIL_CONTACTO ?? "contacto@inversiones-jp.com",
  tagline: "Financiamiento de motos, motocar, toritos y celulares",
  description:
    "Inversiones JP: crédito vehicular para motos, motocar y toritos, y celulares en cuotas semanales. Crédito directo, evaluación rápida y pagos diarios, semanales o mensuales.",
  /** Dominio oficial: canonical, sitemap, Open Graph y datos estructurados. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://inversiones-jp.com",
  locale: "es_PE",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51902423015",
  telefonoVisible: "902 423 015",
  horario: "Lun. a sáb. · 9:00 a. m. – 7:00 p. m.",
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "G-C6RTDH3SXY",
  /** Redes sociales oficiales (pie de página y datos estructurados). */
  redes: [
    { id: "facebook", nombre: "Facebook", url: "https://www.facebook.com/profile.php?id=61596640415033" },
    { id: "instagram", nombre: "Instagram", url: "https://www.instagram.com/inversionesjp.pe/" },
    { id: "tiktok", nombre: "TikTok", url: "https://www.tiktok.com/@inversionesjp.pe" },
  ],
  address: {
    name: "Oficina principal",
    lines: ["Santa Anita, Lima"],
    reference: "Atención presencial con cita previa.",
  },
} as const;
