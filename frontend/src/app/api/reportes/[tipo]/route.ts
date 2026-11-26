import { aCsv, aXlsx } from "@/lib/exportar";
import { COLUMNAS, ETIQUETA_REPORTE, ROLES_REPORTES, TIPOS_REPORTE, nombreArchivo, parsearFiltros, usaRango, type TipoReporte } from "@/lib/reportes";
import { obtenerSesion, puede } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { dbConfigurada, sql } from "@/lib/server/db";
import { ipDe, permitirIntentoCompartido } from "@/lib/server/limite";
import { auditarDescarga, filasReporte, reportesDisponibles } from "@/lib/server/reportes";

/**
 * Exportación de reportes a Excel (.xlsx) o CSV.
 *   · Solo Superadmin y Administrador de créditos; sin sesión o sin rol → 404 (no revela que existe).
 *   · Cada descarga queda en audit_log (accion DESCARGA, tabla "reporte") con filtros, formato y n.º de filas.
 *   · Sin caché; máximo 30 exportaciones por usuario cada 10 minutos.
 */
export const dynamic = "force-dynamic";

const noEncontrado = () => new Response("No encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!dbConfigurada || !(TIPOS_REPORTE as readonly string[]).includes(tipo)) return noEncontrado();
  const sesion = await obtenerSesion();
  if (!sesion || !puede(sesion, ...ROLES_REPORTES)) return noEncontrado();
  if (!(await permitirIntentoCompartido(`reporte:${sesion.usuarioId}`, 30, 10 * 60 * 1000)))
    return new Response("Demasiadas descargas seguidas. Espera unos minutos.", { status: 429, headers: { "Cache-Control": "no-store" } });

  const t = tipo as TipoReporte;
  const url = new URL(req.url);
  const formato = url.searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const db = sql();
  if (!(await reportesDisponibles(db))) return new Response("Reportes no disponibles: falta aplicar la migración de la Fase 8.", { status: 503 });
  const hoy = await hoyLima(db);
  const { filtros } = parsearFiltros(url.searchParams, hoy);
  if (!usaRango(t)) filtros.hasta = hoy;
  const filas = await filasReporte(db, t, filtros);
  await auditarDescarga(db, sesion.usuarioId, t, formato, filtros, filas.length, ipDe(req.headers));

  const columnas = COLUMNAS[t] as never;
  const nombre = nombreArchivo(t, filtros, formato);
  const comunes = {
    "Content-Disposition": `attachment; filename="${nombre}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (formato === "csv") {
    return new Response(aCsv(columnas, filas as never[]), { headers: { "Content-Type": "text/csv; charset=utf-8", ...comunes } });
  }
  const encabezado = [
    `Inversiones JP · Reporte de ${ETIQUETA_REPORTE[t].toLowerCase()}`,
    usaRango(t) ? `Del ${filtros.desde} al ${filtros.hasta}` : `Situación al ${hoy}`,
    `Generado por ${sesion.nombres} ${sesion.apellidos} el ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })} · ${filas.length} filas`,
  ];
  const bytes = aXlsx(ETIQUETA_REPORTE[t], columnas, filas as never[], encabezado);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Length": String(bytes.length), ...comunes },
  });
}
