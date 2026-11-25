"use client";
import { useState } from "react";
import { AdminForm, BotonEnviar, ErrorCampo } from "@/components/admin/AdminForm";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, calcularCredito, type Frecuencia, type TipoCalculo } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { guardarPlan } from "../actions";

export interface PlanEditable {
  id: string;
  nombre: string | null;
  cuotaInicial: number;
  numeroCuotas: number;
  frecuencia: Frecuencia;
  tipoCalculo: TipoCalculo;
  tasaPorcentaje: number | null;
  montoCuota: number | null;
  publicado: boolean;
  orden: number;
}

const ctl = cn(inputClasses(), "py-2 text-sm");
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * Alta/edición de un plan con vista previa en vivo: el admin elige la tasa (el sistema calcula la cuota)
 * o fija la cuota (el sistema calcula la tasa y la TEA). Debe coincidir con el cálculo del servidor (lib/finance).
 */
export function FormPlan({ productoId, precio, plan, tasaSugerida }: { productoId: string; precio: number; plan?: PlanEditable; tasaSugerida?: { frecuencia: Frecuencia; tipoCalculo: TipoCalculo; tasa: number } }) {
  const [inicial, setInicial] = useState(String(plan?.cuotaInicial ?? Math.round(precio * 0.2)));
  const [cuotas, setCuotas] = useState(String(plan?.numeroCuotas ?? 12));
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(plan?.frecuencia ?? tasaSugerida?.frecuencia ?? "MENSUAL");
  const [tipo, setTipo] = useState<TipoCalculo>(plan?.tipoCalculo ?? tasaSugerida?.tipoCalculo ?? "FRANCES");
  const [modo, setModo] = useState<"tasa" | "cuota">(plan?.montoCuota != null ? "cuota" : "tasa");
  const [tasa, setTasa] = useState(String(plan?.tasaPorcentaje ?? tasaSugerida?.tasa ?? 2));
  const [cuota, setCuota] = useState(String(plan?.montoCuota ?? ""));
  const uid = plan?.id ?? "nuevo";

  const r = calcularCredito({
    monto: precio,
    cuotaInicial: Number(inicial) || 0,
    numeroCuotas: Number(cuotas) || 0,
    frecuencia,
    tipoCalculo: tipo,
    tasaPorcentaje: modo === "tasa" ? Number(tasa) || 0 : null,
    montoCuota: modo === "cuota" ? Number(cuota) || null : null,
  });
  const etq = ETIQUETA_FRECUENCIA[frecuencia];

  return (
    <AdminForm action={guardarPlan} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      <input type="hidden" name="productoId" value={productoId} />
      <input type="hidden" name="modo" value={modo} />
      <div className="sm:col-span-2">
        <label htmlFor={`nombre-${uid}`} className={lbl}>Nombre del plan</label>
        <input id={`nombre-${uid}`} name="nombre" defaultValue={plan?.nombre ?? ""} placeholder={`${cuotas} ${etq.plural}`} className={ctl} />
      </div>
      <div>
        <label htmlFor={`ini-${uid}`} className={lbl}>Inicial (S/)</label>
        <input id={`ini-${uid}`} name="cuotaInicial" value={inicial} onChange={(e) => setInicial(e.target.value)} inputMode="decimal" className={ctl} />
        <ErrorCampo name="cuotaInicial" />
      </div>
      <div>
        <label htmlFor={`n-${uid}`} className={lbl}>N.º de cuotas</label>
        <input id={`n-${uid}`} name="numeroCuotas" value={cuotas} onChange={(e) => setCuotas(e.target.value)} inputMode="numeric" className={ctl} />
        <ErrorCampo name="numeroCuotas" />
      </div>
      <div>
        <label htmlFor={`f-${uid}`} className={lbl}>Frecuencia</label>
        <select id={`f-${uid}`} name="frecuencia" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as Frecuencia)} className={ctl}>
          {FRECUENCIAS.map((f) => <option key={f} value={f}>{ETIQUETA_FRECUENCIA[f].adjetivo}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`t-${uid}`} className={lbl}>Cálculo</label>
        <select id={`t-${uid}`} name="tipoCalculo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCalculo)} className={ctl}>
          <option value="FRANCES">Francés (cuota fija, tasa por periodo)</option>
          <option value="FLAT">Flat (% total sobre el capital)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <span className={lbl}>Definir por</span>
        <div className="flex gap-2">
          {(["tasa", "cuota"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              aria-pressed={modo === m}
              className={cn("flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold", modo === m ? "border-brand bg-brand-soft text-brand" : "border-line")}
            >
              {m === "tasa" ? "Tasa → calcula la cuota" : "Cuota → calcula la tasa"}
            </button>
          ))}
        </div>
      </div>
      {modo === "tasa" ? (
        <div>
          <label htmlFor={`tasa-${uid}`} className={lbl}>{tipo === "FRANCES" ? `Tasa por ${etq.singular} (%)` : "Tasa flat total (%)"}</label>
          <input id={`tasa-${uid}`} name="tasaPorcentaje" value={tasa} onChange={(e) => setTasa(e.target.value)} inputMode="decimal" className={ctl} />
          <input type="hidden" name="montoCuota" value="" />
          <ErrorCampo name="tasaPorcentaje" />
        </div>
      ) : (
        <div>
          <label htmlFor={`cuota-${uid}`} className={lbl}>Cuota {etq.adjetivo} (S/)</label>
          <input id={`cuota-${uid}`} name="montoCuota" value={cuota} onChange={(e) => setCuota(e.target.value)} inputMode="decimal" className={ctl} />
          <input type="hidden" name="tasaPorcentaje" value="" />
          <ErrorCampo name="montoCuota" />
        </div>
      )}
      <div>
        <label htmlFor={`o-${uid}`} className={lbl}>Orden</label>
        <input id={`o-${uid}`} name="orden" defaultValue={String(plan?.orden ?? cuotas)} inputMode="numeric" className={ctl} />
      </div>

      <div className="rounded-xl bg-brand-ink p-4 text-sm text-white sm:col-span-2 lg:col-span-4">
        {r.cuota > 0 && Number.isFinite(r.teaPorcentaje) ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 tabular">
            <span>Financiado: <strong>{formatSoles(r.financiado, true)}</strong></span>
            <span>Cuota: <strong className="text-[#7ff0c4]">{formatSoles(r.cuota, true)}</strong> / {etq.singular}</span>
            {modo === "cuota" && <span>Tasa: <strong>{r.tasaPorcentaje.toFixed(3)} %</strong> {tipo === "FRANCES" ? `por ${etq.singular}` : "flat"}</span>}
            <span>Intereses: <strong>{formatSoles(r.totalIntereses, true)}</strong></span>
            <span>TEA: <strong className={r.teaPorcentaje > 100 ? "text-gold" : ""}>{r.teaPorcentaje.toFixed(2)} %</strong></span>
          </div>
        ) : (
          <span className="text-white/70">Completa los datos para ver la cuota y la TEA. {modo === "cuota" && "La cuota debe cubrir el monto financiado."}</span>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <input type="checkbox" name="publicado" defaultChecked={plan?.publicado ?? true} className="size-4 accent-brand" />
        Publicar en la ficha del producto
      </label>
      <div className="sm:col-span-2 lg:col-span-2 lg:text-right">
        <BotonEnviar size="sm">{plan ? "Guardar plan" : "Agregar plan"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}
