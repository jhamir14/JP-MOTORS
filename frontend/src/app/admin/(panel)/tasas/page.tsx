import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, CampoTexto, Check, Encabezado, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ETIQUETA_SERVICIO, SERVICIOS_CREDITO, SERVICIOS_FINANCIAMIENTO } from "@/lib/admin/constantes";
import { feriadosNacionales } from "@/lib/calendario";
import { CATEGORIAS, ETIQUETA_CATEGORIA, type CategoriaProducto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA, FRECUENCIAS, PERIODOS_POR_ANIO, calcularCredito, type Frecuencia, type TipoCalculo } from "@/lib/finance";
import { puede, requerirSeccion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { datosEmpresa } from "@/lib/server/documentos";
import { describirBeneficio } from "@/lib/scoring";
import { configBeneficios } from "@/lib/server/scoring";
import { guardarBeneficios, guardarDatosDocumentos, guardarFeriados, guardarTasa, guardarTopeTea } from "./actions";

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
      <CampoSelect label="Servicio" name="servicio" id={`servicio-${k}`} defaultValue={tasa?.servicio} opciones={SERVICIOS_FINANCIAMIENTO.map((s) => ({ value: s, label: ETIQUETA_SERVICIO[s] }))} />
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
  const sesion = await requerirSeccion("tasas");
  const editable = puede(sesion, "SUPERADMIN", "ADMIN_CREDITOS");
  const db = sql();
  const [tasas, [conf], [fer], empresa, beneficios] = await Promise.all([
    db<Tasa[]>`
      select id, servicio, categoria, nombre, frecuencia, tipo_calculo, tasa_porcentaje::float8 as tasa, cuotas_min, cuotas_max,
             penalidad_diaria::float8 as penalidad, publica, activa
      from public.tasa_servicio where servicio <> 'PRESTAMO_EFECTIVO' order by activa desc, servicio, frecuencia`,
    db<{ tope: number | null }[]>`
      select case when jsonb_typeof(valor) = 'number' then (valor #>> '{}')::numeric::float8 end as tope
      from public.configuracion where clave = 'tope_tea_porcentaje'`,
    db<{ fechas: string[] | null }[]>`
      select case when jsonb_typeof(valor) = 'array' then valor end as fechas from public.configuracion where clave = 'feriados'`,
    datosEmpresa(db),
    configBeneficios(db),
  ]);
  const fechasFeriados = fer?.fechas ?? [];
  const anioActual = new Date().getFullYear();
  const nombres = new Map([anioActual - 1, anioActual, anioActual + 1, anioActual + 2].flatMap((a) => feriadosNacionales(a)).map((f) => [f.fecha, f.nombre]));
  const textoFeriados = fechasFeriados.map((f) => `${f}${nombres.has(f) ? ` ${nombres.get(f)}` : ""}`).join("\n");
  const faltanAnios = [anioActual, anioActual + 1].filter((a) => !fechasFeriados.some((f) => f.startsWith(String(a))));

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

      <Panel titulo={`Feriados (${fechasFeriados.length})`} className="mt-6">
        <p className="mb-3 text-sm text-muted">
          Los domingos y feriados <strong className="text-fg">no se cobran</strong>: ninguna cuota del cronograma vence en esas fechas (pasa al
          siguiente día hábil) y los cronogramas diarios los saltan. Agrega aquí los feriados que decrete el Gobierno.
        </p>
        {faltanAnios.length > 0 && (
          <p role="alert" className="mb-3 rounded-xl bg-gold-soft px-4 py-2 text-sm font-medium text-[#8a5d00]">
            Faltan los feriados de {faltanAnios.join(" y ")}. Puedes copiarlos de la lista sugerida de abajo.
          </p>
        )}
        {puede(sesion, "SUPERADMIN") ? (
          <AdminForm action={guardarFeriados} className="grid gap-3">
            <CampoArea
              label="Una fecha por línea (AAAA-MM-DD y nombre opcional)"
              name="feriados"
              defaultValue={textoFeriados}
              rows={10}
              className="font-mono"
            />
            <BotonEnviar size="sm" className="justify-self-start">Guardar feriados</BotonEnviar>
          </AdminForm>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {fechasFeriados.filter((f) => f.startsWith(String(anioActual)) || f.startsWith(String(anioActual + 1))).map((f) => (
              <li key={f} className="tabular">{f} {nombres.get(f) ?? ""}</li>
            ))}
          </ul>
        )}
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer font-semibold text-brand">Feriados nacionales sugeridos {anioActual + 1}–{anioActual + 2}</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3">
            {[anioActual + 1, anioActual + 2].flatMap((a) => feriadosNacionales(a)).map((f) => `${f.fecha} ${f.nombre}`).join("\n")}
          </pre>
        </details>
      </Panel>

      <Panel titulo="Tope de TEA (opcional)" className="mt-6">
        <p className="mb-3 text-sm text-muted">
          Opcional. Si se define, el panel no deja publicar planes con una TEA mayor.
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
      <Panel titulo="Beneficios por score" className="mt-6" acciones={beneficios.activo ? <Badge tone="accent">Activos</Badge> : <Badge tone="outline">Desactivados</Badge>}>
        <p className="mb-3 text-sm text-muted">
          Se sugieren al registrar el <strong className="text-fg">siguiente financiamiento</strong> de un cliente puntual: el asesor pulsa «Aplicar beneficio»
          y la tasa y la inicial bajan, y se permiten más cuotas que el máximo de la tasa. Lo aplicado queda guardado en el crédito.
          El score (1–5) se calcula cada noche y después de cada pago con la puntualidad, el atraso máximo, los bloqueos o cortes de GPS y los créditos cancelados.
        </p>
        {puede(sesion, "SUPERADMIN") ? (
          <AdminForm action={guardarBeneficios} className="grid gap-4">
            {beneficios.niveles.slice(0, 2).map((n, i) => (
              <fieldset key={i} className="grid gap-3 rounded-xl border border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-5">
                <legend className="px-1 text-sm font-semibold">Nivel {i + 1}</legend>
                <CampoTexto label="Nombre" name={`nombre${i + 1}`} defaultValue={n.nombre} maxLength={40} required />
                <CampoSelect label="Desde score" name={`scoreMin${i + 1}`} defaultValue={String(n.scoreMin)} opciones={["5", "4", "3"].map((x) => ({ value: x, label: `${x} ${"★".repeat(Number(x))}` }))} />
                <CampoTexto label="Descuento de tasa (%)" name={`descuentoTasa${i + 1}`} defaultValue={String(n.descuentoTasaPct)} inputMode="decimal" hint="10 = una tasa de 3 % baja a 2.7 %" />
                <CampoTexto label="Menos inicial (%)" name={`reduccionInicial${i + 1}`} defaultValue={String(n.reduccionInicialPct)} inputMode="decimal" hint="50 = la mitad" />
                <CampoTexto label="Cuotas extra" name={`cuotasExtra${i + 1}`} defaultValue={String(n.cuotasExtra)} inputMode="numeric" />
              </fieldset>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <Check label="Beneficios activos" name="activo" defaultChecked={beneficios.activo} />
                <Check label="Solo si ya canceló al menos un crédito" name="requiereCreditoCancelado" defaultChecked={beneficios.requiereCreditoCancelado} />
                <Check label="No registrar créditos a clientes con cuotas vencidas" name="bloquearConMora" defaultChecked={beneficios.bloquearConMora} hint="Si se desmarca, solo se advierte." />
              </div>
              <CampoSelect
                label="Pedir confirmación de riesgo con score"
                name="alertaScoreMax"
                defaultValue={String(beneficios.alertaScoreMax)}
                opciones={[{ value: "0", label: "Nunca" }, { value: "1", label: "1" }, { value: "2", label: "2 o menos" }, { value: "3", label: "3 o menos" }]}
              />
            </div>
            <BotonEnviar size="sm" className="justify-self-start">Guardar beneficios</BotonEnviar>
          </AdminForm>
        ) : (
          <ul className="grid gap-1 text-sm">
            {beneficios.niveles.map((n) => (
              <li key={n.nombre}><strong>{n.nombre}</strong> (score {n.scoreMin}+): {describirBeneficio(n)}</li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel titulo="Datos para contratos y recibos" className="mt-6" acciones={empresa.validados ? <Badge tone="accent">Textos validados</Badge> : <Badge tone="outline">Modelo referencial</Badge>}>
        <p className="mb-3 text-sm text-muted">
          Se imprimen en los contratos, el pagaré y los recibos de pago ({empresa.razonSocial}, RUC {empresa.ruc}). Si falta un dato, el documento
          deja una línea para completarlo a mano. Estos datos no se publican en la web.
        </p>
        {puede(sesion, "SUPERADMIN") ? (
          <AdminForm action={guardarDatosDocumentos} className="grid gap-3 sm:grid-cols-2">
            <CampoTexto label="Representante legal" name="representanteLegal" defaultValue={empresa.representante ?? ""} placeholder="Nombres y apellidos" maxLength={120} />
            <CampoTexto label="Documento del representante" name="representanteDocumento" defaultValue={empresa.representanteDocumento ?? ""} placeholder="DNI N.° 12345678" maxLength={60} />
            <CampoTexto label="Domicilio de la empresa" name="domicilio" defaultValue={empresa.domicilio ?? ""} placeholder="Av. …, distrito, provincia" maxLength={250} />
            <CampoTexto label="Ciudad (firma y jurisdicción)" name="ciudad" defaultValue={empresa.ciudad} required maxLength={60} />
            <div className="sm:col-span-2">
              <Check
                label="Un abogado validó los textos de los contratos, la cláusula de bloqueo y el pagaré"
                name="validados"
                defaultChecked={empresa.validados}
                hint="Solo es un registro interno: los documentos ya no muestran ningún aviso de modelo referencial."
              />
            </div>
            <BotonEnviar size="sm" className="justify-self-start">Guardar datos</BotonEnviar>
          </AdminForm>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Representante legal</dt><dd className="font-semibold">{empresa.representante ?? "—"}</dd></div>
            <div><dt className="text-xs text-muted">Ciudad</dt><dd className="font-semibold">{empresa.ciudad}</dd></div>
          </dl>
        )}
      </Panel>
    </>
  );
}
