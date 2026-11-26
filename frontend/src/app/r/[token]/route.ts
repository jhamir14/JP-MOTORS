import { recibo } from "@/lib/documentos";
import { renderizarPdf } from "@/lib/pdf/render";
import { dbConfigurada, sql } from "@/lib/server/db";
import { auditarDescarga, datosEmpresa, datosRecibo, noEncontrado, respuestaPdf } from "@/lib/server/documentos";
import { ipDe, permitirIntentoCompartido } from "@/lib/server/limite";

/**
 * Recibo compartido por WhatsApp: /r/<token>. No pide sesión: el token (64 hex, ~244 bits aleatorios por pago)
 * es la llave, y no se puede adivinar ni enumerar. El documento del cliente sale enmascarado (••••1234).
 * Límite de intentos por IP, sin caché ni indexación, y cada apertura queda en audit_log.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await permitirIntentoCompartido(`recibo:${ipDe(req.headers)}`, 30, 10 * 60 * 1000)))
    return new Response("Demasiadas solicitudes. Intenta en unos minutos.", { status: 429, headers: { "Cache-Control": "no-store" } });
  if (!dbConfigurada || !/^[0-9a-f]{64}$/.test(token)) return noEncontrado();
  const db = sql();
  const [datos, empresa] = await Promise.all([datosRecibo({ token }, db), datosEmpresa(db)]);
  if (!datos) return noEncontrado();
  const doc = recibo(empresa, { ...datos, publico: true });
  const bytes = await renderizarPdf(doc, { empresa: empresa.nombre, ruc: empresa.ruc });
  await auditarDescarga({ tabla: "pago", registroId: datos.id, documento: "RECIBO_PUBLICO", usuarioId: null, req });
  return respuestaPdf(bytes, doc.archivo);
}
