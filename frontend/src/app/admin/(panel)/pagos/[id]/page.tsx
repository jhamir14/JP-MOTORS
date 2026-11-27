import Link from "next/link";
import { notFound } from "next/navigation";
import { pagoEnArea } from "@/lib/server/areas";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { BotonImprimir } from "@/components/admin/BotonImprimir";
import { CampoArea, Encabezado, Panel, Tabla, fechaCorta } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { siteConfig } from "@/lib/config";
import { formatSoles } from "@/lib/format";
import { ETIQUETA_METODO, puedeAnularPagos, type MetodoPago } from "@/lib/pagos";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { anularPago } from "../actions";
import { buttonClasses } from "@/components/ui/Button";
import { mensajeRecibo } from "@/lib/documentos";
import { enlaceRecordatorio } from "@/lib/recordatorios";
import { origenPublico } from "@/lib/server/documentos";

export const metadata = { title: "Pago" };

interface Pago {
  id: string; numero_recibo: string; credito_id: string; codigo: string; cliente: string; documento: string; monto: number; metodo: MetodoPago;
  numero_operacion: string | null; fecha_pago: string; registrado_por: string | null; created_at: Date; anulado: boolean;
  motivo_anulacion: string | null; anulado_por: string | null; anulado_at: Date | null; notas: string | null;
  voucher_id: string | null; voucher_mime: string | null; saldo: number; token_recibo: string; nombres: string; telefono: string | null;
}

const fecha = (iso: string) => iso.split("-").reverse().join("/");

export default async function PagoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string; anulado?: string }> }) {
  const sesion = await requerirSesion();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  // Cada administrador de área solo abre lo suyo.
  if (!(await pagoEnArea(sesion, id))) notFound();
  const db = sql();
  const nombre = (t: string) => db.unsafe(`nullif(trim(coalesce(${t}.nombres, '') || ' ' || coalesce(${t}.apellidos, '')), '')`);
  const [p] = await db<Pago[]>`
    select p.id, p.numero_recibo::text, p.credito_id, cr.codigo, cl.nombres || ' ' || cl.apellidos as cliente,
           case when cl.numero_documento ~* '^(SIN-?DOC|OLD)' then 'Sin DNI' else cl.tipo_documento || ' ' || cl.numero_documento end as documento, p.monto::float8, p.metodo, p.numero_operacion,
           to_char(p.fecha_pago, 'YYYY-MM-DD') as fecha_pago, ${nombre("pr")} as registrado_por, p.created_at, p.anulado,
           p.motivo_anulacion, ${nombre("pa")} as anulado_por, p.anulado_at, p.notas, v.id as voucher_id, v.tipo_mime as voucher_mime,
           p.token_recibo, cl.nombres, cl.telefono,
           (select coalesce(sum(greatest(cu.monto_cuota + cu.mora - cu.monto_pagado, 0)), 0) from public.cuota cu
            where cu.credito_id = cr.id and cu.estado <> 'PAGADA')::float8 as saldo
    from public.pago p
    join public.credito cr on cr.id = p.credito_id
    join public.cliente cl on cl.id = cr.cliente_id
    left join public.perfil_usuario pr on pr.id = p.registrado_por
    left join public.perfil_usuario pa on pa.id = p.anulado_por
    left join public.voucher_pago v on v.pago_id = p.id
    where p.id = ${id}`;
  if (!p) notFound();
  const aplicaciones = await db<{ numero: number; vence: string; mora: number; interes: number; capital: number; total: number }[]>`
    select cu.numero, to_char(cu.fecha_vencimiento, 'YYYY-MM-DD') as vence, ap.mora::float8, ap.interes::float8, ap.capital::float8, ap.total::float8
    from public.aplicacion_pago ap join public.cuota cu on cu.id = ap.cuota_id
    where ap.pago_id = ${id} order by cu.fecha_vencimiento, cu.numero`;
  const suma = (k: "mora" | "interes" | "capital" | "total") => aplicaciones.reduce((s, a) => s + a[k], 0);
  const enlaceRecibo = `${await origenPublico()}/r/${p.token_recibo}`;
  const whatsapp = p.anulado
    ? null
    : enlaceRecordatorio(p.telefono, mensajeRecibo({
        nombres: p.nombres, empresa: siteConfig.name, numeroRecibo: p.numero_recibo, monto: p.monto, codigoCredito: p.codigo, saldo: p.saldo, enlace: enlaceRecibo,
      }));

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/pagos" className="text-sm font-medium text-muted hover:text-brand">← Pagos</Link>
        <Link href={`/admin/creditos/${p.credito_id}`} className="text-sm font-semibold text-brand">Crédito {p.codigo} →</Link>
      </div>
      <Encabezado titulo={`Pago N.° ${p.numero_recibo.padStart(6, "0")}`} acciones={
        <>
          <a href={`/api/documentos/pago/${p.id}`} target="_blank" rel="noopener" className={buttonClasses({ variant: "outline", size: "sm" }, "print:hidden")}>Recibo PDF</a>
          <BotonImprimir>Imprimir</BotonImprimir>
        </>
      }>
        {p.cliente} ({p.documento}) · {fecha(p.fecha_pago)}
      </Encabezado>

      {sp.nuevo && !p.anulado && (
        <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent print:hidden">
          Pago registrado y aplicado a {aplicaciones.length} cuota{aplicaciones.length === 1 ? "" : "s"}. Saldo del crédito: {formatSoles(p.saldo, true)}.
        </p>
      )}
      {!p.anulado && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line-soft bg-surface px-4 py-3 print:hidden">
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "whatsapp", size: "sm" })}>
              Enviar recibo por WhatsApp
            </a>
          ) : (
            <span className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted">El cliente no tiene un celular válido</span>
          )}
          <span className="text-xs text-muted">
            El cliente recibe un enlace a su recibo en PDF (con el DNI oculto). El enlace es único para este pago y no se puede adivinar.
          </span>
        </div>
      )}
      {p.anulado && (
        <div role={sp.anulado ? "status" : undefined} className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          <strong className="text-danger">Pago anulado</strong>
          {p.anulado_at && <> el {fechaCorta(p.anulado_at)}</>}{p.anulado_por && <> por {p.anulado_por}</>}. Motivo: {p.motivo_anulacion}.
          Las cuotas volvieron a quedar pendientes.
        </div>
      )}

      <p className="mb-4 hidden text-sm print:block">
        <strong>{siteConfig.name}</strong> · RUC {siteConfig.ruc} · Constancia de pago (no es comprobante electrónico)
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] [&>*]:min-w-0">
        <Panel titulo="Datos del pago">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted">Monto</dt><dd className="text-xl font-bold tabular">{formatSoles(p.monto, true)}</dd></div>
            <div><dt className="text-xs text-muted">Estado</dt><dd>{p.anulado ? <Badge tone="outline">anulado</Badge> : <Badge tone="accent">vigente</Badge>}</dd></div>
            <div><dt className="text-xs text-muted">Método</dt><dd className="font-semibold">{ETIQUETA_METODO[p.metodo]}</dd></div>
            <div><dt className="text-xs text-muted">N.º de operación</dt><dd className="font-semibold break-words">{p.numero_operacion ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Crédito</dt><dd className="font-mono text-xs">{p.codigo}</dd></div>
            <div><dt className="text-xs text-muted">Saldo del crédito hoy</dt><dd className="font-semibold tabular">{formatSoles(p.saldo, true)}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-muted">Registrado</dt><dd>{fechaCorta(p.created_at)}{p.registrado_por ? ` por ${p.registrado_por}` : " (migrado del sistema anterior)"}</dd></div>
            {p.notas && <div className="col-span-2"><dt className="text-xs text-muted">Notas</dt><dd className="whitespace-pre-line">{p.notas}</dd></div>}
          </dl>
          {p.voucher_id && (
            <a href={`/api/vouchers/${p.voucher_id}`} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline print:hidden">
              Ver voucher ({p.voucher_mime === "application/pdf" ? "PDF" : "foto"}) ↗
            </a>
          )}
        </Panel>

        <Panel titulo="Aplicado a">
          <Tabla className="shadow-none">
            <thead>
              <tr><th>Cuota</th><th>Vence</th><th className="text-right">Mora</th><th className="text-right">Interés</th><th className="text-right">Capital</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody className="tabular">
              {aplicaciones.map((a) => (
                <tr key={a.numero}>
                  <td>N.° {a.numero}</td>
                  <td>{fecha(a.vence)}</td>
                  <td className="text-right">{a.mora.toFixed(2)}</td>
                  <td className="text-right">{a.interes.toFixed(2)}</td>
                  <td className="text-right">{a.capital.toFixed(2)}</td>
                  <td className="text-right font-semibold">{a.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold tabular [&_td]:px-4 [&_td]:py-3">
              <tr className="border-t border-line">
                <td colSpan={2}>Total</td>
                <td className="text-right">{suma("mora").toFixed(2)}</td>
                <td className="text-right">{suma("interes").toFixed(2)}</td>
                <td className="text-right">{suma("capital").toFixed(2)}</td>
                <td className="text-right">{suma("total").toFixed(2)}</td>
              </tr>
            </tfoot>
          </Tabla>
        </Panel>
      </div>

      {!p.anulado && puedeAnularPagos(sesion.rol) && (
        <Panel className="mt-6 print:hidden" titulo="Anular pago">
          <AdminForm action={anularPago} className="grid gap-3">
            <input type="hidden" name="pagoId" value={p.id} />
            <p className="text-sm text-muted">
              Solo si el pago se registró por error (monto o crédito equivocado, duplicado, voucher falso). Las cuotas vuelven a quedar
              pendientes y el motivo queda en la auditoría. No se puede deshacer: si el pago era real, regístralo de nuevo con los datos correctos.
            </p>
            <CampoArea label="Motivo de la anulación" name="motivo" id="motivo-anulacion" rows={2} required minLength={10} maxLength={500} />
            <BotonEnviar variant="outline" size="sm" className="justify-self-start border-danger text-danger" pendiente="Anulando…">Anular pago</BotonEnviar>
          </AdminForm>
        </Panel>
      )}
    </>
  );
}
