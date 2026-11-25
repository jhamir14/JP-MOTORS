import Link from "next/link";
import { Encabezado, Panel } from "@/components/admin/ui";
import { requerirSesion } from "@/lib/server/auth";
import { FormProducto } from "../FormProducto";

export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await requerirSesion("SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS");
  return (
    <>
      <Link href="/admin/catalogo" className="text-sm font-medium text-muted hover:text-brand">← Catálogo</Link>
      <Encabezado titulo="Nuevo producto">Después de crearlo podrás subir fotos y definir sus planes de crédito.</Encabezado>
      <Panel>
        <FormProducto />
      </Panel>
    </>
  );
}
