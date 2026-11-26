"use client";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink, Field, Input, Select } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { erroresPorCampo } from "@/schemas/solicitudCredito";
import { BIENES, TIPOS_DOC_RECLAMO, reclamoSchema } from "@/schemas/reclamo";

type Datos = {
  tipo: "RECLAMO" | "QUEJA";
  nombres: string;
  apellidos: string;
  tipoDocumento: (typeof TIPOS_DOC_RECLAMO)[number];
  numeroDocumento: string;
  domicilio: string;
  telefono: string;
  email: string;
  menorDeEdad: boolean;
  apoderado: string;
  bienTipo: (typeof BIENES)[number];
  bienMonto: string;
  bienDescripcion: string;
  detalle: string;
  pedido: string;
  aceptaDatos: boolean;
};

const inicial: Datos = {
  tipo: "RECLAMO", nombres: "", apellidos: "", tipoDocumento: "DNI", numeroDocumento: "", domicilio: "", telefono: "", email: "",
  menorDeEdad: false, apoderado: "", bienTipo: "SERVICIO", bienMonto: "", bienDescripcion: "", detalle: "", pedido: "", aceptaDatos: false,
};

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:p-7">
      <legend className="sr-only">{titulo}</legend>
      <h2 className="mb-5 text-lg">{titulo}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function FormularioReclamo() {
  const [datos, setDatos] = useState<Datos>(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<"editando" | "enviando" | "error">("editando");
  const [mensajeError, setMensajeError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [resultado, setResultado] = useState<{ codigo: string; fecha: string } | null>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const v = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setDatos((d) => ({ ...d, [name]: v }));
    if (errores[name])
      setErrores((prev) => {
        const resto = { ...prev };
        delete resto[name];
        return resto;
      });
  };

  const campo = (name: keyof Datos) => ({
    id: `lr-${name}`,
    name,
    value: datos[name] as string,
    onChange,
    invalid: Boolean(errores[name]),
    "aria-describedby": errores[name] ? `lr-${name}-error` : undefined,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = reclamoSchema.safeParse(datos);
    if (!parsed.success) {
      const errs = erroresPorCampo(parsed.error);
      setErrores(errs);
      document.getElementById(`lr-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setEstado("enviando");
    try {
      const res = await fetch("/api/reclamos", {
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
      if (!res.ok || !json.ok) throw new Error(json.error ?? "No pudimos registrar tu reclamo");
      setResultado({ codigo: json.codigo, fecha: json.fecha });
      window.scrollTo(0, 0);
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No pudimos registrar tu reclamo");
      setEstado("error");
    }
  };

  if (resultado) {
    return (
      <div role="status" className="rounded-3xl border border-line-soft bg-surface p-8 text-center shadow-lift md:p-12">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck size={32} strokeWidth={3} />
        </span>
        <h2 className="mt-6 text-[1.8rem]">Registramos tu {datos.tipo === "RECLAMO" ? "reclamo" : "queja"}</h2>
        <p className="mt-3 text-muted">Guarda este código de seguimiento:</p>
        <p className="mt-2 text-3xl font-extrabold tracking-wide text-brand tabular">{resultado.codigo}</p>
        <p className="mt-2 text-sm text-muted">
          Fecha de registro: {new Date(resultado.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}
        </p>
        <p className="mx-auto mt-5 max-w-lg text-sm text-muted">
          Te responderemos al correo <strong className="text-fg">{datos.email}</strong> en un plazo máximo de 15 días hábiles.
          Puedes imprimir esta página como constancia.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => window.print()}>Imprimir constancia</Button>
          <ButtonLink href="/" variant="secondary">Volver al inicio</ButtonLink>
        </div>
      </div>
    );
  }

  const textarea = (name: "detalle" | "pedido", placeholder: string) => (
    <textarea
      id={`lr-${name}`}
      name={name}
      rows={5}
      value={datos[name]}
      onChange={onChange}
      placeholder={placeholder}
      aria-invalid={Boolean(errores[name]) || undefined}
      aria-describedby={errores[name] ? `lr-${name}-error` : undefined}
      className={cn(inputClasses(Boolean(errores[name])), "resize-y")}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="lr-empresa">No llenar</label>
        <input id="lr-empresa" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <Bloque titulo="1. Identificación del consumidor reclamante">
        <Field label="Nombres" htmlFor="lr-nombres" error={errores.nombres}><Input {...campo("nombres")} autoComplete="given-name" /></Field>
        <Field label="Apellidos" htmlFor="lr-apellidos" error={errores.apellidos}><Input {...campo("apellidos")} autoComplete="family-name" /></Field>
        <Field label="Tipo de documento" htmlFor="lr-tipoDocumento">
          <Select {...campo("tipoDocumento")}>{TIPOS_DOC_RECLAMO.map((t) => <option key={t}>{t}</option>)}</Select>
        </Field>
        <Field label="Número de documento" htmlFor="lr-numeroDocumento" error={errores.numeroDocumento}><Input {...campo("numeroDocumento")} /></Field>
        <Field label="Domicilio" htmlFor="lr-domicilio" error={errores.domicilio} className="md:col-span-2"><Input {...campo("domicilio")} autoComplete="street-address" /></Field>
        <Field label="Teléfono" htmlFor="lr-telefono" error={errores.telefono}><Input {...campo("telefono")} inputMode="tel" autoComplete="tel" /></Field>
        <Field label="Correo electrónico" htmlFor="lr-email" error={errores.email}><Input {...campo("email")} type="email" autoComplete="email" /></Field>
        <label className="flex items-center gap-2.5 text-sm font-medium md:col-span-2">
          <input type="checkbox" name="menorDeEdad" checked={datos.menorDeEdad} onChange={onChange} className="size-4 accent-brand" />
          Soy menor de edad
        </label>
        {datos.menorDeEdad && (
          <Field label="Padre, madre o apoderado" htmlFor="lr-apoderado" error={errores.apoderado} className="md:col-span-2">
            <Input {...campo("apoderado")} />
          </Field>
        )}
      </Bloque>

      <Bloque titulo="2. Identificación del bien contratado">
        <Field label="Tipo" htmlFor="lr-bienTipo">
          <Select {...campo("bienTipo")}>
            <option value="SERVICIO">Servicio (financiamiento)</option>
            <option value="PRODUCTO">Producto (moto, motocar, torito o celular)</option>
          </Select>
        </Field>
        <Field label="Monto reclamado (S/)" htmlFor="lr-bienMonto" error={errores.bienMonto} hint="Opcional">
          <Input {...campo("bienMonto")} inputMode="decimal" />
        </Field>
        <Field label="Descripción" htmlFor="lr-bienDescripcion" error={errores.bienDescripcion} className="md:col-span-2">
          <Input {...campo("bienDescripcion")} placeholder="Ej. Crédito vehicular Honda CB125F, contrato JP-2026-000123" />
        </Field>
      </Bloque>

      <Bloque titulo="3. Detalle de la reclamación y pedido del consumidor">
        <div className="md:col-span-2" role="radiogroup" aria-label="Tipo">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "RECLAMO" as const, titulo: "Reclamo", texto: "Disconformidad relacionada con el producto o servicio." },
              { id: "QUEJA" as const, titulo: "Queja", texto: "Malestar o descontento con la atención al público." },
            ].map((o) => (
              <label key={o.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 p-4", datos.tipo === o.id ? "border-brand bg-brand-soft" : "border-line-soft")}>
                <input type="radio" name="tipo" value={o.id} checked={datos.tipo === o.id} onChange={onChange} className="mt-1 accent-brand" />
                <span>
                  <span className="block font-semibold">{o.titulo}</span>
                  <span className="text-sm text-muted">{o.texto}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <Field label="Detalle" htmlFor="lr-detalle" error={errores.detalle} className="md:col-span-2">
          {textarea("detalle", "Cuéntanos qué pasó, con fechas si es posible.")}
        </Field>
        <Field label="Pedido" htmlFor="lr-pedido" error={errores.pedido} className="md:col-span-2">
          {textarea("pedido", "¿Qué solución esperas?")}
        </Field>
      </Bloque>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            id="lr-aceptaDatos"
            type="checkbox"
            name="aceptaDatos"
            checked={datos.aceptaDatos}
            onChange={onChange}
            aria-describedby={errores.aceptaDatos ? "lr-aceptaDatos-error" : undefined}
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          <span>
            Autorizo el tratamiento de mis datos personales para atender este reclamo, según la{" "}
            <a href="/privacidad" className="font-semibold text-brand underline" target="_blank">política de privacidad</a> (Ley 29733).
          </span>
        </label>
        {errores.aceptaDatos && <p id="lr-aceptaDatos-error" role="alert" className="mt-1 text-xs text-danger">{errores.aceptaDatos}</p>}
      </div>

      {estado === "error" && (
        <p role="alert" className="rounded-xl bg-danger/10 p-4 text-sm text-danger">{mensajeError}. Inténtalo de nuevo o escríbenos por WhatsApp.</p>
      )}

      <Button type="submit" size="lg" disabled={estado === "enviando"} className="self-start">
        {estado === "enviando" ? "Enviando…" : `Registrar ${datos.tipo === "RECLAMO" ? "reclamo" : "queja"}`}
      </Button>
    </form>
  );
}
