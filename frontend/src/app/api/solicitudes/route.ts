import { NextResponse } from "next/server";
import { ETIQUETAS_SERVICIO, erroresPorCampo, solicitudCreditoSchema, type SolicitudCredito } from "@/schemas/solicitudCredito";
import { siteConfig } from "@/lib/config";
import { dbConfigurada, sql } from "@/lib/server/db";

/**
 * Recibe la solicitud de la web, la valida en el servidor y:
 *   1. la guarda en PostgreSQL (tabla solicitud_credito) si DATABASE_URL está configurada;
 *   2. avisa por correo a LEADS_EMAIL (vía formsubmit.co) si está configurado.
 * Basta con que uno de los dos canales funcione para no perder la solicitud.
 */

const tipoDocumentoBD = { DNI: "DNI", CE: "CARNET_EXTRANJERIA", Pasaporte: "PASAPORTE" } as const;
const montoONull = (v: string) => (v === "" ? null : Number(v));

function filaSolicitud(d: SolicitudCredito) {
  const esPrestamo = d.servicio === "PRESTAMO_EFECTIVO";
  return {
    servicio: d.servicio,
    producto_interes: esPrestamo ? null : d.productoInteres,
    nombres: d.nombres,
    apellidos: d.apellidos,
    tipo_documento: tipoDocumentoBD[d.tipoDocumento],
    numero_documento: d.numeroDocumento,
    fecha_nacimiento: d.fechaNacimiento,
    estado_civil: d.estadoCivil,
    nivel_educacion: d.nivelEducacion,
    celular: d.celular,
    email: d.correo,
    preferencia_contacto: d.preferenciaContacto,
    departamento: d.departamento,
    provincia: d.provincia,
    distrito: d.distrito,
    situacion_laboral: d.situacionLaboral,
    ingreso_mensual: Number(d.ingresoMensual),
    monto_solicitado: esPrestamo ? montoONull(d.montoSolicitado) : null,
    cuota_inicial: esPrestamo ? null : montoONull(d.montoInicial),
    datos_extra: esPrestamo ? { frecuencia_preferida: d.frecuenciaPago } : {},
    acepta_datos: true,
    origen: "web",
  };
}

async function guardarEnBD(d: SolicitudCredito) {
  const { datos_extra, ...fila } = filaSolicitud(d);
  const db = sql();
  await db`insert into public.solicitud_credito ${db({ ...fila, datos_extra: db.json(datos_extra) })}`;
}

async function enviarCorreo(d: SolicitudCredito, leadsEmail: string) {
  const esPrestamo = d.servicio === "PRESTAMO_EFECTIVO";
  const res = await fetch(`https://formsubmit.co/ajax/${leadsEmail}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: siteConfig.url,
      Referer: `${siteConfig.url}/financiamiento`,
    },
    body: JSON.stringify({
      _subject: `Nueva solicitud: ${ETIQUETAS_SERVICIO[d.servicio]} — ${d.nombres} ${d.apellidos}`,
      _template: "table",
      Servicio: ETIQUETAS_SERVICIO[d.servicio],
      ...(esPrestamo
        ? { "Monto solicitado (S/)": d.montoSolicitado, "Frecuencia preferida": d.frecuenciaPago }
        : { "Producto de interés": d.productoInteres, "Inicial disponible (S/)": d.montoInicial || "—" }),
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
      Actividad: d.situacionLaboral,
      "Ingreso mensual (S/)": d.ingresoMensual,
      "Autoriza datos personales": "Sí",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`formsubmit respondió ${res.status}`);
}

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

  if (!dbConfigurada && !leadsEmail) {
    console.error("[solicitudes] No hay canal configurado: define DATABASE_URL y/o LEADS_EMAIL");
    return NextResponse.json({ ok: false, error: "Servicio no configurado" }, { status: 503 });
  }

  const resultados = await Promise.allSettled([
    dbConfigurada ? guardarEnBD(d) : Promise.reject(new Error("omitido")),
    leadsEmail ? enviarCorreo(d, leadsEmail) : Promise.reject(new Error("omitido")),
  ]);
  const [bd, correo] = resultados;
  if (bd.status === "rejected" && dbConfigurada) console.error("[solicitudes] No se pudo guardar en la base de datos:", bd.reason);
  if (correo.status === "rejected" && leadsEmail) console.error("[solicitudes] No se pudo enviar el correo:", correo.reason);

  if (bd.status === "rejected" && correo.status === "rejected") {
    return NextResponse.json({ ok: false, error: "No pudimos registrar tu solicitud" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
