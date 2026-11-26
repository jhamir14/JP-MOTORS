import type { ReactNode } from "react";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { RellenarGps } from "@/components/admin/Gps";
import { CampoArea, CampoSelect, CampoTexto } from "@/components/admin/ui";
import { legible } from "@/lib/admin/constantes";
import { ESTADOS_CIVILES, ETIQUETA_DOCUMENTO, SEXOS, TIPOS_DOCUMENTO, TIPOS_VIVIENDA } from "@/lib/clientes";
import { guardarCliente } from "./actions";

/** Datos que muestra/edita el formulario (los nombres coinciden con las columnas de `cliente`). */
export interface ClienteEditable {
  id?: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  email: string | null;
  direccion: string | null;
  urbanizacion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  referencia: string | null;
  tipo_vivienda: string | null;
  latitud: number | null;
  longitud: number | null;
  ocupacion: string | null;
  direccion_trabajo: string | null;
  ingreso_mensual: number | null;
  notas: string | null;
}

const conVacio = (vals: readonly string[], vacio = "— Sin dato —") => [{ value: "", label: vacio }, ...vals.map((v) => ({ value: v, label: legible(v) }))];

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 md:col-span-3 md:grid-cols-3">
      <legend className="mb-1 text-sm font-bold text-brand-ink md:col-span-3">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function FormCliente({ cliente, solicitudId }: { cliente?: Partial<ClienteEditable>; solicitudId?: string }) {
  const c = cliente ?? {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));
  return (
    <AdminForm action={guardarCliente} className="grid gap-6 md:grid-cols-3">
      <input type="hidden" name="id" value={c.id ?? ""} />
      <input type="hidden" name="solicitudId" value={solicitudId ?? ""} />
      {c.id && <input type="hidden" name="numeroOriginal" value={c.numero_documento ?? ""} />}

      <Seccion titulo="Identidad">
        <CampoTexto label="Nombres" name="nombres" defaultValue={v(c.nombres)} required autoComplete="off" />
        <CampoTexto label="Apellidos" name="apellidos" defaultValue={v(c.apellidos)} required autoComplete="off" />
        <CampoTexto label="Fecha de nacimiento" name="fechaNacimiento" type="date" defaultValue={v(c.fecha_nacimiento)} />
        <CampoSelect
          label="Tipo de documento"
          name="tipoDocumento"
          defaultValue={c.tipo_documento ?? "DNI"}
          opciones={TIPOS_DOCUMENTO.map((t) => ({ value: t, label: ETIQUETA_DOCUMENTO[t] }))}
        />
        <CampoTexto
          label="N.º de documento"
          name="numeroDocumento"
          defaultValue={v(c.numero_documento)}
          required
          autoComplete="off"
          hint="Se verifica que no exista otro cliente con el mismo documento (o su RUC 10)."
        />
        <CampoSelect label="Sexo" name="sexo" defaultValue={c.sexo ?? ""} opciones={conVacio(SEXOS)} />
        <CampoSelect label="Estado civil" name="estadoCivil" defaultValue={c.estado_civil ?? ""} opciones={conVacio(ESTADOS_CIVILES)} />
      </Seccion>

      <Seccion titulo="Contacto">
        <CampoTexto label="Celular" name="telefono" defaultValue={v(c.telefono)} inputMode="tel" required placeholder="987654321" />
        <CampoTexto label="Teléfono 2" name="telefonoSecundario" defaultValue={v(c.telefono_secundario)} inputMode="tel" />
        <CampoTexto label="Correo" name="email" type="email" defaultValue={v(c.email)} />
      </Seccion>

      <Seccion titulo="Domicilio">
        <CampoTexto label="Dirección" name="direccion" defaultValue={v(c.direccion)} className="md:col-span-2" placeholder="Av./Jr./Mz. Lt." />
        <CampoTexto label="Urbanización / A.H." name="urbanizacion" defaultValue={v(c.urbanizacion)} />
        <CampoTexto label="Distrito" name="distrito" defaultValue={v(c.distrito)} />
        <CampoTexto label="Provincia" name="provincia" defaultValue={v(c.provincia)} />
        <CampoTexto label="Departamento" name="departamento" defaultValue={v(c.departamento)} />
        <CampoTexto label="Referencia" name="referencia" defaultValue={v(c.referencia)} className="md:col-span-2" placeholder="Frente al parque, casa de dos pisos color verde…" />
        <CampoSelect label="Vivienda" name="tipoVivienda" defaultValue={c.tipo_vivienda ?? ""} opciones={conVacio(TIPOS_VIVIENDA)} />
        <CampoTexto label="Latitud" name="latitud" id="latitud" defaultValue={v(c.latitud)} inputMode="decimal" placeholder="-12.046374" />
        <CampoTexto label="Longitud" name="longitud" id="longitud" defaultValue={v(c.longitud)} inputMode="decimal" placeholder="-77.042793" />
        <div className="self-end pb-1">
          <RellenarGps />
        </div>
      </Seccion>

      <Seccion titulo="Trabajo o negocio">
        <CampoTexto label="Ocupación / giro" name="ocupacion" defaultValue={v(c.ocupacion)} placeholder="Conductor de motocar, bodega, comerciante…" />
        <CampoTexto label="Ingreso mensual (S/)" name="ingresoMensual" defaultValue={c.ingreso_mensual != null ? c.ingreso_mensual.toFixed(2) : ""} inputMode="decimal" />
        <CampoTexto label="Dirección del trabajo" name="direccionTrabajo" defaultValue={v(c.direccion_trabajo)} />
      </Seccion>

      <CampoArea label="Notas internas" name="notas" defaultValue={v(c.notas)} rows={3} className="md:col-span-3" />

      <div className="md:col-span-3">
        <BotonEnviar>{c.id ? "Guardar cambios" : "Registrar cliente"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}
