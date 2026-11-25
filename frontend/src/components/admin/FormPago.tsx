"use client";
import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { inputClasses } from "@/components/ui/Field";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";
import { ETIQUETA_METODO, METODOS_PAGO, deudaTotal, distribuirPago, requiereOperacion, resumenDeuda, validarPago, type CuotaCobro, type MetodoPago } from "@/lib/pagos";
import { comprimir } from "./SubirDocumento";

const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ctl = cn(inputClasses(), "py-2.5 text-sm");
const etq = "mb-1 block text-xs font-semibold tracking-wide text-muted uppercase";

/**
 * Registro de un pago con vista previa: muestra en vivo cómo se reparte el monto entre las cuotas
 * (mora → interés → capital, en orden de vencimiento). El servidor vuelve a calcular todo antes de guardar.
 */
export function FormPago({
  action,
  creditoId,
  cuotas,
  hoy,
}: {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  creditoId: string;
  cuotas: CuotaCobro[];
  hoy: string;
}) {
  const [estado, dispatch, pendiente] = useActionState(action, null);
  const [preparando, setPreparando] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [operacion, setOperacion] = useState("");

  const resumen = useMemo(() => resumenDeuda(cuotas, hoy), [cuotas, hoy]);
  const deuda = deudaTotal(cuotas);
  const valor = Number(monto);
  const reparto = useMemo(() => (valor > 0 ? distribuirPago(cuotas, valor) : null), [cuotas, valor]);
  const erroresLocales = monto ? validarPago({ monto: valor, metodo, numeroOperacion: operacion }, deuda) : {};
  const errores = { ...(estado?.errores ?? {}), ...erroresLocales };
  const ocupado = pendiente || preparando;

  const atajos = [
    resumen.exigible > 0 && { etiqueta: resumen.vencido > 0 ? "Todo lo vencido + hoy" : "Cuota de hoy", monto: resumen.exigible },
    resumen.exigible === 0 && resumen.proxima && { etiqueta: `Próxima cuota (N.° ${resumen.proxima.numero})`, monto: resumen.proxima.saldo },
    { etiqueta: "Cancelar todo el crédito", monto: resumen.total },
  ].filter(Boolean) as { etiqueta: string; monto: number }[];

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivo = fd.get("voucher");
    if (archivo instanceof File && archivo.size > 0) {
      setPreparando(true);
      fd.set("voucher", await comprimir(archivo));
      setPreparando(false);
    }
    startTransition(() => dispatch(fd));
  };

  const error = (campo: string) =>
    errores[campo] ? <p id={`${campo}-error`} role="alert" className="mt-1 text-xs text-danger">{errores[campo]}</p> : null;

  return (
    <form onSubmit={onSubmit} aria-busy={ocupado} className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <input type="hidden" name="creditoId" value={creditoId} />
      <div className="grid content-start gap-4">
        {estado?.mensaje && !estado.ok && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{estado.mensaje}</p>
        )}
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2 p-4 text-sm tabular">
          <div><dt className="text-xs text-muted">Vencido{resumen.cuotasVencidas ? ` (${resumen.cuotasVencidas} cuota${resumen.cuotasVencidas > 1 ? "s" : ""})` : ""}</dt><dd className={cn("font-semibold", resumen.vencido > 0 && "text-danger")}>{soles(resumen.vencido)}</dd></div>
          <div><dt className="text-xs text-muted">Mora incluida</dt><dd className="font-semibold">{soles(resumen.mora)}</dd></div>
          <div><dt className="text-xs text-muted">Vence hoy</dt><dd className="font-semibold">{soles(resumen.hoy)}</dd></div>
          <div><dt className="text-xs text-muted">Para cancelar todo</dt><dd className="font-semibold">{soles(resumen.total)}</dd></div>
          {resumen.proxima && (
            <div className="col-span-2 text-xs text-muted">
              Próxima: cuota N.° {resumen.proxima.numero} · {soles(resumen.proxima.saldo)} · vence {resumen.proxima.fecha.split("-").reverse().join("/")}
            </div>
          )}
        </dl>

        <div>
          <label htmlFor="monto" className={etq}>Monto recibido (S/)</label>
          <input
            id="monto" name="monto" inputMode="decimal" autoComplete="off" required value={monto}
            onChange={(e) => setMonto(e.target.value.replace(",", "."))}
            aria-invalid={Boolean(errores.monto)} aria-describedby="monto-error" className={cn(ctl, "text-lg font-semibold")} placeholder="0.00"
          />
          {error("monto")}
          <div className="mt-2 flex flex-wrap gap-2">
            {atajos.map((a) => (
              <button key={a.etiqueta} type="button" onClick={() => setMonto(a.monto.toFixed(2))} className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-brand">
                {a.etiqueta}: {soles(a.monto)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="metodo" className={etq}>Método</label>
            <select id="metodo" name="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} className={cn(ctl, "cursor-pointer")}>
              {METODOS_PAGO.map((m) => <option key={m} value={m}>{ETIQUETA_METODO[m]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="numeroOperacion" className={etq}>N.º de operación{requiereOperacion(metodo) ? "" : " (opcional)"}</label>
            <input
              id="numeroOperacion" name="numeroOperacion" value={operacion} onChange={(e) => setOperacion(e.target.value)} maxLength={60}
              required={requiereOperacion(metodo)} aria-describedby="numeroOperacion-error" className={ctl}
            />
            {error("numeroOperacion")}
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="voucher" className={etq}>Voucher / comprobante (foto o PDF, opcional)</label>
          <input
            id="voucher" name="voucher" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            className="block w-full min-w-0 text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
          />
          <p className="mt-1 text-xs text-muted">Se guarda de forma privada. Recomendado para Yape, Plin y transferencias.</p>
          {error("voucher")}
        </div>

        <div>
          <label htmlFor="notas" className={etq}>Notas (opcional)</label>
          <textarea id="notas" name="notas" rows={2} maxLength={500} className={cn(ctl, "resize-y")} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={ocupado || Object.keys(erroresLocales).length > 0 || !monto}>
            {preparando ? "Preparando voucher…" : pendiente ? "Registrando…" : `Registrar pago${valor > 0 ? ` de ${soles(valor)}` : ""}`}
          </Button>
          <Link href={`/admin/creditos/${creditoId}`} className="text-sm font-semibold text-muted hover:text-brand">Cancelar</Link>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold">Cómo se aplica el pago</h3>
        {!reparto || reparto.aplicaciones.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Escribe el monto para ver a qué cuotas se aplica: primero la mora, luego el interés y al final el capital, empezando por la cuota más antigua.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line-soft">
            <table className="w-full text-sm tabular [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:text-muted [&_thead]:bg-surface-2">
              <thead>
                <tr><th className="text-left">Cuota</th><th className="text-right">Mora</th><th className="text-right">Interés</th><th className="text-right">Capital</th><th className="text-right">Total</th><th /></tr>
              </thead>
              <tbody>
                {reparto.aplicaciones.map((a) => (
                  <tr key={a.cuotaId} className="border-t border-line-soft">
                    <td>N.° {a.numero}</td>
                    <td className="text-right">{a.mora ? a.mora.toFixed(2) : "—"}</td>
                    <td className="text-right">{a.interes ? a.interes.toFixed(2) : "—"}</td>
                    <td className="text-right">{a.capital ? a.capital.toFixed(2) : "—"}</td>
                    <td className="text-right font-semibold">{a.total.toFixed(2)}</td>
                    <td className="text-xs">{a.cancela ? <span className="font-semibold text-accent">pagada</span> : <span className="text-muted">parcial</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reparto && reparto.sobrante > 0 && (
          <p className="mt-2 text-xs text-danger">Sobran {soles(reparto.sobrante)}: el monto supera la deuda total del crédito.</p>
        )}
      </div>
    </form>
  );
}
