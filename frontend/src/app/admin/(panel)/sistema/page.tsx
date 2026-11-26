import { Encabezado, Kpi, Panel, Tabla, Vacio, fechaCorta } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ETIQUETA_REPORTE, type TipoReporte } from "@/lib/reportes";
import { requerirSeccion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";

export const metadata = { title: "Sistema" };

/** Objetos que deben existir en la base para esta versión de la app (última migración: Fase 9). */
const REQUISITOS = [
  { nombre: "Fase 7 · score de clientes", sql: "public.cliente_score", tipo: "tabla" },
  { nombre: "Fase 8 · funciones de reportes", sql: "public.rep_kpis()", tipo: "funcion" },
  { nombre: "Fase 9 · rate-limit compartido", sql: "public.registrar_intento(text,integer,integer)", tipo: "funcion" },
  { nombre: "Fase 9 · registro de errores", sql: "public.error_app", tipo: "tabla" },
] as const;

/** Fase 9 · Estado del sistema para el Superadmin: base, migraciones, proceso diario, errores y descargas. */
export default async function SistemaPage() {
  await requerirSeccion("sistema");
  const db = sql();
  const hoy = await hoyLima(db);

  const requisitos = await Promise.all(
    REQUISITOS.map(async (r) => {
      const [x] = r.tipo === "tabla"
        ? await db<{ ok: boolean }[]>`select to_regclass(${r.sql}) is not null as ok`
        : await db<{ ok: boolean }[]>`select to_regprocedure(${r.sql}) is not null as ok`;
      return { ...r, ok: x.ok };
    }),
  );
  const faseNueve = requisitos.every((r) => r.ok);

  const [[estado], migraciones, errores, descargas, limites] = await Promise.all([
    db<{ proceso: string | null; sesiones: number; usuarios: number; tamano: string; version: string; errores_24h: number; errores_7d: number }[]>`
      select (select valor #>> '{}' from public.configuracion where clave = 'proceso_diario_fecha') as proceso,
             (select count(*) from public.sesion_panel where expira > now())::int as sesiones,
             (select count(*) from public.perfil_usuario where activo)::int as usuarios,
             pg_size_pretty(pg_database_size(current_database())) as tamano,
             split_part(version(), ' ', 2) as version,
             ${faseNueve ? db`(select count(*) from public.error_app where created_at > now() - interval '1 day')::int` : db`0`} as errores_24h,
             ${faseNueve ? db`(select count(*) from public.error_app where created_at > now() - interval '7 days')::int` : db`0`} as errores_7d`,
    db<{ nombre: string; aplicada: Date }[]>`
      select nombre, aplicada from public._migraciones order by nombre desc limit 6`.catch(() => []),
    faseNueve
      ? db<{ id: number; created_at: Date; origen: string; ruta: string | null; metodo: string | null; tipo_ruta: string | null; mensaje: string; digest: string | null }[]>`
          select id, created_at, origen, ruta, metodo, tipo_ruta, mensaje, digest from public.error_app order by created_at desc limit 30`
      : Promise.resolve([]),
    db<{ id: number; created_at: Date; usuario: string | null; reporte: string; formato: string | null; filas: number | null }[]>`
      select a.id, a.created_at, nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), '') as usuario,
             a.registro_id as reporte, a.despues ->> 'formato' as formato, (a.despues ->> 'filas')::int as filas
      from public.audit_log a left join public.perfil_usuario p on p.id = a.usuario_id
      where a.accion = 'DESCARGA' and a.tabla = 'reporte' order by a.created_at desc limit 20`,
    faseNueve
      ? db<{ accion: string; claves: number; intentos: number }[]>`
          select split_part(clave, ':', 1) as accion, count(*)::int as claves, sum(cuenta)::int as intentos
          from public.limite_intento where inicio > now() - interval '1 hour' group by 1 order by 1`
      : Promise.resolve([]),
  ]);
  const procesoAlDia = estado.proceso === hoy;

  return (
    <>
      <Encabezado titulo="Sistema">Estado técnico de la plataforma: base de datos, migraciones, proceso diario, errores y auditoría de descargas.</Encabezado>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Base de datos" valor="Conectada" detalle={`PostgreSQL ${estado.version} · ${estado.tamano}`} tono="accent" />
        <Kpi titulo="Proceso diario (mora y score)" valor={procesoAlDia ? "Al día" : "Pendiente"} tono={procesoAlDia ? "accent" : "danger"}
          detalle={estado.proceso ? `Última ejecución: ${estado.proceso.split("-").reverse().join("/")}` : "Nunca se ejecutó"} />
        <Kpi titulo="Errores del servidor" valor={estado.errores_24h} tono={estado.errores_24h ? "danger" : undefined} detalle={`Últimas 24 h · ${estado.errores_7d} en 7 días`} />
        <Kpi titulo="Sesiones activas" valor={estado.sesiones} detalle={`${estado.usuarios} usuarios activos`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel titulo="Versión de la base">
          <ul className="grid gap-2 text-sm">
            {requisitos.map((r) => (
              <li key={r.nombre} className="flex items-center justify-between gap-3">
                <span>{r.nombre}</span>
                <Badge tone={r.ok ? "accent" : "gold"}>{r.ok ? "aplicada" : "falta"}</Badge>
              </li>
            ))}
          </ul>
          {migraciones.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              Últimas migraciones registradas: {migraciones.map((m) => m.nombre).join(", ")}.
            </p>
          )}
          {!faseNueve && <p className="mt-3 text-xs text-danger">Aplica las migraciones pendientes (ver docs/FASE_9_PRODUCCION.md).</p>}
        </Panel>

        <Panel titulo="Respaldo y límites">
          <ul className="grid gap-2 text-sm">
            <li>
              <strong>Backups:</strong> automáticos del volumen de PostgreSQL en Railway (diario, semanal y mensual). Restaurar desde el panel de Railway → servicio
              Postgres → Backups. Copia lógica manual: <code className="text-xs">database/respaldo.sh</code>.
            </li>
            <li><strong>Monitoreo externo:</strong> <code className="text-xs">/api/salud</code> responde 200 si la base está disponible (para UptimeRobot o similar).</li>
          </ul>
          <h3 className="mt-4 mb-2 text-sm font-semibold">Intentos en la última hora (rate-limit)</h3>
          {limites.length === 0 ? (
            <p className="text-sm text-muted">Sin actividad.</p>
          ) : (
            <ul className="grid gap-1 text-sm tabular">
              {limites.map((l) => <li key={l.accion} className="flex justify-between"><span>{l.accion}</span><span>{l.intentos} intentos · {l.claves} orígenes</span></li>)}
            </ul>
          )}
        </Panel>
      </div>

      <h2 className="mb-3 text-lg">Últimos errores</h2>
      {errores.length === 0 ? (
        <Vacio>Sin errores registrados.</Vacio>
      ) : (
        <Tabla className="mb-6">
          <thead><tr><th>Fecha</th><th>Origen</th><th>Ruta</th><th>Mensaje</th></tr></thead>
          <tbody>
            {errores.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs">{fechaCorta(e.created_at)}</td>
                <td className="text-xs">{e.origen}{e.tipo_ruta ? ` · ${e.tipo_ruta}` : ""}</td>
                <td className="font-mono text-xs">{e.metodo ? `${e.metodo} ` : ""}{e.ruta ?? "—"}</td>
                <td className="text-xs">
                  <span className="line-clamp-3 break-all">{e.mensaje}</span>
                  {e.digest && <span className="block text-muted">código {e.digest}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      <h2 className={cn("mb-3 text-lg", errores.length === 0 && "mt-6")}>Descargas de reportes</h2>
      {descargas.length === 0 ? (
        <Vacio>Nadie exportó reportes todavía.</Vacio>
      ) : (
        <Tabla>
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Reporte</th><th className="text-right">Filas</th></tr></thead>
          <tbody>
            {descargas.map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap text-xs">{fechaCorta(d.created_at)}</td>
                <td>{d.usuario ?? "—"}</td>
                <td>{ETIQUETA_REPORTE[d.reporte as TipoReporte] ?? d.reporte} <span className="text-xs text-muted">({d.formato ?? "xlsx"})</span></td>
                <td className="text-right tabular">{d.filas ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
