import Link from "next/link";
import { BotonRecordatorio } from "@/components/admin/BotonRecordatorio";
import { Encabezado, Panel, Tabla, Vacio } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ETIQUETA_SERVICIO } from "@/lib/admin/constantes";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { fechaLarga, diasEntre } from "@/lib/recordatorios";
import { requerirSesion } from "@/lib/server/auth";
import { creditosPorCobrar, type CreditoPorCobrar } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { registrarRecordatorio } from "./actions";

export const metadata = { title: "Cobranzas" };

const PESTANAS = [
  { id: "mora", etiqueta: "En mora" },
  { id: "hoy", etiqueta: "Vencen hoy" },
  { id: "proximos", etiqueta: "Próximos 3 días" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

function filtrar(c: CreditoPorCobrar, pestana: Pestana, hoy: string) {
  if (pestana === "mora") return c.situacion === "MORA";
  if (pestana === "hoy") return c.situacion === "VENCE_HOY";
  return c.situacion === "POR_VENCER" && c.proxima != null && diasEntre(hoy, c.proxima.fecha) <= 3;
}

const tramo = (dias: number) => (dias <= 7 ? "1–7 días" : dias <= 15 ? "8–15 días" : dias <= 30 ? "16–30 días" : "+30 días");

export default async function CobranzasPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requerirSesion();
  const { ver } = await searchParams;
  const pestana: Pestana = PESTANAS.some((p) => p.id === ver) ? (ver as Pestana) : "mora";
  const { hoy, creditos } = await creditosPorCobrar(sql());
  const conteo = Object.fromEntries(PESTANAS.map((p) => [p.id, creditos.filter((c) => filtrar(c, p.id, hoy)).length])) as Record<Pestana, number>;
  const lista = creditos.filter((c) => filtrar(c, pestana, hoy)).sort((a, b) => (pestana === "mora" ? b.diasAtraso - a.diasAtraso : 0));
  const totalVencido = creditos.reduce((s, c) => s + c.vencido, 0);

  return (
    <>
      <Encabezado titulo="Cobranzas">
        {fechaLarga(hoy).replace(/^./, (l) => l.toUpperCase())} · Envía el recordatorio por WhatsApp al celular del cliente con el mensaje ya
        escrito. Queda registrado quién lo envió. Total vencido en cartera: <strong className="text-fg">{formatSoles(totalVencido, true)}</strong>.
      </Encabezado>

      <div className="mb-5 flex flex-wrap gap-2">
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
      </div>

      {lista.length === 0 ? (
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
              <th>Recordatorio</th>
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
                    <Badge tone={c.diasAtraso > 15 ? "outline" : "gold"}>{c.diasAtraso} d · {tramo(c.diasAtraso)}</Badge>
                  ) : (
                    <span className="text-sm">{c.proxima ? fechaLarga(c.proxima.fecha) : "—"}</span>
                  )}
                </td>
                <td>
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
          <li>El registro de pagos llega con el módulo de pagos (Fase 5).</li>
        </ul>
      </Panel>
    </>
  );
}
