"use client";
import { useState } from "react";
import { ExternalButton } from "@/components/ui";
import { creditConfig } from "@/lib/config";
import { cuotaFrancesa, tasaEfectivaAnual } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const fieldCls = "w-full rounded-lg border border-line bg-black/30 p-4 text-xl font-extrabold text-white outline-none focus:border-accent";

export function SimuladorCredito({ modelo, precio }: { modelo: string; precio: number }) {
  const [inicialTexto, setInicialTexto] = useState("0");
  const [meses, setMeses] = useState<number>(creditConfig.plazoVehicularPorDefecto);

  const inicial = Math.min(Math.max(Number(inicialTexto) || 0, 0), precio);
  const tasa = creditConfig.tasaVehicularMensual;
  const cuota = cuotaFrancesa(precio - inicial, tasa, meses);
  const tea = tasaEfectivaAnual(tasa, 12);

  return (
    <section id="simulador" className="scroll-mt-24 bg-black/20 pt-15 pb-25">
      <div className="container max-w-[800px]">
        <div className="form-card border-t-4 border-t-accent">
          <h2 className="mb-2 text-center text-[2rem] font-black uppercase">
            Simulador de <span className="text-accent">crédito</span>
          </h2>
          <p className="mb-8 text-center">Ajusta tu cuota inicial y el plazo para descubrir tu pago mensual estimado.</p>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
              <div>
                <label htmlFor="sim-inicial" className="mb-1.5 block text-sm font-bold text-muted">Cuota inicial (S/)</label>
                <input
                  id="sim-inicial"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={precio}
                  step={100}
                  value={inicialTexto}
                  onChange={(e) => setInicialTexto(e.target.value)}
                  className={fieldCls}
                />
                <p className="mt-1 text-xs">
                  Recomendado: 20% – 30% ({formatSoles(precio * 0.2)} – {formatSoles(precio * 0.3)})
                </p>
              </div>
              <div>
                <label htmlFor="sim-plazo" className="mb-1.5 block text-sm font-bold text-muted">Plazo (meses)</label>
                <select id="sim-plazo" value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={`${fieldCls} cursor-pointer`}>
                  {creditConfig.plazosVehicularMeses.map((m) => (
                    <option key={m} value={m}>{m} meses</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-accent/30 bg-accent/5 p-6">
              <div>
                <div className="text-sm font-bold uppercase text-muted">Cuota mensual estimada</div>
                <div className="text-[2.5rem] font-black text-accent" aria-live="polite">{formatSoles(cuota)}</div>
                <p className="text-xs">
                  Tasa referencial {(tasa * 100).toFixed(1)}% mensual (TEA ≈ {(tea * 100).toFixed(1)}%). Sujeto a evaluación.
                </p>
              </div>

              <ExternalButton
                href={whatsappLink(whatsappMessages.simulacion({ modelo, inicial, plazo: meses, cuota }))}
                size="lg"
                className="font-black"
              >
                Solicitar evaluación ahora
              </ExternalButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
