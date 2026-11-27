import { tiposDe } from "@/lib/areas";
import { listaCobranza } from "@/lib/documentos";
import { renderizarPdf } from "@/lib/pdf/render";
import { obtenerSesion } from "@/lib/server/auth";
import { creditosPorCobrar } from "@/lib/server/cobranza";
import { dbConfigurada, sql } from "@/lib/server/db";
import { auditarDescarga, datosEmpresa, noEncontrado, respuestaPdf } from "@/lib/server/documentos";

/**
 * PDF con todas las cobranzas pendientes: cuotas que vencen hoy y créditos en mora (con celular y dirección).
 * Lo puede imprimir todo el personal (igual que la página de Cobranzas). Queda en audit_log.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!dbConfigurada) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion) return noEncontrado();
  const db = sql();
  const [{ hoy, creditos }, empresa] = await Promise.all([creditosPorCobrar(db, { tipos: tiposDe(sesion.rol) }), datosEmpresa(db)]);
  const filas = creditos
    .filter((c) => c.situacion === "MORA" || c.situacion === "VENCE_HOY")
    .map((c) => ({
      cliente: c.cliente,
      telefono: c.telefono,
      direccion: c.direccion ?? c.distrito,
      codigo: c.codigo,
      hoy: c.pendientes.filter((p) => p.fecha === hoy).reduce((s, p) => s + p.saldo, 0),
      vencido: c.vencido,
      cuotasVencidas: c.cuotasVencidas,
      diasAtraso: c.diasAtraso,
    }));
  const doc = listaCobranza(empresa, hoy, filas);
  const bytes = await renderizarPdf(doc, { empresa: empresa.nombre, ruc: empresa.ruc });
  await auditarDescarga({ tabla: "credito", registroId: sesion.usuarioId, documento: "LISTA_COBRANZAS", usuarioId: sesion.usuarioId, req });
  return respuestaPdf(bytes, doc.archivo, new URL(req.url).searchParams.has("descargar"));
}
