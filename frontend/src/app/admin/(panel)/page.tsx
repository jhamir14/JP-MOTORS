import Link from "next/link";
import { Barra, Encabezado, Estado, Kpi, Panel, fechaCorta } from "@/components/admin/ui";
import { formatSoles } from "@/lib/format";
import { puedeVerSeccion } from "@/lib/permisos";
import { ETIQUETA_TRAMO, TRAMOS_MORA, distribucionScore, indicadores, porcentaje } from "@/lib/reportes";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { AVISO_MIGRACION, distribucionScoreClientes, kpis as leerKpis, moraPorTramoHoy, reportesDisponibles } from "@/lib/server/reportes";

export const metadata = { title: "Inicio" };

const ETIQUETA_TIPO: Record<string, string> = {
  CREDITO_VEHICULAR: "Crédito vehicular",
  CREDITO_CELULAR: "Crédito celular",
  PRESTAMO_EFECTIVO: "Préstamo en efectivo",
};

export default async function AdminInicio({ searchParams }: { searchParams: Promise<{ sinPermiso?: string }> }) {
  const sesion = await requerirSesion();
  const { sinPermiso } = await searchParams;
  const db = sql();

  const [[kpis], cartera, solicitudes] = await Promise.all([
    db<{ productos: number; publicados: number; en_stock: number; solicitudes_nuevas: number; reclamos_abiertos: number; cuotas_hoy: number; clientes: number; incompletos: number }[]>`
      select (select count(*) from public.producto_catalogo)::int as productos,
             (select count(*) from public.producto_catalogo where publicado)::int as publicados,
             ((select count(*) from public.unidad_vehiculo where estado = 'EN_STOCK') +
              (select count(*) from public.unidad_celular where estado = 'EN_STOCK'))::int as en_stock,
             (select count(*) from public.solicitud_credito where estado = 'NUEVA')::int as solicitudes_nuevas,
             (select count(*) from public.reclamo where estado <> 'RESPONDIDO')::int as reclamos_abiertos,
             (select count(*) from public.v_cobranza where tramo = 'VENCE_HOY')::int as cuotas_hoy,
             (select count(*) from public.cliente)::int as clientes,
             (select count(*) from public.cliente where datos_incompletos)::int as incompletos`,
    db<{ tipo: string; creditos_activos: number; creditos_en_mora: number; saldo_por_cobrar: number }[]>`
      select tipo, creditos_activos::int, creditos_en_mora::int, saldo_por_cobrar::float8 from public.v_resumen_cartera order by tipo`,
    db<{ id: string; nombres: string; apellidos: string; servicio: string; producto_interes: string | null; estado: string; created_at: Date }[]>`
      select id, nombres, apellidos, servicio, producto_interes, estado, created_at
      from public.solicitud_credito order by created_at desc limit 5`,
  ]);

  // Fase 8: indicadores financieros (solo quienes ven Reportes).
  const verFinanzas = puedeVerSeccion(sesion.rol, "reportes");
  const faltaMigracion = verFinanzas && !(await reportesDisponibles(db));
  const [kpi, tramos, scores] = verFinanzas && !faltaMigracion
    ? await Promise.all([leerKpis(db), moraPorTramoHoy(db), distribucionScoreClientes(db)])
    : [null, [], []];
  const k = kpi ? indicadores(kpi) : null;

  const tarjetas = [
    { titulo: "Solicitudes nuevas", valor: kpis.solicitudes_nuevas, href: "/admin/solicitudes?estado=NUEVA" },
    { titulo: "Cuotas que vencen hoy", valor: kpis.cuotas_hoy, href: "/admin/cobranzas?ver=hoy" },
    { titulo: "Expedientes por completar", valor: `${kpis.incompletos} / ${kpis.clientes}`, href: "/admin/clientes?incompletos=1" },
    { titulo: "Productos publicados", valor: `${kpis.publicados} / ${kpis.productos}`, href: "/admin/catalogo" },
    { titulo: "Unidades en stock", valor: kpis.en_stock, href: "/admin/inventario" },
    { titulo: "Reclamos abiertos", valor: kpis.reclamos_abiertos, href: "/admin/reclamos" },
  ];

  return (
    <>
      {sinPermiso && (
        <p role="alert" className="mb-5 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          Tu rol no tiene acceso a esa sección.
        </p>
      )}
      <Encabezado titulo={`Hola, ${sesion.nombres}`}>Resumen del día en Inversiones JP.</Encabezado>

      <nav aria-label="Accesos rápidos de cobranza" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/admin/cobranzas", titulo: "Cobranzas", texto: "Por cobrar hoy, en mora y botón Cobrar" },
          { href: "/admin/creditos", titulo: "Registrar pago", texto: "Busca el crédito y pulsa «Registrar pago»" },
          { href: "/admin/pagos", titulo: "Pagos", texto: "Pagos registrados y constancias" },
          { href: "/admin/caja", titulo: "Caja", texto: "Cierre de caja del día" },
        ].map((a) => (
          <Link key={a.href + a.titulo} href={a.href} className="rounded-2xl bg-brand px-4 py-3 text-white shadow-card transition-colors hover:bg-brand-hover">
            <span className="block font-semibold">{a.titulo}</span>
            <span className="block text-xs text-white/75">{a.texto}</span>
          </Link>
        ))}
      </nav>

      {faltaMigracion && (
        <p role="status" className="mb-6 rounded-xl bg-gold-soft px-4 py-3 text-sm">{AVISO_MIGRACION}</p>
      )}
      {k && (
        <section aria-labelledby="kpi-titulo" className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="kpi-titulo" className="text-lg">Indicadores</h2>
            <Link href="/admin/reportes" className="text-sm font-semibold text-brand">Ver reportes →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Cartera vigente" valor={formatSoles(k.cartera_vigente)} detalle={`${k.creditos_activos} créditos activos`} href="/admin/creditos" />
            <Kpi titulo="Cartera en mora" valor={formatSoles(k.saldo_vencido)} tono={k.saldo_vencido ? "danger" : undefined}
              detalle={`${k.porcentajeMoraCartera} % de la cartera · ${k.creditos_en_mora} créditos (${k.porcentajeCreditosEnMora} %)`} href="/admin/reportes?ver=mora" />
            <Kpi titulo="Cobrado hoy" valor={formatSoles(k.cobrado_hoy, true)} detalle={`${k.pagos_hoy} pagos`} href="/admin/pagos" />
            <Kpi titulo="Cobrado en el mes" valor={formatSoles(k.cobrado_mes)} detalle={`Capital ${formatSoles(k.capital_cobrado_mes)}`} href="/admin/reportes?ver=cobranzas" />
            <Kpi titulo="Colocado en el mes" valor={formatSoles(k.colocado_mes)} detalle={`${k.creditos_mes} ${k.creditos_mes === 1 ? "crédito nuevo" : "créditos nuevos"}`} href="/admin/reportes?ver=colocaciones" />
            <Kpi titulo="Intereses ganados (mes)" valor={formatSoles(k.ingresosMes)} tono="accent" detalle={`Interés ${formatSoles(k.interes_cobrado_mes)} · mora ${formatSoles(k.mora_cobrada_mes)}`} />
            <Kpi titulo="Intereses cobrados vs. pactados" valor={`${k.porcentajeInteresCobrado} %`}
              detalle={`${formatSoles(k.intereses_cobrados_activos)} de ${formatSoles(k.intereses_pactados_activos)} (créditos activos)`} />
            <Kpi titulo="Capital por cobrar" valor={formatSoles(k.capital_pendiente)} detalle="Sin intereses ni mora" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel titulo="Mora por tramo">
              <ul className="grid gap-3 text-sm">
                {TRAMOS_MORA.map((t) => {
                  const f = tramos.find((x) => x.tramo === t);
                  return (
                    <li key={t}>
                      <div className="mb-1 flex justify-between gap-2">
                        <span className="font-medium">{ETIQUETA_TRAMO[t]}</span>
                        <span className="tabular">{f?.creditos ?? 0} · {formatSoles(f?.saldo ?? 0)} · {porcentaje(f?.saldo ?? 0, k.cartera_vigente)} %</span>
                      </div>
                      <Barra porcentaje={k.saldo_vencido ? ((f?.saldo ?? 0) / k.saldo_vencido) * 100 : 0} tono={t === "MORA_MAS_30" ? "danger" : t === "MORA_1_7" ? "gold" : "brand"} />
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel titulo="Clientes por score">
              <ul className="grid gap-3 text-sm">
                {distribucionScore(scores).map((d) => (
                  <li key={String(d.score)}>
                    <div className="mb-1 flex justify-between gap-2">
                      <Link href={`/admin/clientes?score=${d.score ?? "sin"}`} className="font-medium hover:text-brand">
                        {d.score ? `${"★".repeat(d.score)}${"☆".repeat(5 - d.score)} ${d.score}` : "Sin historial"}
                      </Link>
                      <span className="tabular">{d.clientes} · {d.porcentaje} %</span>
                    </div>
                    <Barra porcentaje={d.porcentaje} tono={d.score === null ? "brand" : d.score >= 4 ? "accent" : d.score <= 2 ? "danger" : "gold"} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {tarjetas.map((t) => {
          const contenido = (
            <>
              <div className="text-xs font-semibold text-muted">{t.titulo}</div>
              <div className="mt-2 text-3xl font-extrabold tabular">{t.valor}</div>
            </>
          );
          return t.href ? (
            <Link key={t.titulo} href={t.href} className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card transition-colors hover:border-brand">
              {contenido}
            </Link>
          ) : (
            <div key={t.titulo} className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card">{contenido}</div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel titulo="Cartera">
          {cartera.length === 0 && <p className="text-sm text-muted">Aún no hay créditos activos.</p>}
          <ul className="divide-y divide-line-soft">
            {cartera.map((c) => (
              <li key={c.tipo} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{ETIQUETA_TIPO[c.tipo] ?? c.tipo}</div>
                  <div className="text-xs text-muted">{c.creditos_activos} activos · {c.creditos_en_mora} en mora</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">Por cobrar</div>
                  <div className="font-bold tabular">{formatSoles(c.saldo_por_cobrar, true)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel titulo="Últimas solicitudes" acciones={<Link href="/admin/solicitudes" className="text-sm font-semibold text-brand">Ver todas</Link>}>
          {solicitudes.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay solicitudes desde la web.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {solicitudes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.nombres} {s.apellidos}</div>
                    <div className="truncate text-xs text-muted">{ETIQUETA_TIPO[s.servicio] ?? s.servicio}{s.producto_interes ? ` · ${s.producto_interes}` : ""} · {fechaCorta(s.created_at)}</div>
                  </div>
                  <Estado valor={s.estado} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
