import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
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
          hint={`Separadas por comas. Vehículos: uso (Trabajo, Urbana, Deportiva…). Celulares: gama (${GAMAS.join(", ")}). Repuestos: la primera es la categoría; «Agotado» lo marca sin stock.`}
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
