import Link from "next/link";
import { Encabezado, Panel, Estado, fechaCorta } from "@/components/admin/ui";
import { formatSoles } from "@/lib/format";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";

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

  const tarjetas = [
    { titulo: "Solicitudes nuevas", valor: kpis.solicitudes_nuevas, href: "/admin/solicitudes?estado=NUEVA" },
    { titulo: "Cuotas que vencen hoy", valor: kpis.cuotas_hoy, href: null },
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
          <p className="mt-3 text-xs text-muted">El módulo de créditos y cobranzas llega en las Fases 4 y 5.</p>
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
