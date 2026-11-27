import { pagoEnArea } from "@/lib/server/areas";
import { obtenerSesion } from "@/lib/server/auth";
import { dbConfigurada, sql } from "@/lib/server/db";

/**
 * Descarga de vouchers de pago (Yape, Plin, transferencias). Nunca es pública:
 *   · exige sesión del panel (todo el personal puede verlos: los cobradores los suben);
 *   · cada descarga queda en audit_log (accion = 'DESCARGA', con el usuario);
 *   · sin caché ni indexación. Responde 404 (no 403) para no revelar qué existe.
 */
export const dynamic = "force-dynamic";

const noEncontrado = () => new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigurada || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();

  const db = sql();
  const [doc] = await db<{ tipo_mime: string; nombre: string; datos: Buffer; pago_id: string }[]>`
    select tipo_mime, nombre, datos, pago_id from public.voucher_pago where id = ${id}`;
  if (!doc || !(await pagoEnArea(sesion, doc.pago_id))) return noEncontrado();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db`
    insert into public.audit_log (tabla, registro_id, accion, despues, usuario_id)
    values ('voucher_pago', ${id}, 'DESCARGA', ${db.json({ pago_id: doc.pago_id, ip })}, ${sesion.usuarioId})`;

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
