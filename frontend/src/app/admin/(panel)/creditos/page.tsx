import Link from "next/link";
import { Encabezado, Estado, Tabla, Vacio } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui";
import { ETIQUETA_SERVICIO } from "@/lib/admin/constantes";
import { cn } from "@/lib/cn";
import { puedeGestionarCreditos } from "@/lib/creditos";
import { ETIQUETA_FRECUENCIA, type Frecuencia } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";

export const metadata = { title: "Créditos" };

const FILTROS = [
  { valor: "activos", label: "Activos" },
  { valor: "EN_MORA", label: "En mora" },
  { valor: "FINALIZADO_LIQUIDADO", label: "Cancelados" },
  { valor: "ANULADO", label: "Anulados" },
  { valor: "todos", label: "Todos" },
] as const;

interface Fila {
  id: string; codigo: string; tipo: keyof typeof ETIQUETA_SERVICIO; estado: string; cliente_id: string; cliente: string;
  bien: string | null; monto_financiado: number; valor_cuota: number; frecuencia: Frecuencia; numero_cuotas: number;
  pagadas: number; saldo: number; fecha_desembolso: Date; legado: boolean;
}

export default async function CreditosPage({ searchParams }: { searchParams: Promise<{ estado?: string; tipo?: string; q?: string; pagina?: string }> }) {
  const sesion = await requerirSesion();
  const sp = await searchParams;
  const estado = FILTROS.some((f) => f.valor === sp.estado) ? sp.estado! : "activos";
  const tipo = sp.tipo === "CREDITO_VEHICULAR" || sp.tipo === "CREDITO_CELULAR" || sp.tipo === "PRESTAMO_EFECTIVO" ? sp.tipo : null;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const db = sql();
  const patron = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  const filtroEstado =
    estado === "activos" ? db`cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')`
    : estado === "todos" ? db`true`
    : db`cr.estado = ${estado}`;

  const [filas, [resumen]] = await Promise.all([
    db<(Fila & { total: number })[]>`
      select cr.id, cr.codigo, cr.tipo, cr.estado, cr.cliente_id, cl.nombres || ' ' || cl.apellidos as cliente,
             coalesce(uv.marca || ' ' || uv.modelo, uc.marca || ' ' || uc.modelo) as bien,
             cr.monto_financiado::float8, cr.valor_cuota::float8, cr.frecuencia, cr.numero_cuotas, cr.fecha_desembolso,
             cr.legado_origen is not null as legado,
             (select count(*) from public.cuota cu where cu.credito_id = cr.id and cu.estado = 'PAGADA')::int as pagadas,
             greatest(cr.monto_total_pagar - coalesce((select sum(least(cu.monto_pagado, cu.monto_cuota)) from public.cuota cu where cu.credito_id = cr.id), 0), 0)::float8 as saldo,
             count(*) over ()::int as total
      from public.credito cr
      join public.cliente cl on cl.id = cr.cliente_id
      left join public.unidad_vehiculo uv on uv.id = cr.unidad_vehiculo_id
      left join public.unidad_celular uc on uc.id = cr.unidad_celular_id
      where ${filtroEstado}
        and (${tipo}::text is null or cr.tipo::text = ${tipo})
        and (${q} = '' or cr.codigo ilike ${patron} or (cl.nombres || ' ' || cl.apellidos) ilike ${patron} or cl.numero_documento ilike ${patron})
      order by cr.fecha_desembolso desc, cr.created_at desc
      limit 50 offset ${(pagina - 1) * 50}`,
    db<{ activos: number; mora: number; cartera: number; colocado_mes: number; creditos_mes: number }[]>`
      select count(*) filter (where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO'))::int as activos,
             count(*) filter (where cr.estado = 'EN_MORA')::int as mora,
             coalesce(sum(cr.monto_total_pagar - coalesce(p.pagado, 0)) filter (where cr.estado in ('VIGENTE', 'EN_MORA', 'APROBADO', 'REFINANCIADO')), 0)::float8 as cartera,
             coalesce(sum(cr.monto_financiado) filter (where cr.estado <> 'ANULADO' and date_trunc('month', cr.fecha_desembolso) = date_trunc('month', (now() at time zone 'America/Lima')::date)), 0)::float8 as colocado_mes,
             count(*) filter (where cr.estado <> 'ANULADO' and date_trunc('month', cr.fecha_desembolso) = date_trunc('month', (now() at time zone 'America/Lima')::date))::int as creditos_mes
      from public.credito cr
      left join lateral (select sum(least(cu.monto_pagado, cu.monto_cuota)) as pagado from public.cuota cu where cu.credito_id = cr.id) p on true`,
  ]);
  const total = filas[0]?.total ?? 0;
  const qs = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams({ estado, ...(tipo ? { tipo } : {}), ...(q ? { q } : {}) });
    for (const [k, v] of Object.entries(cambios)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    return `/admin/creditos?${p}`;
  };

  return (
    <>
      <Encabezado
        titulo="Créditos"
        acciones={puedeGestionarCreditos(sesion.rol) && <ButtonLink href="/admin/creditos/nuevo" variant="brand" size="sm">+ Nuevo crédito</ButtonLink>}
      >
        Financiamientos de motos, motokar, toritos y celulares con su cronograma.
      </Encabezado>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi k="Créditos activos" v={String(resumen.activos)} />
        <Kpi k="En mora" v={String(resumen.mora)} alerta={resumen.mora > 0} />
        <Kpi k="Cartera por cobrar" v={formatSoles(resumen.cartera)} />
        <Kpi k="Colocado este mes" v={formatSoles(resumen.colocado_mes)} detalle={`${resumen.creditos_mes} crédito${resumen.creditos_mes === 1 ? "" : "s"}`} />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <Link key={f.valor} href={qs({ estado: f.valor, pagina: null })} aria-current={estado === f.valor ? "page" : undefined}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold", estado === f.valor ? "bg-brand text-white" : "bg-surface text-muted hover:text-brand")}>
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="estado" value={estado} />
          <select name="tipo" defaultValue={tipo ?? ""} aria-label="Tipo" className="rounded-xl border border-line bg-surface px-2 py-2 text-sm">
            <option value="">Todos los tipos</option>
            <option value="CREDITO_VEHICULAR">Vehicular</option>
            <option value="CREDITO_CELULAR">Celular</option>
            <option value="PRESTAMO_EFECTIVO">Préstamo (anterior)</option>
          </select>
          <input name="q" defaultValue={q} placeholder="Código, cliente o DNI" aria-label="Buscar" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm md:w-56" />
          <button type="submit" className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Buscar</button>
        </form>
      </div>

      {filas.length === 0 ? (
        <Vacio>No hay créditos con estos filtros.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr><th>Código</th><th>Cliente</th><th>Producto</th><th className="text-right">Cuota</th><th>Avance</th><th className="text-right">Saldo</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/creditos/${f.id}`} className="font-mono text-xs font-semibold text-brand hover:underline">{f.codigo}</Link>
                  <div className="text-xs text-muted">{new Date(f.fecha_desembolso).toLocaleDateString("es-PE", { timeZone: "UTC" })}{f.legado ? " · anterior" : ""}</div>
                </td>
                <td><Link href={`/admin/clientes/${f.cliente_id}`} className="font-medium hover:text-brand">{f.cliente}</Link></td>
                <td className="text-sm">{f.bien ?? ETIQUETA_SERVICIO[f.tipo]}</td>
                <td className="text-right whitespace-nowrap tabular">{formatSoles(f.valor_cuota, true)}<div className="text-xs text-muted">{ETIQUETA_FRECUENCIA[f.frecuencia]?.adjetivo}</div></td>
                <td className="min-w-28">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(f.pagadas / f.numero_cuotas) * 100}%` }} /></div>
                  <div className="mt-1 text-xs text-muted tabular">{f.pagadas}/{f.numero_cuotas}</div>
                </td>
                <td className="text-right whitespace-nowrap tabular">{formatSoles(f.saldo, true)}</td>
                <td><Estado valor={f.estado} /></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      {total > 50 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">{total} créditos · página {pagina} de {Math.ceil(total / 50)}</span>
          <span className="flex gap-2">
            {pagina > 1 && <Link href={qs({ pagina: String(pagina - 1) })} className="font-semibold text-brand">← Anterior</Link>}
            {pagina * 50 < total && <Link href={qs({ pagina: String(pagina + 1) })} className="font-semibold text-brand">Siguiente →</Link>}
          </span>
        </div>
      )}
    </>
  );
}

function Kpi({ k, v, detalle, alerta }: { k: string; v: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className="rounded-2xl border border-line-soft bg-surface p-4 shadow-card">
      <div className="text-xs font-semibold tracking-wide text-muted uppercase">{k}</div>
      <div className={cn("mt-1 text-2xl font-extrabold tabular", alerta ? "text-danger" : "text-fg")}>{v}</div>
      {detalle && <div className="text-xs text-muted">{detalle}</div>}
    </div>
  );
}
