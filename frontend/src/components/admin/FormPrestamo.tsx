"use client";
import { useMemo, useState } from "react";
import { AdminForm, BotonEnviar, ErrorCampo } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, CampoTexto } from "@/components/admin/ui";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";
import { planCredito, primerVencimientoSugerido, validarCredito, type EntradaCredito } from "@/lib/creditos";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, type Frecuencia } from "@/lib/finance";
import { formatSoles } from "@/lib/format";

interface Tasa { id: string; servicio: string; frecuencia: string; tipoCalculo: string; tasaPorcentaje: number; cuotasMin: number; cuotasMax: number; penalidadDiaria: number }

export interface PropsFormPrestamo {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  clienteId: string;
  garantes: { id: string; nombre: string }[];
  tasas: Tasa[];
  feriados: string[];
  hoy: string;
  topeTea: number | null;
  alertaRiesgo?: string | null;
}

const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const CUOTAS_SUGERIDAS: Record<Frecuencia, number> = { DIARIO: 24, SEMANAL: 4, QUINCENAL: 2, MENSUAL: 1 };

/**
 * Préstamo de dinero: monto, cada cuánto paga, cuántas cuotas y el interés total.
 * El interés es «flat»: un % sobre el monto por todo el plazo (S/ 1,000 al 20 % ⇒ devuelve S/ 1,200).
 */
export function FormPrestamo(props: PropsFormPrestamo) {
  const { hoy, tasas } = props;
  const feriados = useMemo(() => new Set(props.feriados), [props.feriados]);
  const tasaDe = (f: Frecuencia) => tasas.find((t) => t.servicio === "PRESTAMO_EFECTIVO" && t.frecuencia === f);
  const inicial = tasaDe("SEMANAL") ?? tasas[0];
  const frecuenciaInicial = (inicial?.frecuencia ?? "SEMANAL") as Frecuencia;

  const [v, setV] = useState(() => ({
    monto: "",
    frecuencia: frecuenciaInicial,
    numeroCuotas: String(inicial?.cuotasMin ?? CUOTAS_SUGERIDAS[frecuenciaInicial]),
    tasaPorcentaje: String(inicial?.tasaPorcentaje ?? 20),
    penalidadDiaria: String(inicial?.penalidadDiaria ?? 0),
    tasaId: inicial?.id ?? "",
    garanteId: "",
    fechaDesembolso: hoy,
    primerVencimiento: primerVencimientoSugerido(hoy, frecuenciaInicial, feriados),
  }));
  const set = (c: Partial<typeof v>) => setV((p) => ({ ...p, ...c }));
  const vencimientoPara = (desembolso: string, f: Frecuencia) =>
    /^\d{4}-\d{2}-\d{2}$/.test(desembolso) ? primerVencimientoSugerido(desembolso, f, feriados) : v.primerVencimiento;

  const cambiarFrecuencia = (f: Frecuencia) => {
    const t = tasaDe(f);
    set({
      frecuencia: f,
      tasaId: t?.id ?? "",
      numeroCuotas: String(t?.cuotasMin ?? CUOTAS_SUGERIDAS[f]),
      ...(t ? { tasaPorcentaje: String(t.tasaPorcentaje), penalidadDiaria: String(t.penalidadDiaria) } : {}),
      primerVencimiento: vencimientoPara(v.fechaDesembolso, f),
    });
  };

  const entrada: EntradaCredito = {
    tipo: "PRESTAMO_EFECTIVO",
    precio: num(v.monto),
    cuotaInicial: 0,
    numeroCuotas: num(v.numeroCuotas),
    frecuencia: v.frecuencia,
    tipoCalculo: "FLAT",
    tasaPorcentaje: num(v.tasaPorcentaje),
    montoCuota: null,
    penalidadDiaria: num(v.penalidadDiaria),
    fechaDesembolso: v.fechaDesembolso,
    primerVencimiento: v.primerVencimiento,
  };
  const reglas = { topeTea: props.topeTea };
  const errores = validarCredito(entrada, reglas);
  const plan = Object.keys(errores).length === 0 ? planCredito(entrada, feriados, reglas) : null;
  const unidad = ETIQUETA_FRECUENCIA[v.frecuencia];

  return (
    <AdminForm action={props.action} className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <input type="hidden" name="clienteId" value={props.clienteId} />
      <input type="hidden" name="tipoCalculo" value="FLAT" />
      <input type="hidden" name="tasaId" value={v.tasaId} />
      <input type="hidden" name="frecuencia" value={v.frecuencia} />

      <fieldset className="grid content-start gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:grid-cols-2">
        <legend className="sr-only">Datos del préstamo</legend>
        <h2 className="text-lg sm:col-span-2">💵 Datos del préstamo</h2>
        <CampoTexto label="Monto a prestar (S/)" name="monto" inputMode="decimal" placeholder="1000" value={v.monto} onChange={(e) => set({ monto: e.target.value })} required className="sm:col-span-2" autoFocus />

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">¿Cada cuánto paga?</span>
          <div role="radiogroup" aria-label="Frecuencia de pago" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FRECUENCIAS.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={v.frecuencia === f} onClick={() => cambiarFrecuencia(f)}
                className={cn("cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                  v.frecuencia === f ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand")}>
                {ETIQUETA_FRECUENCIA[f].adjetivo.replace(/^./, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <CampoTexto label="N.º de cuotas" name="numeroCuotas" inputMode="numeric" value={v.numeroCuotas} onChange={(e) => set({ numeroCuotas: e.target.value })} />
        <CampoTexto label="Interés total (%)" name="tasaPorcentaje" inputMode="decimal" value={v.tasaPorcentaje} onChange={(e) => set({ tasaPorcentaje: e.target.value, tasaId: "" })}
          hint="Sobre el monto, por todo el plazo." />
        <CampoTexto label="Fecha de entrega" name="fechaDesembolso" type="date" value={v.fechaDesembolso}
          onChange={(e) => set({ fechaDesembolso: e.target.value, primerVencimiento: vencimientoPara(e.target.value, v.frecuencia) })} />
        <CampoSelect
          label="Garante (opcional)"
          name="garanteId"
          value={v.garanteId}
          onChange={(e) => set({ garanteId: e.target.value })}
          opciones={[{ value: "", label: props.garantes.length ? "— Sin garante —" : "Sin garante" }, ...props.garantes.map((g) => ({ value: g.id, label: g.nombre }))]}
        />

        <details className="rounded-xl border border-line-soft bg-surface-2/60 px-4 py-3 sm:col-span-2">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Más opciones</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <CampoTexto label="Primer pago" name="primerVencimiento" type="date" value={v.primerVencimiento} onChange={(e) => set({ primerVencimiento: e.target.value })}
              hint="Si cae en domingo o feriado pasa al siguiente día hábil." />
            <CampoTexto label="Penalidad por día de atraso (S/)" name="penalidadDiaria" inputMode="decimal" value={v.penalidadDiaria} onChange={(e) => set({ penalidadDiaria: e.target.value })} />
            <CampoArea label="Notas (opcional)" name="notas" rows={2} className="sm:col-span-2" />
          </div>
        </details>
      </fieldset>

      <section aria-labelledby="vista-prestamo" className="grid content-start gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card lg:sticky lg:top-20">
        <h2 id="vista-prestamo" className="text-lg">Así queda el préstamo</h2>
        {!plan ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
            <p className="font-semibold text-fg">Escribe el monto para ver las cuotas.</p>
            {v.monto.trim() !== "" && (
              <ul className="mt-2 list-disc pl-5">{Object.values(errores).slice(0, 4).map((e) => <li key={e}>{e}</li>)}</ul>
            )}
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-brand-ink p-4 text-white sm:grid-cols-3">
              <Resumen k="Se entrega" v={formatSoles(plan.financiado, true)} />
              <Resumen k={`Cuota ${unidad.adjetivo}`} v={formatSoles(plan.valorCuota, true)} destacado />
              <Resumen k="N.º de cuotas" v={String(plan.cuotas.length)} />
              <Resumen k="Interés" v={formatSoles(plan.totalIntereses, true)} />
              <Resumen k="Total a devolver" v={formatSoles(plan.totalPagar, true)} />
              <Resumen k="Último pago" v={fechaLarga(plan.ultimoVencimiento)} />
            </dl>
            <div className="max-h-[300px] overflow-auto rounded-xl border border-line-soft">
              <table className="w-full text-sm [&_td]:px-2 [&_td]:py-1.5 [&_th]:sticky [&_th]:top-0 [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_th]:text-muted">
                <thead><tr><th className="text-left">N.º</th><th className="text-left">Fecha de pago</th><th className="text-right">Cuota</th><th className="text-right">Saldo</th></tr></thead>
                <tbody className="tabular">
                  {plan.cuotas.map((c) => (
                    <tr key={c.numero} className="border-t border-line-soft">
                      <td>{c.numero}</td>
                      <td className="whitespace-nowrap">{fechaLarga(c.fecha)}</td>
                      <td className="text-right font-semibold">{c.cuota.toFixed(2)}</td>
                      <td className="text-right text-muted">{c.saldo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="confirmo" className="mt-0.5 size-4 accent-brand" />
          <span>Revisé las cuotas con el cliente y acepta las condiciones.</span>
        </label>
        <ErrorCampo name="confirmo" />
        {props.alertaRiesgo && (
          <>
            <label className="flex items-start gap-2.5 text-sm text-danger">
              <input type="checkbox" name="confirmoRiesgo" className="mt-0.5 size-4 accent-brand" />
              <span>Entiendo que el cliente tiene score bajo y aun así apruebo el préstamo.</span>
            </label>
            <ErrorCampo name="confirmoRiesgo" />
          </>
        )}
        <BotonEnviar variant="brand" disabled={!plan} pendiente="Registrando…">Registrar préstamo</BotonEnviar>
        <p className="text-xs text-muted">Se generan las cuotas y el préstamo aparece en Cobranzas. Todo queda en la auditoría.</p>
      </section>
    </AdminForm>
  );
}

function Resumen({ k, v, destacado }: { k: string; v: string; destacado?: boolean }) {
  return (
    <div>
      <dt className="text-[0.7rem] tracking-wide text-white/60 uppercase">{k}</dt>
      <dd className={cn("tabular font-bold", destacado ? "text-xl text-[#7ff0c4]" : "text-base")}>{v}</dd>
    </div>
  );
}
