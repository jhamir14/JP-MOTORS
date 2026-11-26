import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { siteConfig } from "@/lib/config";

/**
 * Envío de correo por SMTP desde el buzón de la empresa (Hostinger Email).
 *
 *   SMTP_PASSWORD  (obligatoria, secreta) contraseña del buzón. Sin ella no se envía nada.
 *   SMTP_USER      buzón que envía (por defecto siteConfig.emailContacto).
 *   SMTP_HOST      por defecto smtp.hostinger.com
 *   SMTP_PORT      por defecto 465 (SSL)
 *   AVISOS_EMAIL   dónde llegan los avisos de nuevas cotizaciones (por defecto el mismo buzón).
 *
 * Al salir del propio buzón, los correos quedan firmados por el SPF/DKIM del dominio y las
 * respuestas de los clientes llegan a la bandeja de siempre.
 */

const usuario = () => process.env.SMTP_USER || siteConfig.emailContacto;
export const correoConfigurado = () => Boolean(process.env.SMTP_PASSWORD);
export const destinoAvisos = () => process.env.AVISOS_EMAIL || usuario();

let transporte: Transporter | null = null;
function obtenerTransporte(): Transporter {
  if (!transporte) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port,
      secure: port === 465,
      auth: { user: usuario(), pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporte;
}

export interface Correo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  responderA?: string;
}

/** Envía un correo. Lanza un error si falla (quien llama decide si es grave). */
export async function enviarCorreo(c: Correo): Promise<void> {
  if (!correoConfigurado()) throw new Error("SMTP_PASSWORD no está configurada");
  await obtenerTransporte().sendMail({
    from: { name: siteConfig.name, address: usuario() },
    to: c.para,
    replyTo: c.responderA,
    subject: c.asunto,
    html: c.html,
    text: c.texto,
  });
}
