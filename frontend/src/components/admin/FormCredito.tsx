"use client";
import { useMemo, useState } from "react";
import { AdminForm, BotonEnviar, ErrorCampo } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, CampoTexto } from "@/components/admin/ui";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";
import { planCredito, primerVencimientoSugerido, validarCredito, type EntradaCredito, type TipoCreditoNuevo } from "@/lib/creditos";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, type Frecuencia, type TipoCalculo } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { aplicarBeneficio, describirBeneficio, type NivelBeneficio } from "@/lib/scoring";

interface Unidad { id: string; tipo: "vehiculo" | "celular"; descripcion: string; identificador: string; precio: number; productoId: string | null }
interface Plan { id: string; productoId: string; nombre: string; cuotaInicial: number; numeroCuotas: number; frecuencia: string; tipoCalculo: string; tasaPorcentaje: number | null; montoCuota: number | null; publicado: boolean }
interface Tasa { id: string; servicio: string; nombre: string; frecuencia: string; tipoCalculo: string; tasaPorcentaje: number; cuotasMin: number; cuotasMax: number; penalidadDiaria: number }
interface Garante { id: string; nombre: string }

export interface PropsFormCredito {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  clienteId: string;
  garantes: Garante[];
  unidades: Unidad[];
  planes: Plan[];
  tasas: Tasa[];
  feriados: string[];
  hoy: string;
  topeTea: number | null;
  vehicularExigeGarante: boolean;
  /** Beneficio por score que califica (null = ninguno). */
  beneficio?: NivelBeneficio | null;
  puntaje?: number | null;
  /** Si hay texto, se pide confirmar el riesgo antes de registrar. */
  alertaRiesgo?: string | null;
}

const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function FormCredito(props: PropsFormCredito) {
  const { unidades, planes, tasas, garantes, hoy } = props;
  const feriados = useMemo(() => new Set(props.feriados), [props.feriados]);
  const [tipo, setTipo] = useState<TipoCreditoNuevo>(() => (unidades.some((u) => u.tipo === "vehiculo") ? "CREDITO_VEHICULAR" : "CREDITO_CELULAR"));
  const tasasTipo = tasas.filter((t) => t.servicio === tipo);
  const tasaInicial = tasasTipo[0];

  const [v, setV] = useState(() => ({
    unidadId: "",
    garanteId: garantes[0]?.id ?? "",
    planId: "",
    tasaId: tasaInicial?.id ?? "",
    precio: "",
    cuotaInicial: "0",
    numeroCuotas: String(tasaInicial?.cuotasMin ?? 12),
    frecuencia: (tasaInicial?.frecuencia ?? "MENSUAL") as Frecuencia,
    tipoCalculo: (tasaInicial?.tipoCalculo ?? "FRANCES") as TipoCalculo,
    modo: "tasa" as "tasa" | "cuota",
    tasaPorcentaje: tasaInicial ? String(tasaInicial.tasaPorcentaje) : "",
    montoCuota: "",
    penalidadDiaria: tasaInicial ? String(tasaInicial.penalidadDiaria) : "0",
    fechaDesembolso: hoy,
    primerVencimiento: primerVencimientoSugerido(hoy, (tasaInicial?.frecuencia ?? "MENSUAL") as Frecuencia, feriados),
  }));
  // Beneficio aplicado: se guardan los valores previos para poder quitarlo.
  const [previo, setPrevio] = useState<{ tasaPorcentaje: string; cuotaInicial: string } | null>(null);
  const conBeneficio = previo != null && props.beneficio != null;
  const set = (cambios: Partial<typeof v>) => setV((prev) => ({ ...prev, ...cambios }));
  /** Cambios que redefinen las condiciones base (tipo, plan o tasa): el beneficio se vuelve a aplicar a mano. */
  const reiniciar = (cambios: Partial<typeof v>) => {
    setPrevio(null);
    set(cambios);
  };
  const alternarBeneficio = () => {
    const b = props.beneficio;
    if (!b) return;
    if (previo) {
      set({ tasaPorcentaje: previo.tasaPorcentaje, cuotaInicial: previo.cuotaInicial });
      setPrevio(null);
      return;
    }
    const nuevo = aplicarBeneficio({ tasaPorcentaje: v.modo === "tasa" ? num(v.tasaPorcentaje) : null, cuotaInicial: num(v.cuotaInicial) }, b);
    setPrevio({ tasaPorcentaje: v.tasaPorcentaje, cuotaInicial: v.cuotaInicial });
    set({
      ...(v.modo === "tasa" && nuevo.tasaPorcentaje != null && Number.isFinite(nuevo.tasaPorcentaje) ? { tasaPorcentaje: String(nuevo.tasaPorcentaje) } : {}),
      ...(Number.isFinite(nuevo.cuotaInicial) ? { cuotaInicial: nuevo.cuotaInicial.toFixed(2) } : {}),
    });
  };
  const vencimientoPara = (desembolso: string, frecuencia: Frecuencia) =>
    /^\d{4}-\d{2}-\d{2}$/.test(desembolso) ? primerVencimientoSugerido(desembolso, frecuencia, feriados) : v.primerVencimiento;

  const unidadesTipo = unidades.filter((u) => u.tipo === (tipo === "CREDITO_VEHICULAR" ? "vehiculo" : "celular"));
  const unidad = unidades.find((u) => u.id === v.unidadId);
  const planesUnidad = unidad?.productoId ? planes.filter((p) => p.productoId === unidad.productoId) : [];
  const tasa = tasas.find((t) => t.id === v.tasaId);

  const cambiarTipo = (t: TipoCreditoNuevo) => {
    setTipo(t);
    const ts = tasas.find((x) => x.servicio === t);
    reiniciar({
      unidadId: "",
      planId: "",
      precio: "",
      tasaId: ts?.id ?? "",
      ...(ts ? aplicarTasa(ts) : {}),
    });
  };
  function aplicarTasa(t: Tasa) {
    const frecuencia = t.frecuencia as Frecuencia;
    return {
      tasaId: t.id,
      frecuencia,
      tipoCalculo: t.tipoCalculo as TipoCalculo,
      modo: "tasa" as const,
      tasaPorcentaje: String(t.tasaPorcentaje),
      penalidadDiaria: String(t.penalidadDiaria),
      numeroCuotas: String(Math.min(Math.max(Number(v.numeroCuotas) || t.cuotasMin, t.cuotasMin), t.cuotasMax)),
      primerVencimiento: vencimientoPara(v.fechaDesembolso, frecuencia),
    };
  }
  const elegirUnidad = (id: string) => {
    const u = unidades.find((x) => x.id === id);
    set({ unidadId: id, planId: "", precio: u ? u.precio.toFixed(2) : "" });
  };
  const elegirPlan = (id: string) => {
    const p = planes.find((x) => x.id === id);
    if (!p) return reiniciar({ planId: "" });
    const frecuencia = p.frecuencia as Frecuencia;
    reiniciar({
      planId: id,
      cuotaInicial: p.cuotaInicial.toFixed(2),
      numeroCuotas: String(p.numeroCuotas),
      frecuencia,
      tipoCalculo: p.tipoCalculo as TipoCalculo,
      modo: p.montoCuota != null ? "cuota" : "tasa",
      tasaPorcentaje: p.tasaPorcentaje != null ? String(p.tasaPorcentaje) : v.tasaPorcentaje,
      montoCuota: p.montoCuota != null ? p.montoCuota.toFixed(2) : "",
      primerVencimiento: vencimientoPara(v.fechaDesembolso, frecuencia),
    });
  };

  const entrada: EntradaCredito = {
    tipo,
    precio: num(v.precio),
    cuotaInicial: num(v.cuotaInicial),
    numeroCuotas: num(v.numeroCuotas),
    frecuencia: v.frecuencia,
    tipoCalculo: v.tipoCalculo,
    tasaPorcentaje: v.modo === "tasa" ? num(v.tasaPorcentaje) : null,
    montoCuota: v.modo === "cuota" ? num(v.montoCuota) : null,
    penalidadDiaria: num(v.penalidadDiaria),
    fechaDesembolso: v.fechaDesembolso,
    primerVencimiento: v.primerVencimiento,
  };
  const reglas = {
    topeTea: props.topeTea,
    ...(tasa && !v.planId && tasa.frecuencia === v.frecuencia
      ? { cuotasMin: tasa.cuotasMin, cuotasMax: tasa.cuotasMax + (conBeneficio ? props.beneficio!.cuotasExtra : 0) }
      : {}),
  };
  const errores = validarCredito(entrada, reglas);
  const plan = Object.keys(errores).length === 0 ? planCredito(entrada, feriados, reglas) : null;
  const faltaGarante = tipo === "CREDITO_VEHICULAR" && props.vehicularExigeGarante && !v.garanteId;

  return (
    <AdminForm action={props.action} className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <input type="hidden" name="clienteId" value={props.clienteId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="modo" value={v.modo} />
      <input type="hidden" name="tasaId" value={v.tasaId} />
      <input type="hidden" name="beneficio" value={conBeneficio ? "1" : ""} />

      <div className="grid content-start gap-5">
        <fieldset className="grid gap-3 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
          <legend className="sr-only">Producto</legend>
          <h2 className="text-lg">1 · ¿Qué se lleva?</h2>
          <div role="radiogroup" aria-label="Tipo de crédito" className="grid grid-cols-2 gap-2">
            {(["CREDITO_VEHICULAR", "CREDITO_CELULAR"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => cambiarTipo(t)}
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                  tipo === t ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
                )}
              >
                {t === "CREDITO_VEHICULAR" ? "🏍 Moto / motokar / torito" : "📱 Celular"}
              </button>
            ))}
          </div>
          <CampoSelect
            label="Unidad en stock"
            name="unidadId"
            value={v.unidadId}
            onChange={(e) => elegirUnidad(e.target.value)}
            opciones={[
              { value: "", label: unidadesTipo.length ? "— Elige la unidad —" : "No hay unidades en stock" },
              ...unidadesTipo.map((u) => ({ value: u.id, label: `${u.descripcion} · ${u.identificador} · ${formatSoles(u.precio)}` })),
            ]}
            hint={unidadesTipo.length === 0 ? <a href="/admin/inventario" className="font-semibold text-brand">Ingresar unidades en Inventario →</a> : undefined}
          />
          {planesUnidad.length > 0 && (
            <CampoSelect
              label="Plan del catálogo (opcional)"
              name="planId"
              value={v.planId}
              onChange={(e) => elegirPlan(e.target.value)}
              opciones={[
                { value: "", label: "— Condiciones personalizadas —" },
                ...planesUnidad.map((p) => ({ value: p.id, label: `${p.nombre}${p.publicado ? "" : " (no publicado)"}` })),
              ]}
            />
          )}
          {planesUnidad.length === 0 && <input type="hidden" name="planId" value="" />}
          <CampoSelect
            label={`Garante${tipo === "CREDITO_VEHICULAR" && props.vehicularExigeGarante ? " (obligatorio)" : " (opcional)"}`}
            name="garanteId"
            value={v.garanteId}
            onChange={(e) => set({ garanteId: e.target.value })}
            opciones={[{ value: "", label: garantes.length ? "— Sin garante —" : "El cliente no tiene garantes" }, ...garantes.map((g) => ({ value: g.id, label: g.nombre }))]}
            hint={faltaGarante ? "Agrega un garante en la ficha del cliente antes de continuar." : undefined}
          />
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:grid-cols-2">
          <legend className="sr-only">Condiciones</legend>
          <h2 className="text-lg sm:col-span-2">2 · Precio y cuotas</h2>
          {props.beneficio && (
            <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm sm:col-span-2", conBeneficio ? "border-accent bg-accent-soft" : "border-line-soft bg-surface-2")}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">🎁 {props.beneficio.nombre}{props.puntaje != null ? ` · score ${props.puntaje}` : ""}</div>
                <div className="text-xs text-muted">
                  {describirBeneficio(props.beneficio)}
                  {v.modo === "cuota" && props.beneficio.descuentoTasaPct > 0 ? " · con cuota fija el descuento de tasa no se aplica solo: ajusta la cuota" : ""}
                </div>
              </div>
              <button type="button" onClick={alternarBeneficio} aria-pressed={conBeneficio}
                className={cn("cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold", conBeneficio ? "border border-line bg-surface" : "bg-accent text-white")}>
                {conBeneficio ? "Quitar beneficio" : "Aplicar beneficio"}
              </button>
            </div>
          )}
          <CampoTexto label="Precio (S/)" name="precio" inputMode="decimal" value={v.precio} onChange={(e) => set({ precio: e.target.value })} hint={unidad && Number(v.precio) !== unidad.precio ? `Precio de lista: ${formatSoles(unidad.precio, true)}` : undefined} />
          <CampoTexto label="Inicial (S/)" name="cuotaInicial" inputMode="decimal" value={v.cuotaInicial} onChange={(e) => set({ cuotaInicial: e.target.value })} />
          <CampoSelect
            label="Frecuencia"
            name="frecuencia"
            value={v.frecuencia}
            onChange={(e) => {
              const frecuencia = e.target.value as Frecuencia;
              set({ frecuencia, primerVencimiento: vencimientoPara(v.fechaDesembolso, frecuencia) });
            }}
            opciones={FRECUENCIAS.map((f) => ({ value: f, label: ETIQUETA_FRECUENCIA[f].adjetivo.replace(/^./, (c) => c.toUpperCase()) }))}
          />
          <CampoTexto label="N.º de cuotas" name="numeroCuotas" inputMode="numeric" value={v.numeroCuotas} onChange={(e) => set({ numeroCuotas: e.target.value })} hint={errores.numeroCuotas ? undefined : reglas.cuotasMin ? `Rango de la tasa: ${reglas.cuotasMin}–${reglas.cuotasMax}` : undefined} />
          <CampoTexto label="Fecha de entrega" name="fechaDesembolso" type="date" value={v.fechaDesembolso}
            onChange={(e) => set({ fechaDesembolso: e.target.value, primerVencimiento: vencimientoPara(e.target.value, v.frecuencia) })} />
          <details className="rounded-xl border border-line-soft bg-surface-2/60 px-4 py-3 sm:col-span-2" open={v.modo === "cuota" || !v.tasaId}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">
              Más opciones <span className="font-normal text-muted">· tasa {v.modo === "tasa" ? `${v.tasaPorcentaje || "—"} %` : "por cuota fija"}, penalidad, primer pago y notas</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {!v.planId && tasasTipo.length > 0 && (
                <CampoSelect
                  label="Tasa vigente"
                  name="_tasa"
                  className="sm:col-span-2"
                  value={v.tasaId}
                  onChange={(e) => {
                    const t = tasas.find((x) => x.id === e.target.value);
                    if (t) reiniciar(aplicarTasa(t));
                    else reiniciar({ tasaId: "" });
                  }}
                  opciones={[
                    { value: "", label: "— Personalizada —" },
                    ...tasasTipo.map((t) => ({ value: t.id, label: `${t.nombre} · ${t.tasaPorcentaje} % ${t.tipoCalculo === "FLAT" ? "flat" : "por periodo"} · ${t.cuotasMin}–${t.cuotasMax} cuotas` })),
                  ]}
                />
              )}
              <CampoSelect
                label="Cálculo"
                name="tipoCalculo"
                value={v.tipoCalculo}
                onChange={(e) => set({ tipoCalculo: e.target.value as TipoCalculo })}
                opciones={[{ value: "FRANCES", label: "Francés (saldo)" }, { value: "FLAT", label: "Flat (% total)" }]}
              />
              <div>
                <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Definir por</span>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Definir por">
                  {(["tasa", "cuota"] as const).map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={v.modo === m} onClick={() => set({ modo: m })}
                      className={cn("cursor-pointer rounded-lg py-2 text-sm font-semibold", v.modo === m ? "bg-surface text-brand shadow-card" : "text-muted")}>
                      {m === "tasa" ? "Tasa" : "Cuota fija"}
                    </button>
                  ))}
                </div>
              </div>
              {v.modo === "tasa" ? (
                <CampoTexto label={v.tipoCalculo === "FLAT" ? "Tasa flat total (%)" : `Tasa por ${ETIQUETA_FRECUENCIA[v.frecuencia].singular} (%)`} name="tasaPorcentaje" inputMode="decimal" value={v.tasaPorcentaje} onChange={(e) => set({ tasaPorcentaje: e.target.value, tasaId: "" })} />
              ) : (
                <CampoTexto label="Cuota pactada (S/)" name="montoCuota" inputMode="decimal" value={v.montoCuota} onChange={(e) => set({ montoCuota: e.target.value })} />
              )}
              <input type="hidden" name={v.modo === "tasa" ? "montoCuota" : "tasaPorcentaje"} value="" />
              <CampoTexto label="Penalidad por día de atraso (S/)" name="penalidadDiaria" inputMode="decimal" value={v.penalidadDiaria} onChange={(e) => set({ penalidadDiaria: e.target.value })} />
              <CampoTexto label="Primer vencimiento" name="primerVencimiento" type="date" value={v.primerVencimiento} onChange={(e) => set({ primerVencimiento: e.target.value })}
                hint="Si cae en domingo o feriado pasa al siguiente día hábil." />
              <CampoArea label="Notas (opcional)" name="notas" rows={2} className="sm:col-span-2" />
            </div>
          </details>
        </fieldset>
      </div>

      <section aria-labelledby="vista-previa" className="grid content-start gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card lg:sticky lg:top-20">
        <h2 id="vista-previa" className="text-lg">3 · Así quedan las cuotas</h2>
        {!plan ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-sm text-muted">
            <p className="font-semibold text-fg">{v.unidadId ? "Completa el precio y las cuotas para ver el cronograma." : "Elige la unidad para ver el cronograma."}</p>
            <ul className="mt-2 list-disc pl-5">
              {Object.values(errores).slice(0, 4).map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-brand-ink p-4 text-white sm:grid-cols-3">
              <Resumen k="Financiado" v={formatSoles(plan.financiado, true)} />
              <Resumen k={`Cuota ${ETIQUETA_FRECUENCIA[v.frecuencia].adjetivo}`} v={formatSoles(plan.valorCuota, true)} destacado />
              <Resumen k="N.º de cuotas" v={String(plan.cuotas.length)} />
              <Resumen k="Intereses" v={formatSoles(plan.totalIntereses, true)} />
              <Resumen k="Total a pagar" v={formatSoles(plan.totalPagar, true)} />
              <Resumen k="TEA" v={Number.isFinite(plan.teaPorcentaje) ? `${plan.teaPorcentaje.toFixed(2)} %` : "—"} />
            </dl>
            <p className="text-xs text-muted">
              Del {fechaLarga(plan.cuotas[0].fecha)} al {fechaLarga(plan.ultimoVencimiento)} · tasa {plan.tasaPorcentaje} %{" "}
              {v.tipoCalculo === "FLAT" ? "flat" : `por ${ETIQUETA_FRECUENCIA[v.frecuencia].singular}`} · sin domingos ni feriados
            </p>
            <div className="max-h-[360px] overflow-auto rounded-xl border border-line-soft">
              <table className="w-full text-sm [&_td]:px-2 [&_td]:py-1.5 [&_th]:sticky [&_th]:top-0 [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_th]:text-muted">
                <thead>
                  <tr><th className="text-left">N.º</th><th className="text-left">Vence</th><th className="text-right">Cuota</th><th className="text-right">Capital</th><th className="text-right">Interés</th><th className="text-right">Saldo</th></tr>
                </thead>
                <tbody className="tabular">
                  {plan.cuotas.map((c) => (
                    <tr key={c.numero} className="border-t border-line-soft">
                      <td>{c.numero}</td>
                      <td className="whitespace-nowrap">{fechaLarga(c.fecha)}</td>
                      <td className="text-right font-semibold">{c.cuota.toFixed(2)}</td>
                      <td className="text-right">{c.capital.toFixed(2)}</td>
                      <td className="text-right">{c.interes.toFixed(2)}</td>
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
          <span>Revisé el cronograma con el cliente y acepta las condiciones.</span>
        </label>
        <ErrorCampo name="confirmo" />
        {props.alertaRiesgo && (
          <>
            <label className="flex items-start gap-2.5 text-sm text-danger">
              <input type="checkbox" name="confirmoRiesgo" className="mt-0.5 size-4 accent-brand" />
              <span>Entiendo que el cliente tiene score bajo y aun así apruebo el crédito.</span>
            </label>
            <ErrorCampo name="confirmoRiesgo" />
          </>
        )}
        {(!v.unidadId || faltaGarante || (!plan && v.unidadId)) && (
          <p role="status" className="rounded-xl bg-gold-soft/70 px-3 py-2 text-sm text-[#8a5d00]">
            {!v.unidadId
              ? unidadesTipo.length === 0
                ? "No hay unidades en stock de este tipo: ingrésalas primero en Inventario."
                : "Elige la unidad que se entrega (paso 1)."
              : faltaGarante
                ? "Este crédito requiere un garante: agrégalo en la ficha del cliente."
                : "Revisa las condiciones (paso 2) para ver el cronograma."}
          </p>
        )}
        <BotonEnviar variant="brand" disabled={!plan || !v.unidadId || faltaGarante} pendiente="Registrando…">
          Confirmar y registrar crédito
        </BotonEnviar>
        <p className="text-xs text-muted">Al confirmar se generan las cuotas y la unidad pasa a «vendido a crédito». Todo queda en la auditoría.</p>
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
