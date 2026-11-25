"use client";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink, ExternalButton, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/whatsapp";
import {
  ESTADOS_CIVILES,
  MARCAS_MOTO,
  NIVELES_EDUCACION,
  PREFERENCIAS_CONTACTO,
  SITUACIONES_LABORALES,
  TIPOS_DOCUMENTO,
  USOS_MOTO,
  erroresPorCampo,
  solicitudCreditoSchema,
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
const etiquetasUso: Record<string, string> = {
  Trabajo: "Transporte público / delivery / herramienta de trabajo",
  Urbano: "Transporte personal urbano",
  Paseo: "Viajes largos / paseo de fin de semana",
};
const placeholderDocumento: Record<string, string> = { DNI: "8 dígitos", CE: "9 dígitos", Pasaporte: "6 a 12 caracteres" };

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="form-card">
      <legend className="sr-only">{titulo}</legend>
      <h2 aria-hidden className="mb-6 flex items-center gap-2.5 border-b border-line pb-3 text-2xl font-extrabold uppercase text-white">
        <span className="text-accent">{numero}.</span> {titulo}
      </h2>
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

export function FormularioCredito({ modeloInicial = "" }: { modeloInicial?: string }) {
  const [datos, setDatos] = useState<Datos>({
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
    marcaMoto: "Honda",
    modeloMoto: modeloInicial,
    usoMoto: "Trabajo",
    situacionLaboral: "Dependiente",
    ingresoMensual: "",
    montoInicial: "",
    aceptaDatos: false,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<Estado>("editando");
  const [honeypot, setHoneypot] = useState("");

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const v = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setDatos((d) => ({ ...d, [name]: v }));
    if (errores[name])
      setErrores((prev) => {
        const { [name]: _quitado, ...resto } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
        return resto;
      });
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
    "Hola, quiero solicitar un crédito.",
    `Nombre: ${datos.nombres} ${datos.apellidos}`,
    `${datos.tipoDocumento}: ${datos.numeroDocumento}`,
    `Celular: ${datos.celular}`,
    `Moto: ${datos.marcaMoto} ${datos.modeloMoto}`,
    `Inicial: S/ ${datos.montoInicial} · Ingreso mensual: S/ ${datos.ingresoMensual}`,
    `Ubicación: ${datos.distrito}, ${datos.provincia}, ${datos.departamento}`,
  ].join("\n");

  if (estado === "enviado") {
    return (
      <div role="status" className="mx-auto max-w-[600px] rounded-2xl border border-accent/30 bg-[rgba(15,17,21,0.8)] p-10 text-center shadow-[0_20px_40px_rgba(0,229,255,0.1)]">
        <h2 className="mb-4 text-4xl font-black text-accent">¡Solicitud ingresada!</h2>
        <p className="mb-8 text-lg">
          {datos.nombres}, recibimos tu solicitud. Un asesor evaluará tus datos y te contactará a la brevedad por{" "}
          <strong className="text-white">{datos.preferenciaContacto}</strong>.
        </p>
        <ButtonLink href="/motos">Explorar catálogo de motos</ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Honeypot anti-spam (oculto para personas) */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="empresa_web">No llenar</label>
        <input id="empresa_web" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <Seccion numero={1} titulo="Ficha personal">
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
          <Input {...campo("fechaNacimiento")} type="date" autoComplete="bday" className="[color-scheme:dark]" />
        </Field>
        <Field label="Estado civil" htmlFor="estadoCivil">
          <Select {...campo("estadoCivil")}>
            {ESTADOS_CIVILES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Nivel de educación" htmlFor="nivelEducacion">
          <Select {...campo("nivelEducacion")}>
            {NIVELES_EDUCACION.map((t) => <option key={t} value={t}>{etiquetasEducacion[t]}</option>)}
          </Select>
        </Field>
      </Seccion>

      <Seccion numero={2} titulo="Domicilio y contacto">
        <Field label="Celular" htmlFor="celular" error={errores.celular} hint="9 dígitos, ej. 987654321">
          <Input {...campo("celular")} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={12} />
        </Field>
        <Field label="Correo electrónico" htmlFor="correo" error={errores.correo}>
          <Input {...campo("correo")} type="email" autoComplete="email" />
        </Field>
        <Field label="Preferencia de contacto" htmlFor="preferenciaContacto">
          <Select {...campo("preferenciaContacto")}>
            {PREFERENCIAS_CONTACTO.map((t) => (
              <option key={t} value={t}>{t === "WhatsApp" ? "WhatsApp (recomendado)" : t === "Llamada" ? "Llamada telefónica" : "Correo electrónico"}</option>
            ))}
          </Select>
        </Field>
        <div className="max-md:hidden" />
        <Field label="Departamento" htmlFor="departamento" error={errores.departamento}>
          <Input {...campo("departamento")} placeholder="Ej. Lima" autoComplete="address-level1" />
        </Field>
        <Field label="Provincia" htmlFor="provincia" error={errores.provincia}>
          <Input {...campo("provincia")} autoComplete="address-level2" />
        </Field>
        <Field label="Distrito (residencia actual)" htmlFor="distrito" error={errores.distrito} className="col-span-full">
          <Input {...campo("distrito")} autoComplete="address-level3" />
        </Field>
      </Seccion>

      <Seccion numero={3} titulo="La motocicleta">
        <Field label="Marca de la moto" htmlFor="marcaMoto">
          <Select {...campo("marcaMoto")}>
            {MARCAS_MOTO.map((t) => <option key={t} value={t}>{t === "Otra" ? "Otra marca" : t}</option>)}
          </Select>
        </Field>
        <Field label="Modelo (ej. Navi)" htmlFor="modeloMoto" error={errores.modeloMoto}>
          <Input {...campo("modeloMoto")} />
        </Field>
        <Field label="¿Qué uso principal tendrá el vehículo?" htmlFor="usoMoto" className="col-span-full">
          <Select {...campo("usoMoto")}>
            {USOS_MOTO.map((t) => <option key={t} value={t}>{etiquetasUso[t]}</option>)}
          </Select>
        </Field>
      </Seccion>

      <Seccion numero={4} titulo="Perfil crediticio">
        <div className="col-span-full rounded-lg border border-dashed border-accent/20 bg-accent/5 p-5">
          <p className="text-[0.9rem] text-accent">
            💡 <strong>Tip:</strong> mientras mayor sea tu inicial, mayores las posibilidades de aprobación y menores tus cuotas.
          </p>
        </div>
        <Field label="Monto inicial con el que cuentas (S/)" htmlFor="montoInicial" error={errores.montoInicial}>
          <Input {...campo("montoInicial")} inputMode="decimal" placeholder="Ej. 500" />
        </Field>
        <Field label="Ingreso mensual (S/)" htmlFor="ingresoMensual" error={errores.ingresoMensual}>
          <Input {...campo("ingresoMensual")} inputMode="decimal" placeholder="Ej. 1800" />
        </Field>
        <div className="col-span-full" role="radiogroup" aria-labelledby="lbl-laboral">
          <span id="lbl-laboral" className="mb-1.5 block text-sm font-bold text-muted">Situación laboral</span>
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            {SITUACIONES_LABORALES.map((s) => {
              const activo = datos.situacionLaboral === s;
              return (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2.5 rounded-lg p-4 transition-all",
                    activo ? "border-2 border-accent bg-accent/5 font-extrabold text-white" : "border border-line text-muted",
                  )}
                >
                  <input type="radio" name="situacionLaboral" value={s} checked={activo} onChange={onChange} className="size-[18px] accent-accent" />
                  {s}
                </label>
              );
            })}
          </div>
        </div>
      </Seccion>

      <div className="mt-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            id="aceptaDatos"
            name="aceptaDatos"
            checked={datos.aceptaDatos}
            onChange={onChange}
            aria-describedby={errores.aceptaDatos ? "aceptaDatos-error" : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-accent"
          />
          <span>
            Autorizo a Inversiones JP a tratar mis datos personales para evaluar mi solicitud de crédito y contactarme,
            conforme a la Ley N.° 29733 de Protección de Datos Personales.
          </span>
        </label>
        {errores.aceptaDatos && (
          <p id="aceptaDatos-error" role="alert" className="mt-1 text-xs text-red-400">{errores.aceptaDatos}</p>
        )}
      </div>

      {Object.keys(errores).length > 0 && (
        <p role="alert" className="mt-6 text-center text-sm text-red-400">Revisa los campos marcados en rojo.</p>
      )}

      {estado === "error" && (
        <div role="alert" className="mt-6 rounded-xl border border-red-400/40 bg-red-400/5 p-5 text-center">
          <p className="mb-4 text-white">No pudimos enviar tu solicitud. Vuelve a intentarlo o envíanos tus datos por WhatsApp:</p>
          <ExternalButton href={whatsappLink(mensajeRespaldo)} variant="whatsapp" size="sm">Enviar por WhatsApp</ExternalButton>
        </div>
      )}

      <div className="mt-12 text-center">
        <Button type="submit" size="lg" disabled={estado === "enviando"} className="w-full max-w-[400px] py-5 text-xl font-black">
          {estado === "enviando" ? "Enviando…" : "Solicitar evaluación"}
        </Button>
        <p className="mt-4 text-[0.8rem]">Al enviar certificas que los datos ingresados son verídicos y verificables.</p>
      </div>
    </form>
  );
}
