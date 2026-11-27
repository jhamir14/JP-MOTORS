import { creditoEnArea } from "@/lib/server/areas";
import { obtenerSesion } from "@/lib/server/auth";
import { dbConfigurada, sql } from "@/lib/server/db";
import { UUID_RE, auditarDescarga, noEncontrado } from "@/lib/server/documentos";

/**
 * Descarga de documentos firmados de un crédito (contrato, pagaré, acta… escaneados). Nunca es pública:
 * exige sesión del panel, no se guarda en caché y cada descarga queda en audit_log. 404 si no existe.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigurada || !UUID_RE.test(id)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();
  const [doc] = await sql()<{ tipo_mime: string; nombre: string; datos: Buffer; credito_id: string }[]>`
    select tipo_mime, nombre, datos, credito_id from public.documento_credito where id = ${id}`;
  if (!doc || !(await creditoEnArea(sesion, doc.credito_id))) return noEncontrado();
  await auditarDescarga({ tabla: "documento_credito", registroId: id, documento: "FIRMADO", usuarioId: sesion.usuarioId, req });

  const nombre = doc.nombre.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(doc.datos), {
    headers: {
      "Content-Type": doc.tipo_mime,
      "Content-Length": String(doc.datos.length),
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      ...(doc.tipo_mime.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'" } : {}),
    },
  });
}
