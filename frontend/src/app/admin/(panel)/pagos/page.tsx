import Link from "next/link";
import { Encabezado, Tabla, Vacio } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { inputClasses } from "@/components/ui/Field";
import { tiposDe } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { ETIQUETA_METODO, METODOS_PAGO, resumenCaja, type MetodoPago } from "@/lib/pagos";
import { requerirSesion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";

export const metadata = { title: "Pagos" };

const esFecha = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));

interface Fila {
  id: string; numero_recibo: string; created_at: Date; credito_id: string; codigo: string; cliente_id: string; cliente: string;
  monto: number; metodo: MetodoPago; numero_operacion: string | null; registrado_por: string | null; anulado: boolean; voucher: boolean;
}

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; metodo?: string; usuario?: string; q?: string }> }) {
  const sesion = await requerirSesion();
  const tipos = tiposDe(sesion.rol);
  const sp = await searchParams;
  const db = sql();
  const hoy = await hoyLima(db);
  const desde = esFecha(sp.desde) ? sp.desde! : hoy;
  const hasta = esFecha(sp.hasta) && sp.hasta! >= desde ? sp.hasta! : desde;
  const metodo = METODOS_PAGO.includes(sp.metodo as MetodoPago) ? (sp.metodo as MetodoPago) : null;
  const usuario = /^[0-9a-f-]{36}$/.test(sp.usuario ?? "") ? sp.usuario! : null;
  const q = (sp.q ?? "").trim().slice(0, 60);

  const [pagos, usuarios] = await Promise.all([
    db<Fila[]>`
      select p.id, p.numero_recibo::text, p.created_at, cr.id as credito_id, cr.codigo, cl.id as cliente_id,
             cl.nombres || ' ' || cl.apellidos as cliente, p.monto::float8, p.metodo, p.numero_operacion,
             nullif(trim(coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')), '') as registrado_por, p.anulado,
             exists (select 1 from public.voucher_pago v where v.pago_id = p.id) as voucher
      from public.pago p
      join public.credito cr on cr.id = p.credito_id
      join public.cliente cl on cl.id = cr.cliente_id
      left join public.perfil_usuario u on u.id = p.registrado_por
      where p.fecha_pago between ${desde} and ${hasta}
        and cr.tipo::text = any(${tipos})
        and (${metodo}::text is null or p.metodo::text = ${metodo})
        and (${usuario}::uuid is null or p.registrado_por = ${usuario})
        and (${q} = '' or cr.codigo ilike ${"%" + q + "%"} or cl.numero_documento = ${q}
             or (cl.nombres || ' ' || cl.apellidos) ilike ${"%" + q + "%"} or p.numero_operacion = ${q})
      order by p.created_at desc
      limit 500`,
    db<{ id: string; nombre: string }[]>`
      select id, nombres || ' ' || apellidos as nombre from public.perfil_usuario where activo order by nombres`,
  ]);
  const r = resumenCaja(pagos);
  const anulados = pagos.filter((p) => p.anulado).length;
  const ctl = cn(inputClasses(), "py-2 text-sm");

  return (
    <>
      <Encabezado titulo="Pagos" acciones={<Link href="/admin/caja" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand">Cierre de caja</Link>}>
        Pagos registrados {desde === hasta ? `el ${desde.split("-").reverse().join("/")}` : `del ${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")}`}.
        Para registrar uno, entra al crédito o a Cobranzas.
      </Encabezado>

      <form className="mb-5 grid gap-3 rounded-2xl border border-line-soft bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <label className="text-xs font-semibold text-muted">Desde<input type="date" name="desde" defaultValue={desde} className={ctl} /></label>
        <label className="text-xs font-semibold text-muted">Hasta<input type="date" name="hasta" defaultValue={hasta} className={ctl} /></label>
        <label className="text-xs font-semibold text-muted">Método
          <select name="metodo" defaultValue={metodo ?? ""} className={cn(ctl, "cursor-pointer")}>
            <option value="">Todos</option>
            {METODOS_PAGO.map((m) => <option key={m} value={m}>{ETIQUETA_METODO[m]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Registrado por
          <select name="usuario" defaultValue={usuario ?? ""} className={cn(ctl, "cursor-pointer")}>
            <option value="">Todos</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Buscar<input name="q" defaultValue={q} placeholder="Cliente, DNI, código u operación" className={ctl} /></label>
        <button type="submit" className="cursor-pointer self-end rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Filtrar</button>
      </form>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Cobrado", formatSoles(r.total, true)],
          ["Efectivo", formatSoles(r.efectivo, true)],
          ["Yape / Plin / bancos", formatSoles(r.digital, true)],
          ["Pagos", `${r.cantidad}${anulados ? ` (+${anulados} anulado${anulados > 1 ? "s" : ""})` : ""}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line-soft bg-surface p-4 shadow-card">
            <div className="text-xs text-muted">{k}</div>
            <div className="text-lg font-bold tabular">{v}</div>
          </div>
        ))}
      </div>

      {pagos.length === 0 ? (
        <Vacio>No hay pagos con esos filtros.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr><th>Recibo</th><th>Cliente</th><th>Crédito</th><th className="text-right">Monto</th><th>Método</th><th>Registrado</th></tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className={cn(p.anulado && "opacity-60")}>
                <td><Link href={`/admin/pagos/${p.id}`} className="font-mono text-xs font-semibold text-brand hover:underline">{p.numero_recibo.padStart(6, "0")}</Link></td>
                <td><Link href={`/admin/clientes/${p.cliente_id}`} className="hover:text-brand">{p.cliente}</Link></td>
                <td><Link href={`/admin/creditos/${p.credito_id}`} className="font-mono text-xs hover:text-brand">{p.codigo}</Link></td>
                <td className={cn("text-right font-semibold tabular whitespace-nowrap", p.anulado && "line-through")}>{formatSoles(p.monto, true)}</td>
                <td className="whitespace-nowrap">
                  {ETIQUETA_METODO[p.metodo]}{p.numero_operacion && <span className="block text-xs text-muted">Op. {p.numero_operacion}</span>}
                  {p.voucher && <span className="text-xs text-muted"> · voucher</span>}
                  {p.anulado && <Badge tone="outline" className="ml-1">anulado</Badge>}
                </td>
                <td className="text-xs text-muted whitespace-nowrap">
                  {new Date(p.created_at).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  <span className="block">{p.registrado_por ?? "Sistema anterior"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
