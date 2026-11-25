"use client";
import { useId, useState } from "react";
import { ButtonLink, ExternalButton } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { cn } from "@/lib/cn";
import { creditConfig } from "@/lib/config";
import { cuotaFrancesa, tasaEfectivaAnual } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export type ModoSimulador = "vehicular" | "celular";

const MODOS: Record<
  ModoSimulador,
  { etiqueta: string; tasa: number; periodosAnio: number; plazos: readonly number[]; plazoDefecto: number; unidad: string; unidadPlural: string; precioMin: number; precioMax: number; precioDefecto: number; paso: number }
> = {
  vehicular: {
    etiqueta: "Vehículo",
    tasa: creditConfig.tasaVehicularMensual,
    periodosAnio: 12,
    plazos: creditConfig.plazosVehicularMeses,
    plazoDefecto: creditConfig.plazoVehicularPorDefecto,
    unidad: "mes",
    unidadPlural: "meses",
    precioMin: 3000,
    precioMax: 20000,
    precioDefecto: 7700,
    paso: 100,
  },
  celular: {
    etiqueta: "Celular",
    tasa: creditConfig.tasaCelularSemanal,
    periodosAnio: 52,
    plazos: creditConfig.plazosCelularSemanas,
    plazoDefecto: creditConfig.plazoCelularPorDefecto,
    unidad: "semana",
    unidadPlural: "semanas",
    precioMin: 500,
    precioMax: 5000,
    precioDefecto: 1300,
    paso: 50,
  },
};

interface Props {
  /** Modos disponibles como pestañas. Con uno solo no se muestran pestañas. */
  modos?: ModoSimulador[];
  /** Si se indica, el precio queda fijo (ficha de producto). */
  producto?: { nombre: string; precio: number };
  className?: string;
}

const fieldCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-lg font-bold text-fg outline-none tabular focus:border-brand focus:ring-4 focus:ring-brand/10";

export function Simulador({ modos = ["vehicular", "celular"], producto, className }: Props) {
  const uid = useId();
  const [modo, setModo] = useState<ModoSimulador>(modos[0]);
  const cfg = MODOS[modo];
  const [precioTexto, setPrecioTexto] = useState(String(producto?.precio ?? cfg.precioDefecto));
  const [inicialTexto, setInicialTexto] = useState("0");
  const [plazo, setPlazo] = useState(cfg.plazoDefecto);

  const cambiarModo = (m: ModoSimulador) => {
    setModo(m);
    setPlazo(MODOS[m].plazoDefecto);
    if (!producto) setPrecioTexto(String(MODOS[m].precioDefecto));
    setInicialTexto("0");
  };

  const precio = producto?.precio ?? Math.max(Number(precioTexto) || 0, 0);
  const inicial = Math.min(Math.max(Number(inicialTexto) || 0, 0), precio);
  const financiado = precio - inicial;
  const cuota = cuotaFrancesa(financiado, cfg.tasa, plazo);
  const total = cuota * plazo;
  const tea = tasaEfectivaAnual(cfg.tasa, cfg.periodosAnio);
  const nombre = producto?.nombre ?? (modo === "vehicular" ? "un vehículo" : "un celular");

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-lift", className)}>
      {modos.length > 1 && (
        <div role="tablist" aria-label="Tipo de crédito" className="grid grid-cols-2 border-b border-line-soft bg-surface-2 p-1.5">
          {modos.map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={modo === m}
              onClick={() => cambiarModo(m)}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                modo === m ? "bg-surface text-brand shadow-card" : "text-muted hover:text-fg",
              )}
            >
              {MODOS[m].etiqueta}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 p-5 md:p-7">
        {!producto && (
          <div>
            <label htmlFor={`${uid}-precio`} className="mb-1.5 flex justify-between text-sm font-semibold">
              Precio del {modo === "vehicular" ? "vehículo" : "celular"}
              <span className="tabular text-brand">{formatSoles(precio)}</span>
            </label>
            <input
              id={`${uid}-precio`}
              type="range"
              min={cfg.precioMin}
              max={cfg.precioMax}
              step={cfg.paso}
              value={Math.min(Math.max(precio, cfg.precioMin), cfg.precioMax)}
              onChange={(e) => setPrecioTexto(e.target.value)}
              className="w-full cursor-pointer accent-brand"
            />
            <div className="mt-1 flex justify-between text-xs text-muted tabular">
              <span>{formatSoles(cfg.precioMin)}</span>
              <span>{formatSoles(cfg.precioMax)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-inicial`} className="mb-1.5 block text-sm font-semibold">Cuota inicial (S/)</label>
            <input
              id={`${uid}-inicial`}
              type="number"
              inputMode="decimal"
              min={0}
              max={precio}
              step={modo === "vehicular" ? 100 : 20}
              value={inicialTexto}
              onChange={(e) => setInicialTexto(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-plazo`} className="mb-1.5 block text-sm font-semibold">Plazo</label>
            <select id={`${uid}-plazo`} value={plazo} onChange={(e) => setPlazo(Number(e.target.value))} className={cn(fieldCls, "cursor-pointer")}>
              {cfg.plazos.map((p) => (
                <option key={p} value={p}>{p} {cfg.unidadPlural}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-brand-ink p-5 text-white">
          <div className="text-sm text-white/70">Tu cuota {modo === "vehicular" ? "mensual" : "semanal"} estimada</div>
          <div className="mt-1 text-[2.4rem] leading-none font-extrabold tabular text-[#7ff0c4]" aria-live="polite">
            {formatSoles(cuota, true)}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
            <div>
              <dt className="text-white/60">Monto financiado</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{formatSoles(financiado)}</dd>
            </div>
            <div>
              <dt className="text-white/60">Total a pagar</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{formatSoles(total)}</dd>
            </div>
            <div>
              <dt className="text-white/60">TEA referencial</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{(tea * 100).toFixed(1)}%</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <ButtonLink
            href={`/financiamiento?servicio=${modo === "vehicular" ? "CREDITO_VEHICULAR" : "CREDITO_CELULAR"}${producto ? `&producto=${encodeURIComponent(producto.nombre)}` : ""}`}
            block
          >
            Solicitar evaluación
          </ButtonLink>
          <ExternalButton
            href={whatsappLink(
              whatsappMessages.simulacion({ producto: nombre, inicial, plazo: `${plazo} ${cfg.unidadPlural}`, cuota }),
            )}
            variant="outline"
            block
          >
            <IconWhatsApp size={18} className="text-whatsapp" /> Consultar
          </ExternalButton>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          Simulación referencial con tasa de {(cfg.tasa * 100).toFixed(1)}% por {cfg.unidad} y cuota fija. La tasa, la
          inicial y el plazo finales dependen de la evaluación crediticia.
        </p>
      </div>
    </div>
  );
}
