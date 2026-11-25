import { contratoDe, cronograma, pagare, ROLES_DOCUMENTOS_LEGALES, DOCUMENTOS_CREDITO, type DocumentoCredito } from "@/lib/documentos";
import { renderizarPdf } from "@/lib/pdf/render";
import { obtenerSesion, puede } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { dbConfigurada, sql } from "@/lib/server/db";
import { UUID_RE, auditarDescarga, datosCredito, datosEmpresa, noEncontrado, respuestaPdf } from "@/lib/server/documentos";

/**
 * PDF de un crédito: contrato (vehicular, celular o mutuo según el tipo), pagaré o cronograma.
 *   · Exige sesión del panel. Contrato y pagaré llevan datos personales completos: solo Superadmin,
 *     Admin. de créditos y Asesor de ventas. El cronograma lo puede imprimir todo el personal.
 *   · Se genera al vuelo desde las condiciones congeladas del crédito (no se guarda) y queda en audit_log.
 *   · Responde 404 (no 403) para no revelar qué existe. ?descargar=1 lo baja como archivo.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  if (!dbConfigurada || !UUID_RE.test(id) || !(DOCUMENTOS_CREDITO as readonly string[]).includes(tipo)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();
  const t = tipo as DocumentoCredito;
  if (t !== "cronograma" && !puede(sesion, ...ROLES_DOCUMENTOS_LEGALES)) return noEncontrado();

  const db = sql();
  const [credito, empresa] = await Promise.all([datosCredito(id, db), datosEmpresa(db)]);
  if (!credito) return noEncontrado();
  if (t !== "cronograma" && credito.estado === "ANULADO") return noEncontrado();

  const doc = t === "contrato" ? contratoDe(empresa, credito) : t === "pagare" ? pagare(empresa, credito) : cronograma(empresa, credito, await hoyLima(db));
  const bytes = await renderizarPdf(doc, { empresa: empresa.nombre, ruc: empresa.ruc });
  await auditarDescarga({ tabla: "credito", registroId: id, documento: t.toUpperCase(), usuarioId: sesion.usuarioId, req });
  return respuestaPdf(bytes, doc.archivo, new URL(req.url).searchParams.has("descargar"));
}
