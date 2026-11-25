import { recibo } from "@/lib/documentos";
import { renderizarPdf } from "@/lib/pdf/render";
import { obtenerSesion } from "@/lib/server/auth";
import { dbConfigurada, sql } from "@/lib/server/db";
import { UUID_RE, auditarDescarga, datosEmpresa, datosRecibo, noEncontrado, respuestaPdf } from "@/lib/server/documentos";

/** Recibo de pago en PDF para el panel (todo el personal, con sesión y auditoría). El enlace para el cliente es /r/<token>. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigurada || !UUID_RE.test(id)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();
  const db = sql();
  const [datos, empresa] = await Promise.all([datosRecibo({ id }, db), datosEmpresa(db)]);
  if (!datos) return noEncontrado();
  const doc = recibo(empresa, datos);
  const bytes = await renderizarPdf(doc, { empresa: empresa.nombre, ruc: empresa.ruc });
  await auditarDescarga({ tabla: "pago", registroId: id, documento: "RECIBO", usuarioId: sesion.usuarioId, req });
  return respuestaPdf(bytes, doc.archivo, new URL(req.url).searchParams.has("descargar"));
}
