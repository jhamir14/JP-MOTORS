import Link from "next/link";
import { Encabezado, Panel } from "@/components/admin/ui";
import { categoriasDe } from "@/lib/areas";
import { CATEGORIAS } from "@/lib/catalogo";
import { requerirSeccion } from "@/lib/server/auth";
import { FormProducto } from "../FormProducto";

export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  const sesion = await requerirSeccion("catalogo");
  const categorias = CATEGORIAS.filter((c) => categoriasDe(sesion.rol).includes(c));
  return (
    <>
      <Link href="/admin/catalogo" className="text-sm font-medium text-muted hover:text-brand">← Catálogo</Link>
      <Encabezado titulo="Nuevo producto">Después de crearlo podrás subir fotos y definir sus planes de crédito.</Encabezado>
      <Panel>
        <FormProducto categorias={categorias} />
      </Panel>
    </>
  );
}
