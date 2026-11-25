"use client";
import { useId, useState } from "react";
import { ButtonLink, ExternalButton } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { cn } from "@/lib/cn";
import { creditConfig } from "@/lib/config";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const RAPIDOS = [300, 500, 1000, 2000];
const FRECUENCIAS = ["Diario", "Semanal"] as const;

/** Selector de monto para préstamos en efectivo: lleva al formulario con el monto ya cargado. */
export function SelectorMonto() {
  const uid = useId();
  const [monto, setMonto] = useState(500);
  const [frecuencia, setFrecuencia] = useState<(typeof FRECUENCIAS)[number]>("Semanal");

  return (
    <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-lift md:p-8">
      <label htmlFor={`${uid}-monto`} className="text-sm font-semibold text-muted">¿Cuánto necesitas?</label>
      <div className="mt-1 text-[2.6rem] leading-none font-extrabold text-brand tabular" aria-live="polite">{formatSoles(monto)}</div>
      <input
        id={`${uid}-monto`}
        type="range"
        min={creditConfig.prestamoMontoMin}
        max={creditConfig.prestamoMontoMax}
        step={50}
        value={monto}
        onChange={(e) => setMonto(Number(e.target.value))}
        className="mt-5 w-full cursor-pointer accent-brand"
      />
      <div className="mt-1 flex justify-between text-xs text-muted tabular">
        <span>{formatSoles(creditConfig.prestamoMontoMin)}</span>
        <span>{formatSoles(creditConfig.prestamoMontoMax)}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Montos rápidos">
        {RAPIDOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonto(m)}
            aria-pressed={monto === m}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold tabular transition-colors",
              monto === m ? "border-brand bg-brand text-white" : "border-line text-fg hover:border-brand",
            )}
          >
            {formatSoles(m)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <span className="text-sm font-semibold text-muted">¿Cómo prefieres pagar?</span>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1.5" role="radiogroup" aria-label="Frecuencia de pago">
          {FRECUENCIAS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={frecuencia === f}
              onClick={() => setFrecuencia(f)}
              className={cn(
                "cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition-all",
                frecuencia === f ? "bg-surface text-brand shadow-card" : "text-muted",
              )}
            >
              {f === "Diario" ? "Diario (lun. a sáb.)" : "Semanal"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-2.5">
        <ButtonLink href={`/financiamiento?servicio=PRESTAMO_EFECTIVO&monto=${monto}&frecuencia=${frecuencia}`} size="lg" block>
          Solicitar {formatSoles(monto)}
        </ButtonLink>
        <ExternalButton href={whatsappLink(`${whatsappMessages.prestamo(monto)} Pago ${frecuencia.toLowerCase()}.`)} variant="outline" block>
          <IconWhatsApp size={18} className="text-whatsapp" /> Consultar por WhatsApp
        </ExternalButton>
      </div>
      <p className="mt-4 text-xs text-muted">
        La tasa, el número de cuotas y el cronograma se informan por escrito antes de firmar, junto con la TEA y la TCEA.
      </p>
    </div>
  );
}
