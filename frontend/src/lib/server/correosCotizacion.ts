import "server-only";
import { siteConfig } from "@/lib/config";
import { textoCuota, textoPlazo, type ResultadoCotizacion } from "@/lib/cotizacion";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import type { Correo } from "./correo";

/**
 * Plantillas de los correos del cotizador. HTML con tablas y estilos en línea
 * (lo único que todos los clientes de correo respetan), con versión en texto plano.
 */

export interface DatosCotizacion {
  id?: string;
  nombre: string;
  celular: string;
  correo: string;
  producto: { nombre: string; slug: string; imagen?: string };
  resultado: ResultadoCotizacion;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const base = () => siteConfig.url.replace(/\/$/, "");
const absoluta = (u: string) => (/^https?:\/\//.test(u) ? u : `${base()}${u.startsWith("/") ? "" : "/"}${u}`);

const filas = (r: ResultadoCotizacion) =>
  [
    ["Precio", formatSoles(r.precio)],
    ["Cuota inicial", r.inicial > 0 ? formatSoles(r.inicial) : "Sin inicial"],
    ["Monto a financiar", formatSoles(r.financiado)],
    ["Plazo", textoPlazo(r.numeroCuotas, r.frecuencia)],
  ] as const;

function boton(href: string, texto: string, fondo: string, color: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${fondo};color:${color};text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;margin:4px 6px 4px 0">${esc(texto)}</a>`;
}

function plantilla({ preencabezado, titulo, intro, d, botones, pie }: {
  preencabezado: string; titulo: string; intro: string; d: DatosCotizacion; botones: string; pie: string;
}) {
  const r = d.resultado;
  const imagen = d.producto.imagen
    ? `<img src="${esc(absoluta(d.producto.imagen))}" width="150" height="150" alt="${esc(d.producto.nombre)}" style="display:block;width:150px;height:150px;object-fit:contain;border-radius:16px;background:#0a1633">`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:Arial,Helvetica,sans-serif;color:#0b1530">
<div style="display:none;max-height:0;overflow:hidden">${esc(preencabezado)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">
  <tr><td style="background:#050e24;padding:22px 28px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${esc(absoluta("/marca/logo-inversiones-jp.png"))}" width="44" height="44" alt="" style="display:block;border-radius:50%"></td>
      <td style="padding-left:12px;color:#ffffff;font-size:18px;font-weight:800">${esc(siteConfig.name)}<div style="color:#f6d58a;font-size:12px;font-weight:600">Financiamiento directo</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 28px 8px">
    <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25">${esc(titulo)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#46506a">${intro}</p>
  </td></tr>
  <tr><td style="padding:18px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1633;border-radius:18px">
      <tr>
        ${imagen ? `<td width="166" style="padding:16px 0 16px 16px;vertical-align:middle">${imagen}</td>` : ""}
        <td style="padding:20px;vertical-align:middle;color:#ffffff">
          <div style="font-size:13px;color:#f6d58a;font-weight:700">${esc(d.producto.nombre)}</div>
          <div style="font-size:12px;color:#aab3c9;margin-top:10px">Cuota referencial</div>
          <div style="font-size:30px;font-weight:800;line-height:1.1">${esc(formatSoles(r.cuota, true))}</div>
          <div style="font-size:13px;color:#aab3c9">Pago ${esc(ETIQUETA_FRECUENCIA[r.frecuencia].adjetivo)} · ${esc(textoPlazo(r.numeroCuotas, r.frecuencia))}</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      ${filas(r)
        .map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e6e9f1;color:#5b6580">${esc(k)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #e6e9f1;font-weight:700">${esc(v)}</td></tr>`)
        .join("")}
    </table>
  </td></tr>
  <tr><td style="padding:22px 28px 6px">${botones}</td></tr>
  <tr><td style="padding:14px 28px 26px;font-size:12px;line-height:1.5;color:#7a839b">${pie}</td></tr>
</table>
<p style="font-size:11px;color:#8a93a8;margin:16px 0 0">${esc(siteConfig.legalName)} · RUC ${esc(siteConfig.ruc)} · ${esc(siteConfig.address.lines.join(", "))}</p>
</td></tr></table></body></html>`;
}

const textoResumen = (d: DatosCotizacion) => {
  const r = d.resultado;
  return [
    `Producto: ${d.producto.nombre}`,
    ...filas(r).map(([k, v]) => `${k}: ${v}`),
    `Cuota referencial: ${textoCuota(r)}`,
  ].join("\n");
};

const avisoLegal =
  "Cuota referencial calculada con las tasas vigentes. El monto final se confirma tras la evaluación crediticia; no constituye una aprobación del crédito.";

/** Aviso interno: llega a contacto@ cada vez que alguien cotiza en la web. */
export function correoAvisoInterno(d: DatosCotizacion): Correo {
  const r = d.resultado;
  const saludo = `Hola ${d.nombre}, te escribimos de ${siteConfig.name} por tu cotización del ${d.producto.nombre}: cuota de ${textoCuota(r)} en ${textoPlazo(r.numeroCuotas, r.frecuencia)}${r.inicial > 0 ? ` con inicial de ${formatSoles(r.inicial)}` : " sin inicial"}. ¿Te ayudamos con los requisitos?`;
  const contacto = [
    `<strong>${esc(d.nombre)}</strong>`,
    `WhatsApp: <a href="tel:+51${esc(d.celular)}" style="color:#1c6bff">${esc(d.celular)}</a>`,
    d.correo ? `Correo: <a href="mailto:${esc(d.correo)}" style="color:#1c6bff">${esc(d.correo)}</a>` : "Sin correo",
  ].join("<br>");
  return {
    para: "", // lo completa quien envía (destinoAvisos)
    responderA: d.correo || undefined,
    asunto: `Nueva cotización: ${d.producto.nombre} · ${d.nombre}`,
    html: plantilla({
      preencabezado: `${d.nombre} cotizó ${d.producto.nombre}: ${textoCuota(r)}`,
      titulo: "Nueva cotización desde la web",
      intro: contacto,
      d,
      botones:
        boton(whatsappLink(saludo, `51${d.celular}`), "Responder por WhatsApp", "#25d366", "#ffffff") +
        boton(`${base()}/admin/solicitudes`, "Ver en el panel", "#0b1530", "#ffffff"),
      pie: d.correo
        ? "Si respondes a este correo, la respuesta le llega directamente al cliente."
        : "El cliente no dejó correo: contáctalo por WhatsApp o llamada.",
    }),
    texto: [
      "Nueva cotización desde la web",
      `${d.nombre} · WhatsApp ${d.celular}${d.correo ? ` · ${d.correo}` : ""}`,
      "",
      textoResumen(d),
      "",
      `Responder por WhatsApp: ${whatsappLink(saludo, `51${d.celular}`)}`,
      `Panel: ${base()}/admin/solicitudes`,
    ].join("\n"),
  };
}

/** Copia para el cliente (se envía al cotizar si dejó correo, y desde el panel cuando un asesor la reenvía). */
export function correoCotizacionCliente(d: DatosCotizacion, nota?: string): Correo {
  const r = d.resultado;
  const mensaje = `Hola, soy ${d.nombre}. Recibí mi cotización del ${d.producto.nombre} (${textoCuota(r)}, ${textoPlazo(r.numeroCuotas, r.frecuencia)}) y quiero continuar.`;
  const notaHtml = nota ? `<br><br><span style="display:block;background:#fff8e6;border-left:3px solid #e7b24a;padding:10px 12px;border-radius:8px;color:#0b1530">${esc(nota).replace(/\n/g, "<br>")}</span>` : "";
  return {
    para: d.correo,
    responderA: siteConfig.emailContacto,
    asunto: `Tu cotización: ${d.producto.nombre} · ${siteConfig.name}`,
    html: plantilla({
      preencabezado: `Tu cuota referencial: ${textoCuota(r)} en ${textoPlazo(r.numeroCuotas, r.frecuencia)}`,
      titulo: `Hola ${d.nombre.split(" ")[0]}, esta es tu cotización`,
      intro: `Gracias por cotizar con nosotros. Un asesor revisará tu solicitud y te contactará por WhatsApp. Si tienes dudas, responde a este correo.${notaHtml}`,
      d,
      botones:
        boton(whatsappLink(mensaje), "Continuar por WhatsApp", "#e7b24a", "#050e24") +
        boton(`${base()}/catalogo/${d.producto.slug}`, "Ver el producto", "#0b1530", "#ffffff"),
      pie: avisoLegal,
    }),
    texto: [
      `Hola ${d.nombre}, esta es tu cotización en ${siteConfig.name}:`,
      ...(nota ? ["", nota] : []),
      "",
      textoResumen(d),
      "",
      `Continúa por WhatsApp: ${whatsappLink(mensaje)}`,
      "",
      avisoLegal,
    ].join("\n"),
  };
}
