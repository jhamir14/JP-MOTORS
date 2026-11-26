import { NextResponse } from "next/server";
import { erroresPorCampo } from "@/schemas/solicitudCredito";
import { TIPO_DOC_BD, reclamoSchema, type Reclamo } from "@/schemas/reclamo";
import { siteConfig } from "@/lib/config";
import { dbConfigurada, sql } from "@/lib/server/db";
import { ipDe, permitirIntentoCompartido } from "@/lib/server/limite";

/**
 * Registra una hoja del Libro de Reclamaciones: la guarda en la tabla `reclamo` (con código
 * correlativo LR-AAAA-NNNNNN), avisa por correo a LEADS_EMAIL y devuelve el código al consumidor.
 * Sin base de datos no se puede emitir un código válido, por eso aquí la BD es obligatoria.
 */

async function avisarPorCorreo(r: Reclamo, codigo: string, leadsEmail: string) {
  const res = await fetch(`https://formsubmit.co/ajax/${leadsEmail}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: siteConfig.url, Referer: `${siteConfig.url}/libro-reclamaciones` },
    body: JSON.stringify({
      _subject: `Libro de Reclamaciones: ${r.tipo} ${codigo}`,
      _template: "table",
      Código: codigo,
      Tipo: r.tipo,
      Consumidor: `${r.nombres} ${r.apellidos}`,
      Documento: `${r.tipoDocumento} ${r.numeroDocumento}`,
      Teléfono: r.telefono,
      Correo: r.email,
      "Bien contratado": `${r.bienTipo}: ${r.bienDescripcion}${r.bienMonto ? ` (S/ ${r.bienMonto})` : ""}`,
      Detalle: r.detalle,
      Pedido: r.pedido,
      Plazo: "Responder en un máximo de 15 días hábiles",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`formsubmit respondió ${res.status}`);
}

export async function POST(request: Request) {
  if (!(await permitirIntentoCompartido(`reclamo:${ipDe(request.headers)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Inténtalo más tarde o escríbenos por WhatsApp." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }
  if (typeof body === "object" && body && (body as Record<string, unknown>).empresa_web) {
    return NextResponse.json({ ok: true, codigo: "LR-0000-000000" });
  }

  const parsed = reclamoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: erroresPorCampo(parsed.error) }, { status: 422 });
  const r = parsed.data;

  if (!dbConfigurada) {
    console.error("[reclamos] Falta DATABASE_URL: no se puede registrar el reclamo");
    return NextResponse.json({ ok: false, error: "Servicio no disponible" }, { status: 503 });
  }

  let codigo: string;
  let fecha: Date;
  try {
    const [fila] = await sql()<{ codigo: string; created_at: Date }[]>`
      insert into public.reclamo (tipo, nombres, apellidos, tipo_documento, numero_documento, domicilio, telefono, email,
                                  menor_de_edad, apoderado, bien_tipo, bien_monto, bien_descripcion, detalle, pedido, acepta_datos)
      values (${r.tipo}, ${r.nombres}, ${r.apellidos}, ${TIPO_DOC_BD[r.tipoDocumento]}, ${r.numeroDocumento}, ${r.domicilio},
              ${r.telefono}, ${r.email}, ${r.menorDeEdad}, ${r.menorDeEdad ? r.apoderado : null}, ${r.bienTipo},
              ${r.bienMonto === "" ? null : r.bienMonto}, ${r.bienDescripcion}, ${r.detalle}, ${r.pedido}, true)
      returning codigo, created_at`;
    codigo = fila.codigo;
    fecha = fila.created_at;
  } catch (e) {
    console.error("[reclamos] No se pudo guardar:", e);
    return NextResponse.json({ ok: false, error: "No pudimos registrar tu reclamo" }, { status: 502 });
  }

  const leadsEmail = process.env.LEADS_EMAIL;
  if (leadsEmail) await avisarPorCorreo(r, codigo, leadsEmail).catch((e) => console.error("[reclamos] Aviso por correo falló:", e));

  return NextResponse.json({ ok: true, codigo, fecha: fecha.toISOString() });
}
