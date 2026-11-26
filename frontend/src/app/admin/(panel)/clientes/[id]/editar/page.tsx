import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado, Panel } from "@/components/admin/ui";
import { ROLES_EDITAN_KYC } from "@/lib/clientes";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { FormCliente, type ClienteEditable } from "../../FormCliente";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  await requerirSesion(...ROLES_EDITAN_KYC);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [cliente] = await sql()<ClienteEditable[]>`
    select id, nombres, apellidos, tipo_documento, numero_documento, sexo, telefono, email::text, direccion, ocupacion
    from public.cliente where id = ${id}`;
  if (!cliente) notFound();

  return (
    <>
      <Link href={`/admin/clientes/${id}`} className="text-sm font-medium text-muted hover:text-brand">← Ficha del cliente</Link>
      <Encabezado titulo={`Editar: ${cliente.nombres} ${cliente.apellidos}`}>
        Los cambios quedan registrados en la auditoría con tu usuario.
      </Encabezado>
      <Panel>
        <FormCliente cliente={cliente} />
      </Panel>
    </>
  );
}
