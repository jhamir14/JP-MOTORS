import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { CampoSelect, CampoTexto } from "@/components/admin/ui";
import { legible } from "@/lib/admin/constantes";
import { SEXOS } from "@/lib/clientes";
import { guardarCliente } from "./actions";

/** Datos que muestra/edita el formulario (los nombres coinciden con las columnas de `cliente`). */
export interface ClienteEditable {
  id?: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  sexo: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ocupacion: string | null;
  // Datos que llegan de una solicitud web: se guardan como nota, ya no se piden en el formulario.
  notas?: string | null;
}

/**
 * Ficha simple del cliente: nombre, apellido, DNI, sexo, celular y correo.
 * El domicilio y el trabajo son opcionales. (Otros datos antiguos del cliente se conservan tal cual.)
 */
export function FormCliente({ cliente, solicitudId }: { cliente?: Partial<ClienteEditable>; solicitudId?: string }) {
  const c = cliente ?? {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));
  return (
    <AdminForm action={guardarCliente} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={c.id ?? ""} />
      <input type="hidden" name="solicitudId" value={solicitudId ?? ""} />
      <input type="hidden" name="tipoDocumento" value={c.tipo_documento ?? "DNI"} />
      {c.notas ? <input type="hidden" name="notas" value={c.notas} /> : null}
      {c.id && <input type="hidden" name="numeroOriginal" value={c.numero_documento ?? ""} />}

      <CampoTexto label="Nombre" name="nombres" defaultValue={v(c.nombres)} required autoComplete="off" placeholder="Juan Carlos" />
      <CampoTexto label="Apellido" name="apellidos" defaultValue={v(c.apellidos)} required autoComplete="off" placeholder="Quispe Mamani" />
      <CampoTexto
        label={c.tipo_documento && c.tipo_documento !== "DNI" ? "N.º de documento" : "DNI"}
        name="numeroDocumento"
        defaultValue={v(c.numero_documento)}
        required
        autoComplete="off"
        inputMode="numeric"
        maxLength={12}
        placeholder="8 dígitos"
      />
      <CampoSelect
        label="Sexo"
        name="sexo"
        defaultValue={c.sexo ?? ""}
        required
        opciones={[{ value: "", label: "— Elige —" }, ...SEXOS.map((s) => ({ value: s, label: legible(s) }))]}
      />
      <CampoTexto label="Celular" name="telefono" defaultValue={v(c.telefono)} inputMode="tel" required placeholder="987654321" maxLength={12} />
      <CampoTexto label="Correo" name="email" type="email" defaultValue={v(c.email)} required placeholder="cliente@gmail.com" />
      <CampoTexto label="Domicilio (opcional)" name="direccion" defaultValue={v(c.direccion)} placeholder="Av./Jr./Mz. Lt., distrito" />
      <CampoTexto label="Trabajo (opcional)" name="ocupacion" defaultValue={v(c.ocupacion)} placeholder="Mototaxista, bodega, comerciante…" />

      <div className="pt-2 md:col-span-2">
        <BotonEnviar>{c.id ? "Guardar cambios" : "Registrar cliente"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}
