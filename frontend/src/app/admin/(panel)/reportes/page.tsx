import Link from "next/link";
import { Barra, Encabezado, Kpi, Panel, Tabla, Vacio } from "@/components/admin/ui";
import { inputClasses } from "@/components/ui/Field";
import { ETIQUETA_SERVICIO } from "@/lib/admin/constantes";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { ETIQUETA_METODO, type MetodoPago } from "@/lib/pagos";
import {
  ETIQUETA_REPORTE,
  ETIQUETA_TRAMO,
  TIPOS_CREDITO_REPORTE,
  TIPOS_REPORTE,
  parsearFiltros,
  queryFiltros,
  resumenMora,
  totalesCancelados,
  totalesCobranzas,
  totalesColocaciones,
  usaRango,
  type FilaCancelado,
  type FilaCobranza,
  type FilaColocacion,
  type FilaMora,
  type FiltrosReporte,
  type TipoReporte,
} from "@/lib/reportes";
import { requerirSeccion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { MAX_FILAS_REPORTE, baseCartera, filasReporte, opcionesFiltros } from "@/lib/server/reportes";

export const metadata = { title: "Reportes" };

/** Filas que se muestran en pantalla; la exportación trae todas (hasta MAX_FILAS_REPORTE). */
const FILAS_EN_PANTALLA = 300;

const soles = (n: number) => formatSoles(n, true);
const fecha = (s: string) => s.split("-").reverse().join("/");
const tipoCorto = (t: string) => ETIQUETA_SERVICIO[t as keyof typeof ETIQUETA_SERVICIO]?.replace(" (sistema anterior)", "") ?? t;

export default async function ReportesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requerirSeccion("reportes");
  const sp = await searchParams;
  const db = sql();
  const hoy = await hoyLima(db);
  const ver: TipoReporte = (TIPOS_REPORTE as readonly string[]).includes(String(sp.ver)) ? (sp.ver as TipoReporte) : "colocaciones";
  const { filtros, avisos } = parsearFiltros(sp, hoy);
  const [filas, opciones, base] = await Promise.all([
    filasReporte(db, ver, filtros),
    opcionesFiltros(db),
    ver === "mora" ? baseCartera(db, filtros) : Promise.resolve(null),
  ]);
  const ctl = cn(inputClasses(), "py-2 text-sm");
  const exportar = (formato: "xlsx" | "csv") => `/api/reportes/${ver}?${queryFiltros(filtros, { formato })}`;

  return (
    <>
      <Encabezado
        titulo="Reportes"
        acciones={
          <>
            <a href={exportar("xlsx")} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">Exportar a Excel</a>
            <a href={exportar("csv")} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand">CSV</a>
          </>
        }
      >
        {usaRango(ver) ? `Del ${fecha(filtros.desde)} al ${fecha(filtros.hasta)}.` : `Situación al ${fecha(hoy)} (la mora es una foto del día).`}{" "}
        Cada exportación queda registrada con tu usuario.
      </Encabezado>

      <nav aria-label="Tipo de reporte" className="mb-4 flex flex-wrap gap-2">
        {TIPOS_REPORTE.map((t) => (
          <Link
            key={t}
            href={`/admin/reportes?${queryFiltros(filtros, { ver: t })}`}
            aria-current={t === ver ? "page" : undefined}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
              t === ver ? "bg-brand text-white" : "border border-line bg-surface hover:border-brand",
            )}
          >
            {ETIQUETA_REPORTE[t]}
          </Link>
        ))}
      </nav>

      <form className="mb-5 grid gap-3 rounded-2xl border border-line-soft bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <input type="hidden" name="ver" value={ver} />
        <label className="text-xs font-semibold text-muted">Desde
          <input type="date" name="desde" defaultValue={filtros.desde} disabled={!usaRango(ver)} className={ctl} />
        </label>
        <label className="text-xs font-semibold text-muted">Hasta
          <input type="date" name="hasta" defaultValue={filtros.hasta} disabled={!usaRango(ver)} className={ctl} />
        </label>
        <label className="text-xs font-semibold text-muted">Tipo de crédito
          <select name="tipo" defaultValue={filtros.tipo ?? ""} className={cn(ctl, "cursor-pointer")}>
            <option value="">Todos</option>
            {TIPOS_CREDITO_REPORTE.map((t) => <option key={t} value={t}>{tipoCorto(t)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Asesor
          <select name="asesor" defaultValue={filtros.asesor ?? ""} className={cn(ctl, "cursor-pointer")}>
            <option value="">Todos</option>
            {opciones.asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Sucursal
          <select name="sucursal" defaultValue={filtros.sucursal ?? ""} className={cn(ctl, "cursor-pointer")}>
            <option value="">Todas</option>
            {opciones.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <button type="submit" className="cursor-pointer self-end rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Ver reporte</button>
      </form>

      {avisos.length > 0 && (
        <p role="status" className="mb-4 rounded-xl bg-gold-soft px-4 py-2 text-sm">{avisos.join(" ")}</p>
      )}
      {filas.length >= MAX_FILAS_REPORTE && (
        <p role="status" className="mb-4 rounded-xl bg-gold-soft px-4 py-2 text-sm">
          El reporte llegó al máximo de {MAX_FILAS_REPORTE.toLocaleString("es-PE")} filas: acota el rango de fechas.
        </p>
      )}

      {ver === "colocaciones" && <Colocaciones filas={filas as FilaColocacion[]} />}
      {ver === "cobranzas" && <Cobranzas filas={filas as FilaCobranza[]} />}
      {ver === "mora" && <Mora filas={filas as FilaMora[]} base={base!} filtros={filtros} />}
      {ver === "cancelados" && <Cancelados filas={filas as FilaCancelado[]} />}
    </>
  );
}

function Recorte({ total }: { total: number }) {
  return total > FILAS_EN_PANTALLA ? (
    <p className="mt-2 text-xs text-muted">Se muestran {FILAS_EN_PANTALLA} de {total.toLocaleString("es-PE")} filas. Exporta a Excel para verlas todas.</p>
  ) : null;
}

function Agrupado({ titulo, items }: { titulo: string; items: { clave: string; cantidad: number; valor: number }[] }) {
  const total = items.reduce((a, f) => a + f.valor, 0);
  return (
    <Panel titulo={titulo}>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Sin datos.</p>
      ) : (
        <ul className="grid gap-3 text-sm">
          {items.map((f) => (
            <li key={f.clave}>
              <div className="mb-1 flex justify-between gap-3">
                <span className="truncate font-medium">{tipoCorto(ETIQUETA_METODO[f.clave as MetodoPago] ?? f.clave)}</span>
                <span className="whitespace-nowrap tabular">{f.cantidad} · {soles(f.valor)}</span>
              </div>
              <Barra porcentaje={total ? (f.valor / total) * 100 : 0} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Colocaciones({ filas }: { filas: FilaColocacion[] }) {
  const t = totalesColocaciones(filas);
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Créditos colocados" valor={t.creditos} />
        <Kpi titulo="Monto financiado" valor={soles(t.financiado)} detalle={`Ticket promedio ${soles(t.ticketPromedio)}`} />
        <Kpi titulo="Iniciales cobradas" valor={soles(t.inicial)} detalle={`Ventas ${soles(t.ventas)}`} />
        <Kpi titulo="Intereses pactados" valor={soles(t.intereses)} detalle={`Total a cobrar ${soles(t.totalPagar)}`} />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Agrupado titulo="Por tipo de crédito" items={t.porTipo.map((g) => ({ clave: g.clave, cantidad: g.creditos, valor: g.financiado }))} />
        <Agrupado titulo="Por asesor" items={t.porAsesor.map((g) => ({ clave: g.clave, cantidad: g.creditos, valor: g.financiado }))} />
      </div>
      {filas.length === 0 ? (
        <Vacio>No hay créditos desembolsados con esos filtros.</Vacio>
      ) : (
        <>
          <Tabla>
            <thead><tr><th>Fecha</th><th>Crédito</th><th>Cliente</th><th>Asesor</th><th className="text-right">Financiado</th><th className="text-right">Intereses</th><th className="text-right">Cuotas</th></tr></thead>
            <tbody className="tabular">
              {filas.slice(0, FILAS_EN_PANTALLA).map((f) => (
                <tr key={f.codigo}>
                  <td className="whitespace-nowrap">{fecha(f.fecha_desembolso)}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{f.codigo}<span className="block font-sans text-muted">{tipoCorto(f.tipo)}</span></td>
                  <td>{f.cliente}</td>
                  <td>{f.asesor ?? "—"}</td>
                  <td className="text-right">{f.monto_financiado.toFixed(2)}</td>
                  <td className="text-right">{f.total_intereses.toFixed(2)}</td>
                  <td className="text-right">{f.numero_cuotas} {f.frecuencia.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Recorte total={filas.length} />
        </>
      )}
    </>
  );
}

function Cobranzas({ filas }: { filas: FilaCobranza[] }) {
  const t = totalesCobranzas(filas);
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Total cobrado" valor={soles(t.total)} detalle={`${t.pagos} pagos · efectivo ${soles(t.efectivo)} · digital ${soles(t.digital)}`} />
        <Kpi titulo="Capital recuperado" valor={soles(t.capital)} />
        <Kpi titulo="Intereses ganados" valor={soles(t.interes)} tono="accent" />
        <Kpi titulo="Mora cobrada" valor={soles(t.mora)} detalle={`Ingresos (interés + mora) ${soles(t.ingresos)}`} />
      </div>
      {t.sinAplicar > 0.009 && (
        <p className="mb-4 text-xs text-muted">{soles(t.sinAplicar)} corresponde a pagos del sistema anterior sin reparto por mora / interés / capital.</p>
      )}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Agrupado titulo="Por método" items={t.porMetodo.map((g) => ({ clave: g.clave, cantidad: g.pagos, valor: g.total }))} />
        <Agrupado titulo="Por quién registró" items={t.porCobrador.map((g) => ({ clave: g.clave, cantidad: g.pagos, valor: g.total }))} />
      </div>
      {filas.length === 0 ? (
        <Vacio>No hay pagos con esos filtros.</Vacio>
      ) : (
        <>
          <Tabla>
            <thead><tr><th>Fecha</th><th>Recibo</th><th>Crédito</th><th>Cliente</th><th>Método</th><th className="text-right">Monto</th><th className="text-right">Mora</th><th className="text-right">Interés</th><th className="text-right">Capital</th></tr></thead>
            <tbody className="tabular">
              {filas.slice(0, FILAS_EN_PANTALLA).map((f) => (
                <tr key={f.numero_recibo}>
                  <td className="whitespace-nowrap">{fecha(f.fecha_pago)}</td>
                  <td className="font-mono text-xs">{String(f.numero_recibo).padStart(6, "0")}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{f.codigo}</td>
                  <td>{f.cliente}<span className="block text-xs text-muted">{f.registrado_por}</span></td>
                  <td>{ETIQUETA_METODO[f.metodo as MetodoPago] ?? f.metodo}</td>
                  <td className="text-right font-semibold">{f.monto.toFixed(2)}</td>
                  <td className="text-right">{f.mora.toFixed(2)}</td>
                  <td className="text-right">{f.interes.toFixed(2)}</td>
                  <td className="text-right">{f.capital.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Recorte total={filas.length} />
        </>
      )}
    </>
  );
}

function Mora({ filas, base, filtros }: { filas: FilaMora[]; base: { cartera: number; activos: number }; filtros: FiltrosReporte }) {
  const r = resumenMora(filas, base.cartera, base.activos);
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Créditos en mora" valor={r.creditos} detalle={`${r.porcentajeCreditos} % de ${base.activos} activos`} tono={r.creditos ? "danger" : undefined} />
        <Kpi titulo="Saldo vencido" valor={soles(r.saldoVencido)} detalle={`${r.porcentajeCartera} % de la cartera vigente`} tono={r.saldoVencido ? "danger" : undefined} />
        <Kpi titulo="Mora pendiente" valor={soles(r.moraPendiente)} detalle="Penalidades aún no cobradas" />
        <Kpi titulo="Saldo total en riesgo" valor={soles(r.saldoTotalEnRiesgo)} detalle={`Cartera vigente ${soles(base.cartera)}`} />
      </div>
      <Panel titulo="Mora por tramo de atraso" className="mb-6">
        <ul className="grid gap-4 text-sm">
          {r.tramos.map((t) => (
            <li key={t.tramo}>
              <div className="mb-1 flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{ETIQUETA_TRAMO[t.tramo]}</span>
                <span className="tabular">{t.creditos} {t.creditos === 1 ? "crédito" : "créditos"} · {soles(t.saldoVencido)} · {t.porcentajeCartera} % de la cartera</span>
              </div>
              <Barra porcentaje={r.saldoVencido ? (t.saldoVencido / r.saldoVencido) * 100 : 0} tono={t.tramo === "MORA_MAS_30" ? "danger" : t.tramo === "MORA_1_7" ? "gold" : "brand"} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">El tramo se calcula por la cuota vencida más antigua de cada crédito.</p>
      </Panel>
      {filas.length === 0 ? (
        <Vacio>No hay créditos en mora{filtros.tipo || filtros.asesor || filtros.sucursal ? " con esos filtros" : ""}. 🎉</Vacio>
      ) : (
        <>
          <Tabla>
            <thead><tr><th>Crédito</th><th>Cliente</th><th>Tramo</th><th className="text-right">Días</th><th className="text-right">Cuotas</th><th className="text-right">Vencido</th><th className="text-right">Mora</th><th></th></tr></thead>
            <tbody className="tabular">
              {filas.slice(0, FILAS_EN_PANTALLA).map((f) => (
                <tr key={f.codigo}>
                  <td className="whitespace-nowrap font-mono text-xs">{f.codigo}<span className="block font-sans text-muted">{tipoCorto(f.tipo)}</span></td>
                  <td>{f.cliente}<span className="block text-xs text-muted">{f.asesor ?? "Sin asesor"}</span></td>
                  <td className="whitespace-nowrap">{ETIQUETA_TRAMO[f.tramo]}</td>
                  <td className={cn("text-right font-semibold", f.dias_atraso > 30 && "text-danger")}>{f.dias_atraso}</td>
                  <td className="text-right">{f.cuotas_vencidas}</td>
                  <td className="text-right">{f.saldo_vencido.toFixed(2)}</td>
                  <td className="text-right">{f.mora_pendiente.toFixed(2)}</td>
                  <td>{f.credito_id && <Link href={`/admin/creditos/${f.credito_id}/pagar`} className="text-xs font-semibold text-brand">Cobrar</Link>}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Recorte total={filas.length} />
        </>
      )}
    </>
  );
}

function Cancelados({ filas }: { filas: FilaCancelado[] }) {
  const t = totalesCancelados(filas);
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Créditos cancelados" valor={t.creditos} detalle={`Duración promedio ${t.diasPromedio} días`} />
        <Kpi titulo="Sin ninguna cuota atrasada" valor={`${t.porcentajeSinAtraso} %`} detalle={`${t.sinAtraso} de ${t.creditos}`} tono="accent" />
        <Kpi titulo="Total pagado" valor={soles(t.pagado)} detalle={`Financiado ${soles(t.financiado)}`} />
        <Kpi titulo="Intereses y mora" valor={soles(t.intereses + t.moraCobrada)} detalle={`Mora ${soles(t.moraCobrada)}`} />
      </div>
      {filas.length === 0 ? (
        <Vacio>No hay créditos cancelados en ese rango.</Vacio>
      ) : (
        <>
          <Tabla>
            <thead><tr><th>Cancelado</th><th>Crédito</th><th>Cliente</th><th className="text-right">Días</th><th className="text-right">Financiado</th><th className="text-right">Pagado</th><th className="text-right">Cuotas con atraso</th></tr></thead>
            <tbody className="tabular">
              {filas.slice(0, FILAS_EN_PANTALLA).map((f) => (
                <tr key={f.codigo}>
                  <td className="whitespace-nowrap">{fecha(f.fecha_cancelacion)}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{f.codigo}<span className="block font-sans text-muted">{tipoCorto(f.tipo)}</span></td>
                  <td>{f.cliente}<span className="block text-xs text-muted">{f.asesor ?? "Sin asesor"}</span></td>
                  <td className="text-right">{f.dias_credito}</td>
                  <td className="text-right">{f.monto_financiado.toFixed(2)}</td>
                  <td className="text-right">{f.total_pagado.toFixed(2)}</td>
                  <td className={cn("text-right", f.cuotas_con_atraso > 0 && "font-semibold text-danger")}>{f.cuotas_con_atraso} / {f.numero_cuotas}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          <Recorte total={filas.length} />
        </>
      )}
    </>
  );
}
