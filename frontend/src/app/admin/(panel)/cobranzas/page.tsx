import Link from "next/link";
import { BotonRecordatorio } from "@/components/admin/BotonRecordatorio";
import { Encabezado, Panel, Tabla, Vacio } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ETIQUETA_SERVICIO } from "@/lib/admin/constantes";
import { ETIQUETA_AREA, areaDe, tiposDe } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { ETIQUETA_METODO, TRAMOS_MORA, tramoMora, type MetodoPago, type TramoMora } from "@/lib/pagos";
import { fechaLarga, diasEntre } from "@/lib/recordatorios";
import { requerirSesion } from "@/lib/server/auth";
import { creditosPorCobrar, type CreditoPorCobrar } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { registrarRecordatorio } from "./actions";

export const metadata = { title: "Cobranzas" };

const PESTANAS = [
  { id: "hoy", etiqueta: "Por cobrar hoy" },
  { id: "mora", etiqueta: "En mora" },
  { id: "proximos", etiqueta: "Próximos 3 días" },
  { id: "pagados", etiqueta: "Pagados hoy" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

function filtrar(c: CreditoPorCobrar, pestana: Pestana, hoy: string) {
  if (pestana === "mora") return c.situacion === "MORA";
  if (pestana === "hoy") return c.situacion === "VENCE_HOY";
  if (pestana === "proximos") return c.situacion === "POR_VENCER" && c.proxima != null && diasEntre(hoy, c.proxima.fecha) <= 3;
  return false;
}

const etiquetaTramo = (dias: number) => TRAMOS_MORA.find((t) => t.id === tramoMora(dias))!.etiqueta;

interface PagoHoy {
  id: string; numero_recibo: string; credito_id: string; codigo: string; cliente_id: string; cliente: string; monto: number;
  metodo: MetodoPago; registrado_por: string | null; created_at: Date;
}

export default async function CobranzasPage({ searchParams }: { searchParams: Promise<{ ver?: string; tramo?: string }> }) {
  const sesion = await requerirSesion();
  // Cada administrador de área cobra solo lo suyo (préstamos, motos o celulares).
  const tipos = tiposDe(sesion.rol);
  const area = areaDe(sesion.rol);
  const { ver, tramo: tramoParam } = await searchParams;
  const pestana: Pestana = PESTANAS.some((p) => p.id === ver) ? (ver as Pestana) : "hoy";
  const tramo = TRAMOS_MORA.some((t) => t.id === tramoParam) ? (tramoParam as TramoMora) : null;
  const db = sql();
  const [{ hoy, creditos }, pagosHoy] = await Promise.all([
    creditosPorCobrar(db, { tipos }),
    db<PagoHoy[]>`
      select p.id, p.numero_recibo::text, cr.id as credito_id, cr.codigo, cl.id as cliente_id, cl.nombres || ' ' || cl.apellidos as cliente,
             p.monto::float8, p.metodo, nullif(trim(coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')), '') as registrado_por, p.created_at
      from public.pago p
      join public.credito cr on cr.id = p.credito_id
      join public.cliente cl on cl.id = cr.cliente_id
      left join public.perfil_usuario u on u.id = p.registrado_por
      where p.fecha_pago = public.hoy_lima() and not p.anulado and cr.tipo::text = any(${tipos})
      order by p.created_at desc`,
  ]);
  const conteo = Object.fromEntries(PESTANAS.map((p) => [p.id, creditos.filter((c) => filtrar(c, p.id, hoy)).length])) as Record<Pestana, number>;
  conteo.pagados = pagosHoy.length;
  const enMora = creditos.filter((c) => filtrar(c, "mora", hoy));
  const conteoTramo = Object.fromEntries(TRAMOS_MORA.map((t) => [t.id, enMora.filter((c) => tramoMora(c.diasAtraso) === t.id).length])) as Record<TramoMora, number>;
  const lista = creditos
    .filter((c) => filtrar(c, pestana, hoy) && (pestana !== "mora" || !tramo || tramoMora(c.diasAtraso) === tramo))
    .sort((a, b) => (pestana === "mora" ? b.diasAtraso - a.diasAtraso : 0));
  const totalVencido = creditos.reduce((s, c) => s + c.vencido, 0);
  const cobradoHoy = pagosHoy.reduce((s, p) => s + p.monto, 0);

  return (
    <>
      <Encabezado titulo={area ? `Cobranzas · ${ETIQUETA_AREA[area]}` : "Cobranzas"}>
        {fechaLarga(hoy).replace(/^./, (l) => l.toUpperCase())} · Envía el recordatorio por WhatsApp al celular del cliente con el mensaje ya
        escrito y registra los pagos con «Cobrar». Vencido en cartera: <strong className="text-fg">{formatSoles(totalVencido, true)}</strong> ·
        cobrado hoy: <strong className="text-fg">{formatSoles(cobradoHoy, true)}</strong>.
      </Encabezado>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PESTANAS.map((p) => (
          <Link
            key={p.id}
            href={`/admin/cobranzas?ver=${p.id}`}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold",
              pestana === p.id ? "bg-brand text-white" : "border border-line bg-surface hover:border-brand",
            )}
          >
            {p.etiqueta} ({conteo[p.id]})
          </Link>
        ))}
        <a
          href="/api/documentos/cobranzas"
          target="_blank"
          rel="noopener"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-brand bg-brand-soft px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" />
          </svg>
          PDF de pendientes (hoy y en mora)
        </a>
      </div>

      {pestana === "mora" && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Link href="/admin/cobranzas?ver=mora" className={cn("rounded-lg px-3 py-1.5 font-semibold", !tramo ? "bg-brand-soft text-brand" : "border border-line bg-surface")}>
            Todos ({enMora.length})
          </Link>
          {TRAMOS_MORA.map((t) => (
            <Link key={t.id} href={`/admin/cobranzas?ver=mora&tramo=${t.id}`} className={cn("rounded-lg px-3 py-1.5 font-semibold", tramo === t.id ? "bg-brand-soft text-brand" : "border border-line bg-surface")}>
              {t.etiqueta} ({conteoTramo[t.id]})
            </Link>
          ))}
        </div>
      )}

      {pestana === "pagados" ? (
        pagosHoy.length === 0 ? (
          <Vacio>Todavía no hay pagos registrados hoy.</Vacio>
        ) : (
          <Tabla>
            <thead>
              <tr><th>Recibo</th><th>Cliente</th><th>Crédito</th><th className="text-right">Monto</th><th>Método</th><th>Cobró</th></tr>
            </thead>
            <tbody>
              {pagosHoy.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/pagos/${p.id}`} className="font-mono text-xs font-semibold text-brand hover:underline">{p.numero_recibo.padStart(6, "0")}</Link></td>
                  <td><Link href={`/admin/clientes/${p.cliente_id}`} className="hover:text-brand">{p.cliente}</Link></td>
                  <td><Link href={`/admin/creditos/${p.credito_id}`} className="font-mono text-xs hover:text-brand">{p.codigo}</Link></td>
                  <td className="text-right font-semibold tabular whitespace-nowrap">{formatSoles(p.monto, true)}</td>
                  <td>{ETIQUETA_METODO[p.metodo]}</td>
                  <td className="text-xs text-muted whitespace-nowrap">
                    {p.registrado_por ?? "—"} · {new Date(p.created_at).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )
      ) : lista.length === 0 ? (
        <Vacio>
          {pestana === "mora" ? "No hay créditos con cuotas vencidas." : pestana === "hoy" ? "Ninguna cuota vence hoy." : "No hay cuotas en los próximos 3 días."}
        </Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Crédito</th>
              <th className="text-right">{pestana === "mora" ? "Vencido" : "Cuota"}</th>
              <th>{pestana === "mora" ? "Atraso" : "Vence"}</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/clientes/${c.clienteId}`} className="font-semibold text-brand hover:underline">{c.cliente}</Link>
                  <div className="text-xs text-muted">{[c.telefono, c.distrito].filter(Boolean).join(" · ") || "Sin datos de contacto"}</div>
                </td>
                <td>
                  <div className="font-mono text-xs">{c.codigo}</div>
                  <div className="text-xs text-muted">{ETIQUETA_SERVICIO[c.tipo as keyof typeof ETIQUETA_SERVICIO] ?? c.tipo}{c.producto ? ` · ${c.producto}` : ""}</div>
                </td>
                <td className="text-right tabular whitespace-nowrap">
                  {pestana === "mora" ? (
                    <>
                      <strong>{formatSoles(c.vencido, true)}</strong>
                      <div className="text-xs text-muted">{c.cuotasVencidas} cuota{c.cuotasVencidas > 1 ? "s" : ""}</div>
                    </>
                  ) : (
                    formatSoles(c.proxima?.saldo ?? 0, true)
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {pestana === "mora" ? (
                    <Badge tone={c.diasAtraso > 15 ? "outline" : "gold"}>{c.diasAtraso} d · {etiquetaTramo(c.diasAtraso)}</Badge>
                  ) : (
                    <span className="text-sm">{c.proxima ? fechaLarga(c.proxima.fecha) : "—"}</span>
                  )}
                </td>
                <td className="space-y-2">
                  <Link href={`/admin/creditos/${c.id}/pagar`} className="inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover">Cobrar</Link>
                  <BotonRecordatorio href={c.whatsapp} creditoId={c.id} tipo={c.situacion} registrar={registrarRecordatorio} ultimo={c.ultimoRecordatorio} />
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      <Panel className="mt-6" titulo="¿Cómo funciona?">
        <ul className="list-disc pl-5 text-sm text-muted">
          <li>El botón abre WhatsApp (en el celular o en WhatsApp Web) con el mensaje listo para el número que registró el cliente; solo hay que pulsar «Enviar».</li>
          <li>El mensaje cambia según la situación: cuota de hoy, próxima cuota o cuotas vencidas con el total y los días de atraso.</li>
          <li>Los domingos y feriados no se cobran: el cronograma ya los excluye.</li>
          <li>«Cobrar» abre el registro de pago: el monto se aplica a la mora, luego al interés y al capital, empezando por la cuota más antigua.</li>
          <li>La mora (penalidad diaria del crédito por cada día que pasa los días de gracia) se actualiza cada día automáticamente.</li>
          <li>Al terminar el día, cada cobrador cierra su caja en <Link href="/admin/caja" className="font-semibold text-brand">Caja</Link>.</li>
        </ul>
      </Panel>
    </>
  );
}
