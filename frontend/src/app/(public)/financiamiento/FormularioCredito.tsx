"use client";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink, ExternalButton, Field, Input, Select } from "@/components/ui";
import { IconCheck, IconMoto, IconPhone } from "@/components/icons";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/whatsapp";
import {
  ESTADOS_CIVILES,
  ETIQUETAS_SERVICIO,
  NIVELES_EDUCACION,
  PREFERENCIAS_CONTACTO,
  SITUACIONES_LABORALES,
  TIPOS_DOCUMENTO,
  erroresPorCampo,
  solicitudCreditoSchema,
  type Servicio,
  type SolicitudCreditoInput,
} from "@/schemas/solicitudCredito";

type Datos = Omit<SolicitudCreditoInput, "aceptaDatos"> & { aceptaDatos: boolean };
type Estado = "editando" | "enviando" | "enviado" | "error";

const etiquetasDocumento: Record<string, string> = { DNI: "DNI", CE: "Carné de extranjería", Pasaporte: "Pasaporte" };
const etiquetasEducacion: Record<string, string> = {
  Primaria: "Primaria",
  Secundaria: "Secundaria completa",
  Técnico: "Estudios técnicos",
  Universitario: "Universitario",
};
const placeholderDocumento: Record<string, string> = { DNI: "8 dígitos", CE: "9 dígitos", Pasaporte: "6 a 12 caracteres" };

const opcionesServicio: { id: Servicio; titulo: string; detalle: string; Icon: typeof IconMoto }[] = [
  { id: "CREDITO_VEHICULAR", titulo: "Moto o mototaxi", detalle: "Cuotas mensuales", Icon: IconMoto },
  { id: "CREDITO_CELULAR", titulo: "Celular", detalle: "Cuotas semanales", Icon: IconPhone },
];

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card md:p-8">
      <legend className="sr-only">{titulo}</legend>
      <h2 aria-hidden className="mb-6 flex items-center gap-3 text-xl">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{numero}</span>
        {titulo}
      </h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export interface ValoresIniciales {
  servicio?: Servicio;
  producto?: string;
  inicial?: string;
}

export function FormularioCredito({ inicial = {} }: { inicial?: ValoresIniciales }) {
  const [datos, setDatos] = useState<Datos>({
    servicio: inicial.servicio ?? "CREDITO_VEHICULAR",
    productoInteres: inicial.producto ?? "",
    montoInicial: inicial.inicial ?? "",
    nombres: "",
    apellidos: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    fechaNacimiento: "",
    estadoCivil: "Soltero(a)",
    nivelEducacion: "Secundaria",
    celular: "",
    correo: "",
    preferenciaContacto: "WhatsApp",
    departamento: "",
    provincia: "",
    distrito: "",
    situacionLaboral: "Independiente",
    ingresoMensual: "",
    aceptaDatos: false,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<Estado>("editando");
  const [honeypot, setHoneypot] = useState("");

  const quitarError = (name: string) =>
    setErrores((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _quitado, ...resto } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return resto;
    });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const v = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setDatos((d) => ({ ...d, [name]: v }));
    quitarError(name);
  };

  const elegirServicio = (s: Servicio) => {
    setDatos((d) => ({ ...d, servicio: s }));
    quitarError("productoInteres");
  };

  /** Props comunes de cada control: valor, error y atributos accesibles. */
  const campo = (name: keyof Datos) => ({
    id: name,
    name,
    value: datos[name] as string,
    onChange,
    invalid: Boolean(errores[name]),
    "aria-describedby": errores[name] ? `${name}-error` : undefined,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = solicitudCreditoSchema.safeParse(datos);
    if (!parsed.success) {
      const errs = erroresPorCampo(parsed.error);
      setErrores(errs);
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }

    setEstado("enviando");
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, empresa_web: honeypot }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 422 && json.errors) {
        setErrores(json.errors);
        setEstado("editando");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Error");
      setEstado("enviado");
      window.scrollTo(0, 0);
    } catch {
      setEstado("error");
    }
  };

  // Respaldo: si el envío falla, el cliente puede mandar sus datos por WhatsApp y no se pierde la solicitud.
  const mensajeRespaldo = [
    `Hola, quiero solicitar: ${ETIQUETAS_SERVICIO[datos.servicio]}.`,
    `Producto: ${datos.productoInteres}`,
    `Nombre: ${datos.nombres} ${datos.apellidos}`,
    `${datos.tipoDocumento}: ${datos.numeroDocumento}`,
    `Celular: ${datos.celular}`,
    `Ingreso mensual: S/ ${datos.ingresoMensual}`,
    `Ubicación: ${datos.distrito}, ${datos.provincia}, ${datos.departamento}`,
  ].join("\n");

  if (estado === "enviado") {
    return (
      <div role="status" className="mx-auto max-w-[620px] rounded-3xl border border-line-soft bg-surface p-8 text-center shadow-lift md:p-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck size={32} strokeWidth={3} />
        </span>
        <h2 className="mt-6 text-[1.8rem]">¡Recibimos tu solicitud!</h2>
        <p className="mt-3 text-muted">
          {datos.nombres}, un asesor revisará tus datos y te contactará por{" "}
          <strong className="text-fg">{datos.preferenciaContacto}</strong> en menos de 24 horas hábiles.
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-8">Volver al inicio</ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* Honeypot anti-spam (oculto para personas) */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="empresa_web">No llenar</label>
        <input id="empresa_web" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <Seccion numero={1} titulo="¿Qué quieres financiar?">
        <div className="col-span-full grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Producto a financiar">
          {opcionesServicio.map(({ id, titulo, detalle, Icon }) => {
            const activo = datos.servicio === id;
            return (
              <label
                key={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all",
                  activo ? "border-brand bg-brand-soft" : "border-line-soft hover:border-line",
                )}
              >
                <input
                  type="radio"
                  name="servicio"
                  value={id}
                  checked={activo}
                  onChange={() => elegirServicio(id)}
                  className="sr-only"
                />
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", activo ? "bg-brand text-white" : "bg-surface-2 text-brand")}>
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-bold">{titulo}</span>
                  <span className="block text-xs text-muted">{detalle}</span>
                </span>
              </label>
            );
          })}
        </div>

        <Field
          label={datos.servicio === "CREDITO_VEHICULAR" ? "Moto o mototaxi de interés" : "Celular de interés"}
          htmlFor="productoInteres"
          error={errores.productoInteres}
        >
          <Input
            {...campo("productoInteres")}
            placeholder={datos.servicio === "CREDITO_VEHICULAR" ? "Ej. Honda Navi" : "Ej. Samsung Galaxy A56"}
          />
        </Field>
        <Field label="Cuota inicial disponible (S/)" htmlFor="montoInicial" error={errores.montoInicial} hint="Opcional. Una inicial mayor reduce tus cuotas.">
          <Input {...campo("montoInicial")} inputMode="decimal" placeholder="Ej. 500" />
        </Field>
      </Seccion>

      <Seccion numero={2} titulo="Tus datos">
        <Field label="Nombres" htmlFor="nombres" error={errores.nombres}>
          <Input {...campo("nombres")} autoComplete="given-name" />
        </Field>
        <Field label="Apellidos" htmlFor="apellidos" error={errores.apellidos}>
          <Input {...campo("apellidos")} autoComplete="family-name" />
        </Field>
        <Field label="Tipo de documento" htmlFor="tipoDocumento">
          <Select {...campo("tipoDocumento")}>
            {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{etiquetasDocumento[t]}</option>)}
          </Select>
        </Field>
        <Field label="Número de documento" htmlFor="numeroDocumento" error={errores.numeroDocumento}>
          <Input
            {...campo("numeroDocumento")}
            inputMode={datos.tipoDocumento === "Pasaporte" ? "text" : "numeric"}
            maxLength={datos.tipoDocumento === "DNI" ? 8 : 12}
            placeholder={placeholderDocumento[datos.tipoDocumento]}
          />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="fechaNacimiento" error={errores.fechaNacimiento}>
          <Input {...campo("fechaNacimiento")} type="date" autoComplete="bday" />
        </Field>
        <Field label="Estado civil" htmlFor="estadoCivil">
          <Select {...campo("estadoCivil")}>
            {ESTADOS_CIVILES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Nivel de educación" htmlFor="nivelEducacion" className="md:col-span-2">
          <Select {...campo("nivelEducacion")}>
            {NIVELES_EDUCACION.map((t) => <option key={t} value={t}>{etiquetasEducacion[t]}</option>)}
          </Select>
        </Field>
      </Seccion>

      <Seccion numero={3} titulo="Contacto y domicilio">
        <Field label="Celular" htmlFor="celular" error={errores.celular} hint="9 dígitos, ej. 987654321">
          <Input {...campo("celular")} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={12} />
        </Field>
        <Field label="Correo electrónico" htmlFor="correo" error={errores.correo}>
          <Input {...campo("correo")} type="email" autoComplete="email" />
        </Field>
        <Field label="¿Cómo prefieres que te contactemos?" htmlFor="preferenciaContacto" className="md:col-span-2">
          <Select {...campo("preferenciaContacto")}>
            {PREFERENCIAS_CONTACTO.map((t) => (
              <option key={t} value={t}>{t === "WhatsApp" ? "WhatsApp (recomendado)" : t === "Llamada" ? "Llamada telefónica" : "Correo electrónico"}</option>
            ))}
          </Select>
        </Field>
        <Field label="Departamento" htmlFor="departamento" error={errores.departamento}>
          <Input {...campo("departamento")} placeholder="Ej. Lima" autoComplete="address-level1" />
        </Field>
        <Field label="Provincia" htmlFor="provincia" error={errores.provincia}>
          <Input {...campo("provincia")} autoComplete="address-level2" />
        </Field>
        <Field label="Distrito donde vives" htmlFor="distrito" error={errores.distrito} className="md:col-span-2">
          <Input {...campo("distrito")} autoComplete="address-level3" />
        </Field>
      </Seccion>

      <Seccion numero={4} titulo="Tu actividad">
        <div className="col-span-full" role="radiogroup" aria-labelledby="lbl-laboral">
          <span id="lbl-laboral" className="mb-2 block text-sm font-semibold">¿A qué te dedicas?</span>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {SITUACIONES_LABORALES.map((s) => {
              const activo = datos.situacionLaboral === s;
              return (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all",
                    activo ? "border-brand bg-brand-soft text-brand" : "border-line-soft text-muted hover:border-line",
                  )}
                >
                  <input type="radio" name="situacionLaboral" value={s} checked={activo} onChange={onChange} className="sr-only" />
                  {s}
                </label>
              );
            })}
          </div>
        </div>
        <Field label="Ingreso mensual aproximado (S/)" htmlFor="ingresoMensual" error={errores.ingresoMensual} className="md:col-span-2">
          <Input {...campo("ingresoMensual")} inputMode="decimal" placeholder="Ej. 1800" />
        </Field>
      </Seccion>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            id="aceptaDatos"
            name="aceptaDatos"
            checked={datos.aceptaDatos}
            onChange={onChange}
            aria-describedby={errores.aceptaDatos ? "aceptaDatos-error" : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-brand"
          />
          <span>
            Autorizo a Inversiones JP a tratar mis datos personales para evaluar mi solicitud y contactarme (incluso por WhatsApp), conforme a
            la Ley N.° 29733 de Protección de Datos Personales y la{" "}
            <a href="/privacidad" target="_blank" className="font-semibold text-brand underline">política de privacidad</a>.
          </span>
        </label>
        {errores.aceptaDatos && (
          <p id="aceptaDatos-error" role="alert" className="mt-1 text-xs text-danger">{errores.aceptaDatos}</p>
        )}
      </div>

      {Object.keys(errores).length > 0 && (
        <p role="alert" className="text-center text-sm font-medium text-danger">Revisa los campos marcados en rojo.</p>
      )}

      {estado === "error" && (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-5 text-center">
          <p className="mb-4">No pudimos enviar tu solicitud. Vuelve a intentarlo o envíanos tus datos por WhatsApp:</p>
          <ExternalButton href={whatsappLink(mensajeRespaldo)} variant="whatsapp" size="sm">Enviar por WhatsApp</ExternalButton>
        </div>
      )}

      <div className="text-center">
        <Button type="submit" size="lg" disabled={estado === "enviando"} className="w-full max-w-[420px]">
          {estado === "enviando" ? "Enviando…" : "Enviar solicitud"}
        </Button>
        <p className="mt-3 text-xs text-muted">Al enviar certificas que los datos ingresados son verídicos y verificables.</p>
      </div>
    </form>
  );
}
