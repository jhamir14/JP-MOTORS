import Link from "next/link";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoArea, CampoTexto, Encabezado, Panel, Tabla, Vacio, fechaCorta } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { ETIQUETA_METODO, puedeAnularPagos, resumenCaja, type MetodoPago } from "@/lib/pagos";
import { requerirSeccion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { cerrarCaja, reabrirCaja } from "../pagos/actions";

export const metadata = { title: "Caja" };

interface Cierre {
  id: string; usuario_id: string; usuario: string; total_efectivo: number; total_digital: number; efectivo_contado: number | null;
  diferencia: number; cantidad_pagos: number; observaciones: string | null; created_at: Date;
}

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const sesion = await requerirSeccion("caja");
  const admin = puedeAnularPagos(sesion.rol);
  const sp = await searchParams;
  const db = sql();
  const hoy = await hoyLima(db);
  const fecha = admin && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : hoy;

  const [mios, cierres, porUsuario] = await Promise.all([
    db<{ id: string; monto: number; metodo: MetodoPago; anulado: boolean; codigo: string; cliente: string; numero_recibo: string }[]>`
      select p.id, p.monto::float8, p.metodo, p.anulado, cr.codigo, cl.nombres || ' ' || cl.apellidos as cliente, p.numero_recibo::text
      from public.pago p join public.credito cr on cr.id = p.credito_id join public.cliente cl on cl.id = cr.cliente_id
      where p.registrado_por = ${sesion.usuarioId} and p.fecha_pago = ${hoy}
      order by p.created_at`,
    db<Cierre[]>`
      select c.id, c.usuario_id, u.nombres || ' ' || u.apellidos as usuario, c.total_efectivo::float8, c.total_digital::float8,
             c.efectivo_contado::float8, c.diferencia::float8, c.cantidad_pagos, c.observaciones, c.created_at
      from public.cierre_caja c join public.perfil_usuario u on u.id = c.usuario_id
      where c.fecha = ${fecha} and (${admin} or c.usuario_id = ${sesion.usuarioId})
      order by c.created_at`,
    admin
      ? db<{ usuario_id: string; usuario: string; efectivo: number; digital: number; cantidad: number }[]>`
          select p.registrado_por as usuario_id, u.nombres || ' ' || u.apellidos as usuario,
                 coalesce(sum(p.monto) filter (where p.metodo = 'EFECTIVO'), 0)::float8 as efectivo,
                 coalesce(sum(p.monto) filter (where p.metodo <> 'EFECTIVO'), 0)::float8 as digital, count(*)::int as cantidad
          from public.pago p join public.perfil_usuario u on u.id = p.registrado_por
          where p.fecha_pago = ${fecha} and not p.anulado
          group by p.registrado_por, u.nombres, u.apellidos order by usuario`
      : Promise.resolve([]),
  ]);
  const r = resumenCaja(mios);
  const miCierre = fecha === hoy ? cierres.find((c) => c.usuario_id === sesion.usuarioId) : undefined;
  const pendientes = porUsuario.filter((u) => !cierres.some((c) => c.usuario_id === u.usuario_id));

  return (
    <>
      <Encabezado titulo="Caja">
        Cierre de caja de cada cobrador: el sistema suma los pagos que registraste hoy; tú cuentas el efectivo y la diferencia queda registrada.
      </Encabezado>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel titulo={`Mi caja de hoy (${hoy.split("-").reverse().join("/")})`}>
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            {[["Efectivo", r.efectivo], ["Digital", r.digital], ["Total", r.total]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-surface-2 p-3">
                <div className="text-xs text-muted">{k}</div>
                <div className="font-bold tabular">{formatSoles(v as number, true)}</div>
              </div>
            ))}
          </div>
          {mios.length === 0 ? (
            <Vacio>Todavía no registraste pagos hoy.</Vacio>
          ) : (
            <ul className="divide-y divide-line-soft text-sm">
              {mios.map((p) => (
                <li key={p.id} className={cn("flex items-center justify-between gap-3 py-2", p.anulado && "opacity-50 line-through")}>
                  <Link href={`/admin/pagos/${p.id}`} className="min-w-0 hover:text-brand">
                    <span className="font-mono text-xs">{p.numero_recibo.padStart(6, "0")}</span> · {p.cliente}
                    <span className="block text-xs text-muted">{p.codigo} · {ETIQUETA_METODO[p.metodo]}</span>
                  </Link>
                  <span className="font-semibold tabular whitespace-nowrap">{formatSoles(p.monto, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Cerrar mi caja">
          {miCierre ? (
            <div className="text-sm">
              <p className="mb-2 rounded-xl bg-accent-soft px-3 py-2 font-medium text-accent">Caja cerrada el {fechaCorta(miCierre.created_at)}.</p>
              <p>Efectivo según sistema: <strong>{formatSoles(miCierre.total_efectivo, true)}</strong></p>
              <p>Efectivo contado: <strong>{formatSoles(miCierre.efectivo_contado ?? 0, true)}</strong></p>
              <p>Diferencia: <strong className={cn(miCierre.diferencia < 0 && "text-danger")}>{formatSoles(miCierre.diferencia, true)}</strong></p>
              <p className="mt-2 text-xs text-muted">Para registrar más pagos hoy, un administrador debe reabrir tu caja.</p>
            </div>
          ) : (
            <AdminForm action={cerrarCaja} className="grid gap-3">
              <p className="text-sm text-muted">
                Cuenta el efectivo que tienes de los cobros de hoy ({formatSoles(r.efectivo, true)} según el sistema). Yape, Plin y transferencias
                se toman como recibidos. Después de cerrar ya no podrás registrar pagos hoy.
              </p>
              <CampoTexto label="Efectivo contado (S/)" name="efectivoContado" inputMode="decimal" required placeholder={r.efectivo.toFixed(2)} />
              <CampoArea label="Observaciones (opcional)" name="observaciones" rows={2} maxLength={500} />
              <BotonEnviar variant="brand" size="sm" className="justify-self-start" pendiente="Cerrando…">Cerrar caja</BotonEnviar>
            </AdminForm>
          )}
        </Panel>
      </div>

      {admin && (
        <Panel className="mt-6" titulo="Cierres del equipo">
          <form className="mb-4 flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-muted">
              Fecha
              <input type="date" name="fecha" defaultValue={fecha} className="mt-1 block rounded-xl border border-line bg-surface px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand">Ver</button>
          </form>
          {cierres.length === 0 && pendientes.length === 0 ? (
            <Vacio>No hay pagos ni cierres ese día.</Vacio>
          ) : (
            <Tabla className="shadow-none">
              <thead>
                <tr><th>Usuario</th><th className="text-right">Pagos</th><th className="text-right">Efectivo sistema</th><th className="text-right">Contado</th><th className="text-right">Diferencia</th><th className="text-right">Digital</th><th>Estado</th></tr>
              </thead>
              <tbody className="tabular">
                {cierres.map((c) => (
                  <tr key={c.id}>
                    <td>{c.usuario}{c.observaciones && <span className="block text-xs text-muted">{c.observaciones}</span>}</td>
                    <td className="text-right">{c.cantidad_pagos}</td>
                    <td className="text-right">{c.total_efectivo.toFixed(2)}</td>
                    <td className="text-right">{(c.efectivo_contado ?? 0).toFixed(2)}</td>
                    <td className={cn("text-right font-semibold", c.diferencia < 0 && "text-danger", c.diferencia > 0 && "text-accent")}>{c.diferencia.toFixed(2)}</td>
                    <td className="text-right">{c.total_digital.toFixed(2)}</td>
                    <td>
                      <span className="text-xs text-muted">Cerrada {fechaCorta(c.created_at)}</span>
                      <form action={reabrirCaja}>
                        <input type="hidden" name="cierreId" value={c.id} />
                        <button type="submit" className="cursor-pointer text-xs font-semibold text-brand hover:underline">Reabrir</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {pendientes.map((u) => (
                  <tr key={u.usuario_id}>
                    <td>{u.usuario}</td>
                    <td className="text-right">{u.cantidad}</td>
                    <td className="text-right">{u.efectivo.toFixed(2)}</td>
                    <td className="text-right">—</td>
                    <td className="text-right">—</td>
                    <td className="text-right">{u.digital.toFixed(2)}</td>
                    <td><Badge tone="gold">sin cerrar</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Panel>
      )}
    </>
  );
}
