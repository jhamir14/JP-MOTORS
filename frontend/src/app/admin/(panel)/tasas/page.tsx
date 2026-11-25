import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoSelect, CampoTexto, Check, Encabezado, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ETIQUETA_SERVICIO, SERVICIOS_CREDITO } from "@/lib/admin/constantes";
import { CATEGORIAS, ETIQUETA_CATEGORIA, type CategoriaProducto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, PERIODOS_POR_ANIO, calcularCredito, type Frecuencia, type TipoCalculo } from "@/lib/finance";
import { puede, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { guardarTasa, guardarTopeTea } from "./actions";

export const metadata = { title: "Tasas por servicio" };

interface Tasa {
  id: string; servicio: (typeof SERVICIOS_CREDITO)[number]; categoria: CategoriaProducto | null; nombre: string; frecuencia: Frecuencia;
  tipo_calculo: TipoCalculo; tasa: number; cuotas_min: number; cuotas_max: number; penalidad: number; publica: boolean; activa: boolean;
}

/** TEA de referencia: con FLAT depende del plazo, se muestra para el mínimo y el máximo de cuotas. */
function teaReferencia(t: Tasa) {
  const tea = (n: number) =>
    calcularCredito({ monto: 1000, numeroCuotas: n, frecuencia: t.frecuencia, tipoCalculo: t.tipo_calculo, tasaPorcentaje: t.tasa }).teaPorcentaje;
  if (t.tipo_calculo === "FRANCES") return `${((Math.pow(1 + t.tasa / 100, PERIODOS_POR_ANIO[t.frecuencia]) - 1) * 100).toFixed(2)} %`;
  return `${tea(t.cuotas_max).toFixed(0)} % – ${tea(t.cuotas_min).toFixed(0)} %`;
}

function FormTasa({ tasa }: { tasa?: Tasa }) {
  const k = tasa?.id ?? "nueva";
  return (
    <AdminForm action={guardarTasa} resetOnSuccess={!tasa} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={tasa?.id ?? ""} />
      <CampoTexto label="Nombre" name="nombre" id={`nombre-${k}`} defaultValue={tasa?.nombre} className="sm:col-span-2" required />
      <CampoSelect label="Servicio" name="servicio" id={`servicio-${k}`} defaultValue={tasa?.servicio} opciones={SERVICIOS_CREDITO.map((s) => ({ value: s, label: ETIQUETA_SERVICIO[s] }))} />
      <CampoSelect
        label="Categoría"
        name="categoria"
        id={`categoria-${k}`}
        defaultValue={tasa?.categoria ?? ""}
        opciones={[{ value: "", label: "Todo el servicio" }, ...CATEGORIAS.map((c) => ({ value: c, label: ETIQUETA_CATEGORIA[c] }))]}
      />
      <CampoSelect label="Frecuencia" name="frecuencia" id={`frecuencia-${k}`} defaultValue={tasa?.frecuencia} opciones={FRECUENCIAS.map((f) => ({ value: f, label: ETIQUETA_FRECUENCIA[f].adjetivo }))} />
      <CampoSelect
        label="Cálculo"
        name="tipoCalculo"
        id={`tipo-${k}`}
        defaultValue={tasa?.tipo_calculo}
        opciones={[{ value: "FRANCES", label: "Francés (por periodo)" }, { value: "FLAT", label: "Flat (total)" }]}
      />
      <CampoTexto label="Tasa (%)" name="tasaPorcentaje" id={`tasa-${k}`} defaultValue={tasa?.tasa.toString()} inputMode="decimal" required />
      <CampoTexto label="Penalidad diaria (S/)" name="penalidadDiaria" id={`pen-${k}`} defaultValue={tasa?.penalidad.toFixed(2) ?? "0.00"} inputMode="decimal" />
      <CampoTexto label="Cuotas mín." name="cuotasMin" id={`min-${k}`} defaultValue={String(tasa?.cuotas_min ?? 1)} inputMode="numeric" />
      <CampoTexto label="Cuotas máx." name="cuotasMax" id={`max-${k}`} defaultValue={String(tasa?.cuotas_max ?? 52)} inputMode="numeric" />
      <div className="flex flex-col justify-center gap-2 sm:col-span-2">
        <Check label="Activa" name="activa" defaultChecked={tasa?.activa ?? true} />
        <Check label="Usar en los simuladores de la web" name="publica" defaultChecked={tasa?.publica ?? false} hint="No aplica a préstamos en efectivo." />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <BotonEnviar size="sm">{tasa ? "Guardar tasa" : "Crear tasa"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}

export default async function TasasPage() {
  const sesion = await requerirSesion();
  const editable = puede(sesion, "SUPERADMIN", "ADMIN_CREDITOS");
  const db = sql();
  const [tasas, [conf]] = await Promise.all([
    db<Tasa[]>`
      select id, servicio, categoria, nombre, frecuencia, tipo_calculo, tasa_porcentaje::float8 as tasa, cuotas_min, cuotas_max,
             penalidad_diaria::float8 as penalidad, publica, activa
      from public.tasa_servicio order by activa desc, servicio, frecuencia`,
    db<{ tope: number | null }[]>`
      select case when jsonb_typeof(valor) = 'number' then (valor #>> '{}')::numeric::float8 end as tope
      from public.configuracion where clave = 'tope_tea_porcentaje'`,
  ]);

  return (
    <>
      <Encabezado titulo="Tasas por servicio">
        Tasa por defecto de cada servicio. Cambiarla no altera los créditos ya firmados: cada crédito guarda una copia de su tasa.
        FRANCÉS = % por periodo con cuota fija · FLAT = % total sobre el capital.
      </Encabezado>

      <div className="grid gap-4">
        {tasas.map((t) => (
          <details key={t.id} className="rounded-2xl border border-line-soft bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="font-semibold">{t.nombre}</div>
                <div className="text-xs text-muted">
                  {ETIQUETA_SERVICIO[t.servicio]}{t.categoria ? ` · ${ETIQUETA_CATEGORIA[t.categoria]}` : ""} · {ETIQUETA_FRECUENCIA[t.frecuencia].adjetivo} ·{" "}
                  {t.cuotas_min}–{t.cuotas_max} cuotas · penalidad S/ {t.penalidad.toFixed(2)}/día
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong className="tabular">{t.tasa}% {t.tipo_calculo === "FLAT" ? "flat" : `por ${ETIQUETA_FRECUENCIA[t.frecuencia].singular}`}</strong>
                <span className="text-xs text-muted tabular">TEA {teaReferencia(t)}</span>
                {t.publica && <Badge tone="brand">Web</Badge>}
                {!t.activa && <Badge tone="outline">Inactiva</Badge>}
              </div>
            </summary>
            {editable && <div className="border-t border-line-soft p-4"><FormTasa tasa={t} /></div>}
          </details>
        ))}
      </div>

      {editable && (
        <Panel titulo="Nueva tasa" className="mt-6">
          <FormTasa />
        </Panel>
      )}

      <Panel titulo="Tope de TEA" className="mt-6">
        <p className="mb-3 text-sm text-muted">
          Límite legal (Ley 31143 / BCRP) que debe fijar el área legal. Si está definido, el panel no deja publicar planes con una TEA mayor.
          Valor actual: <strong className="text-fg">{conf?.tope != null ? `${conf.tope} %` : "sin tope"}</strong>.
        </p>
        {puede(sesion, "SUPERADMIN") ? (
          <AdminForm action={guardarTopeTea} className="flex flex-wrap items-end gap-3">
            <CampoTexto label="Tope TEA (%)" name="tope" defaultValue={conf?.tope?.toString() ?? ""} inputMode="decimal" placeholder="vacío = sin tope" />
            <BotonEnviar size="sm">Guardar</BotonEnviar>
          </AdminForm>
        ) : (
          <p className="text-xs text-muted">Solo un superadministrador puede cambiarlo.</p>
        )}
      </Panel>
    </>
  );
}
