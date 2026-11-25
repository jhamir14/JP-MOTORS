import { puedeVerDocumento, type TipoDocumentoKyc } from "@/lib/clientes";
import { obtenerSesion } from "@/lib/server/auth";
import { dbConfigurada, sql } from "@/lib/server/db";

/**
 * Descarga de documentos KYC (DNI, recibos, fachada). Nunca es pública:
 *   · exige sesión del panel y un rol con acceso a ese tipo de documento (el COBRADOR solo ve la fachada);
 *   · cada descarga queda registrada en audit_log (accion = 'DESCARGA', con el usuario);
 *   · la respuesta no se guarda en cachés (private, no-store) ni la indexan buscadores.
 * Responde 404 (no 403) cuando no hay permiso, para no revelar qué documentos existen.
 */
export const dynamic = "force-dynamic";

const noEncontrado = () => new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigurada || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();

  const db = sql();
  const [meta] = await db<{ tipo: TipoDocumentoKyc }[]>`select tipo from public.documento_kyc where id = ${id}`;
  if (!meta || !puedeVerDocumento(sesion.rol, meta.tipo)) return noEncontrado();

  const [doc] = await db<{ tipo_mime: string; nombre: string; datos: Buffer; cliente_id: string | null; garante_id: string | null }[]>`
    select tipo_mime, nombre, datos, cliente_id, garante_id from public.documento_kyc where id = ${id}`;
  if (!doc) return noEncontrado();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db`
    insert into public.audit_log (tabla, registro_id, accion, despues, usuario_id)
    values ('documento_kyc', ${id}, 'DESCARGA',
            ${db.json({ tipo: meta.tipo, cliente_id: doc.cliente_id, garante_id: doc.garante_id, ip })}, ${sesion.usuarioId})`;

  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  const nombre = doc.nombre.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(doc.datos), {
    headers: {
      "Content-Type": doc.tipo_mime,
      "Content-Length": String(doc.datos.length),
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      ...(doc.tipo_mime.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'" } : {}),
    },
  });
}
