import { NextResponse } from "next/server";
import { erroresPorCampo, solicitudCreditoSchema } from "@/schemas/solicitudCredito";
import { siteConfig } from "@/lib/config";

/**
 * Recibe la solicitud de crédito de la web, la valida en el servidor y la reenvía por correo.
 * El correo receptor (LEADS_EMAIL) ya no viaja en el JavaScript del navegador.
 * En la Fase 1 este endpoint además guardará la solicitud en la base de datos (modelo SolicitudCredito).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }

  // Honeypot anti-spam: un humano nunca llena este campo oculto.
  if (typeof body === "object" && body && "empresa_web" in body && (body as Record<string, unknown>).empresa_web) {
    return NextResponse.json({ ok: true });
  }

  const parsed = solicitudCreditoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: erroresPorCampo(parsed.error) }, { status: 422 });
  }
  const d = parsed.data;

  const leadsEmail = process.env.LEADS_EMAIL;
  if (!leadsEmail) {
    console.error("[solicitudes] Falta la variable LEADS_EMAIL");
    return NextResponse.json({ ok: false, error: "Servicio no configurado" }, { status: 503 });
  }

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${leadsEmail}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: siteConfig.url,
        Referer: `${siteConfig.url}/financiamiento`,
      },
      body: JSON.stringify({
        _subject: `Nueva solicitud de crédito — ${d.nombres} ${d.apellidos}`,
        _template: "table",
        Nombres: d.nombres,
        Apellidos: d.apellidos,
        Documento: `${d.tipoDocumento} ${d.numeroDocumento}`,
        Celular: d.celular,
        Correo: d.correo,
        "Fecha de nacimiento": d.fechaNacimiento,
        "Estado civil": d.estadoCivil,
        Educación: d.nivelEducacion,
        "Contacto preferido": d.preferenciaContacto,
        Ubicación: `${d.distrito}, ${d.provincia}, ${d.departamento}`,
        "Vehículo de interés": `${d.marcaMoto} ${d.modeloMoto}`,
        "Uso del vehículo": d.usoMoto,
        "Monto inicial (S/)": d.montoInicial,
        "Ingreso mensual (S/)": d.ingresoMensual,
        "Situación laboral": d.situacionLaboral,
        "Autoriza datos personales": "Sí",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`formsubmit respondió ${res.status}`);
  } catch (err) {
    console.error("[solicitudes] No se pudo reenviar la solicitud:", err);
    return NextResponse.json({ ok: false, error: "No pudimos enviar tu solicitud" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
