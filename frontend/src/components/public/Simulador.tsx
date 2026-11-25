"use client";
import { useId, useState } from "react";
import { ButtonLink, ExternalButton } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { TasaPublica } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA, calcularCredito, type Frecuencia } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export type ModoSimulador = "vehicular" | "celular";

const MODOS: Record<
  ModoSimulador,
  { etiqueta: string; servicio: TasaPublica["servicio"]; precioMin: number; precioMax: number; precioDefecto: number; paso: number; pasoInicial: number }
> = {
  vehicular: { etiqueta: "Vehículo", servicio: "CREDITO_VEHICULAR", precioMin: 3000, precioMax: 20000, precioDefecto: 7700, paso: 100, pasoInicial: 100 },
  celular: { etiqueta: "Celular", servicio: "CREDITO_CELULAR", precioMin: 500, precioMax: 5000, precioDefecto: 1300, paso: 50, pasoInicial: 20 },
};

/** Plazos que se ofrecen en el selector, recortados al mínimo/máximo de cada tasa. */
const PLAZOS: Record<Frecuencia, number[]> = {
  DIARIO: [24, 30],
  SEMANAL: [8, 12, 16, 26, 39, 52],
  QUINCENAL: [4, 6, 8, 12, 18, 24],
  MENSUAL: [6, 12, 18, 24, 36],
};
const PLAZO_DEFECTO: Record<Frecuencia, number> = { DIARIO: 24, SEMANAL: 16, QUINCENAL: 8, MENSUAL: 12 };

const plazosDe = (t: TasaPublica) => {
  const lista = PLAZOS[t.frecuencia].filter((n) => n >= t.cuotasMin && n <= t.cuotasMax);
  return lista.length ? lista : [t.cuotasMin];
};
const plazoInicial = (t: TasaPublica) => {
  const lista = plazosDe(t);
  return lista.includes(PLAZO_DEFECTO[t.frecuencia]) ? PLAZO_DEFECTO[t.frecuencia] : lista[Math.floor(lista.length / 2)];
};

interface Props {
  /** Tasas públicas (tabla tasa_servicio). */
  tasas: TasaPublica[];
  /** Modos disponibles como pestañas. Con uno solo no se muestran pestañas. */
  modos?: ModoSimulador[];
  /** Si se indica, el precio queda fijo (ficha de producto). */
  producto?: { nombre: string; precio: number; inicialSugerida?: number };
  className?: string;
}

const fieldCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-lg font-bold text-fg outline-none tabular focus:border-brand focus:ring-4 focus:ring-brand/10";

export function Simulador({ tasas, modos = ["vehicular", "celular"], producto, className }: Props) {
  const uid = useId();
  const modosDisponibles = modos.filter((m) => tasas.some((t) => t.servicio === MODOS[m].servicio));
  const [modo, setModo] = useState<ModoSimulador>(modosDisponibles[0] ?? modos[0]);
  const cfg = MODOS[modo];
  const tasasModo = tasas.filter((t) => t.servicio === cfg.servicio);
  const [frecuencia, setFrecuencia] = useState<Frecuencia | undefined>(tasasModo[0]?.frecuencia);
  const tasa = tasasModo.find((t) => t.frecuencia === frecuencia) ?? tasasModo[0];

  const [precioTexto, setPrecioTexto] = useState(String(producto?.precio ?? cfg.precioDefecto));
  const [inicialTexto, setInicialTexto] = useState(String(producto?.inicialSugerida ?? 0));
  const [plazo, setPlazo] = useState(tasa ? plazoInicial(tasa) : 12);

  if (!tasa) return null;

  const cambiarModo = (m: ModoSimulador) => {
    const nueva = tasas.find((t) => t.servicio === MODOS[m].servicio);
    setModo(m);
    setFrecuencia(nueva?.frecuencia);
    if (nueva) setPlazo(plazoInicial(nueva));
    if (!producto) setPrecioTexto(String(MODOS[m].precioDefecto));
    setInicialTexto("0");
  };

  const cambiarFrecuencia = (f: Frecuencia) => {
    const nueva = tasasModo.find((t) => t.frecuencia === f);
    setFrecuencia(f);
    if (nueva) setPlazo(plazoInicial(nueva));
  };

  const etq = ETIQUETA_FRECUENCIA[tasa.frecuencia];
  const precio = producto?.precio ?? Math.max(Number(precioTexto) || 0, 0);
  const inicial = Math.min(Math.max(Number(inicialTexto) || 0, 0), precio);
  const r = calcularCredito({
    monto: precio,
    cuotaInicial: inicial,
    numeroCuotas: plazo,
    frecuencia: tasa.frecuencia,
    tipoCalculo: tasa.tipoCalculo,
    tasaPorcentaje: tasa.tasaPorcentaje,
  });
  const nombre = producto?.nombre ?? (modo === "vehicular" ? "un vehículo" : "un celular");

  return (
    <div className={cn("overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-lift", className)}>
      {modosDisponibles.length > 1 && (
        <div role="tablist" aria-label="Tipo de crédito" className="grid grid-cols-2 border-b border-line-soft bg-surface-2 p-1.5">
          {modosDisponibles.map((m) => (
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
        {tasasModo.length > 1 && (
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Frecuencia de pago</span>
            <div className="flex gap-2" role="group" aria-label="Frecuencia de pago">
              {tasasModo.map((t) => (
                <button
                  key={t.frecuencia}
                  type="button"
                  aria-pressed={t.frecuencia === tasa.frecuencia}
                  onClick={() => cambiarFrecuencia(t.frecuencia)}
                  className={cn(
                    "flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-colors",
                    t.frecuencia === tasa.frecuencia ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-brand",
                  )}
                >
                  {ETIQUETA_FRECUENCIA[t.frecuencia].adjetivo}
                </button>
              ))}
            </div>
          </div>
        )}

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
              step={cfg.pasoInicial}
              value={inicialTexto}
              onChange={(e) => setInicialTexto(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-plazo`} className="mb-1.5 block text-sm font-semibold">Plazo</label>
            <select id={`${uid}-plazo`} value={plazo} onChange={(e) => setPlazo(Number(e.target.value))} className={cn(fieldCls, "cursor-pointer")}>
              {plazosDe(tasa).map((p) => (
                <option key={p} value={p}>{p} {ETIQUETA_FRECUENCIA[tasa.frecuencia].plural}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-brand-ink p-5 text-white">
          <div className="text-sm text-white/70">Tu cuota {etq.adjetivo} estimada</div>
          <div className="mt-1 text-[2.4rem] leading-none font-extrabold tabular text-[#7ff0c4]" aria-live="polite">
            {formatSoles(r.cuota, true)}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
            <div>
              <dt className="text-white/60">Monto financiado</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{formatSoles(r.financiado)}</dd>
            </div>
            <div>
              <dt className="text-white/60">Total a pagar</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{formatSoles(r.totalPagar)}</dd>
            </div>
            <div>
              <dt className="text-white/60">TEA referencial</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular">{Number.isFinite(r.teaPorcentaje) ? `${r.teaPorcentaje.toFixed(1)}%` : "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <ButtonLink
            href={`/financiamiento?servicio=${cfg.servicio}${producto ? `&producto=${encodeURIComponent(producto.nombre)}` : ""}`}
            block
          >
            Solicitar evaluación
          </ButtonLink>
          <ExternalButton
            href={whatsappLink(
              whatsappMessages.simulacion({ producto: nombre, inicial, plazo: `${plazo} ${etq.plural}`, cuota: r.cuota }),
            )}
            variant="outline"
            block
          >
            <IconWhatsApp size={18} className="text-whatsapp" /> Consultar
          </ExternalButton>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          Simulación referencial con tasa de {tasa.tasaPorcentaje.toLocaleString("es-PE", { maximumFractionDigits: 3 })}%{" "}
          {tasa.tipoCalculo === "FRANCES" ? `por ${etq.singular} y cuota fija` : "flat sobre el capital"}. La tasa, la
          inicial y el plazo finales dependen de la evaluación crediticia.
        </p>
      </div>
    </div>
  );
}
