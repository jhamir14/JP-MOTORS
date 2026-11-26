import { AdminForm, BotonEnviar, ErrorCampo } from "@/components/admin/AdminForm";
import { CampoArea, CampoSelect, CampoTexto, Check } from "@/components/admin/ui";
import { CATEGORIAS, ETIQUETA_CATEGORIA, GAMAS, type CategoriaProducto } from "@/lib/catalogo";
import { guardarProducto } from "./actions";

export interface ProductoEditable {
  id: string;
  categoria: CategoriaProducto;
  marca: string;
  modelo: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: number;
  specs: Record<string, string>;
  etiquetas: string[];
  destacado: boolean;
  publicado: boolean;
  orden: number;
}

export function FormProducto({ producto }: { producto?: ProductoEditable }) {
  const specs = producto ? Object.entries(producto.specs).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  return (
    <AdminForm action={guardarProducto} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={producto?.id ?? ""} />
      <CampoSelect
        label="Categoría"
        name="categoria"
        defaultValue={producto?.categoria ?? "MOTO_LINEAL"}
        opciones={CATEGORIAS.map((c) => ({ value: c, label: ETIQUETA_CATEGORIA[c] }))}
      />
      <CampoTexto label="Marca" name="marca" defaultValue={producto?.marca} placeholder="Honda, Bajaj, Samsung…" required />
      <CampoTexto label="Modelo" name="modelo" defaultValue={producto?.modelo} placeholder="CB190R" required />
      <CampoTexto label="Nombre comercial" name="nombre" defaultValue={producto?.nombre} placeholder="Honda CB190R" required />
      <CampoTexto
        label="Precio al contado (S/)"
        name="precio"
        defaultValue={producto?.precio.toFixed(2)}
        inputMode="decimal"
        placeholder="11966.00"
        required
      />
      <CampoTexto
        label="Enlace (slug)"
        name="slug"
        defaultValue={producto?.slug}
        placeholder="se genera del nombre"
        hint={producto ? "Cambiarlo rompe los enlaces ya compartidos." : "Vacío = se genera a partir del nombre."}
      />
      <div className="rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-4 md:col-span-2">
        <label htmlFor="imagenes-producto" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
          {producto ? "Agregar foto de la moto (opcional)" : "Foto de la moto (opcional)"}
        </label>
        <input
          id="imagenes-producto"
          name="imagenes"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
        />
        <ErrorCampo name="imagenes" />
        <p className="mt-1.5 text-xs text-muted">
          JPG, PNG, WEBP o AVIF de hasta 5 MB. Mejor con fondo transparente o liso: la web la muestra sobre la placa azul con el aro dorado.
          {producto ? " Si el producto no tiene portada, la primera foto se usa como portada." : " La primera foto será la portada."}
        </p>
      </div>
      <CampoArea label="Descripción" name="descripcion" defaultValue={producto?.descripcion ?? ""} className="md:col-span-2" rows={3} />
      <CampoArea
        label="Especificaciones"
        name="specs"
        defaultValue={specs}
        rows={6}
        placeholder={"Cilindrada: 184.4 cc\nTransmisión: 5 velocidades\nFrenos: Disco / Disco"}
        hint="Una por línea con el formato «Clave: valor». «Cilindrada» se usa para ordenar el catálogo."
      />
      <div className="grid content-start gap-4">
        <CampoTexto
          label="Etiquetas"
          name="etiquetas"
          defaultValue={producto?.etiquetas.join(", ")}
          placeholder="Trabajo, Urbana"
          hint={`Separadas por comas. Vehículos: uso (Trabajo, Urbana, Deportiva…). Celulares: gama (${GAMAS.join(", ")}).`}
        />
        <CampoTexto label="Orden" name="orden" defaultValue={String(producto?.orden ?? 0)} inputMode="numeric" hint="Menor número = aparece primero." />
        <Check label="Destacado" name="destacado" defaultChecked={producto?.destacado} hint="Aparece en la portada." />
        <Check label="Publicado en la web" name="publicado" defaultChecked={producto?.publicado ?? false} />
      </div>
      <div className="md:col-span-2">
        <BotonEnviar>{producto ? "Guardar cambios" : "Crear producto"}</BotonEnviar>
      </div>
    </AdminForm>
  );
}
