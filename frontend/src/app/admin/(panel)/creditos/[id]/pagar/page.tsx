import { textoDocumento } from "@/lib/clientes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPago } from "@/components/admin/FormPago";
import { Encabezado, Panel, Vacio } from "@/components/admin/ui";
import { ETIQUETA_SERVICIO } from "@/lib/admin/constantes";
import { requerirSesion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { cuotasCobro } from "@/lib/server/pagos";
import { registrarPago } from "../../../pagos/actions";

export const metadata = { title: "Registrar pago" };

export default async function PagarPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = sql();
  const [cr] = await db<{ codigo: string; tipo: keyof typeof ETIQUETA_SERVICIO; estado: string; cliente: string; documento: string; telefono: string | null; penalidad: number }[]>`
    select cr.codigo, cr.tipo, cr.estado, cl.nombres || ' ' || cl.apellidos as cliente, cl.numero_documento as documento, cl.telefono,
           cr.penalidad_diaria::float8 as penalidad
    from public.credito cr join public.cliente cl on cl.id = cr.cliente_id where cr.id = ${id}`;
  if (!cr) notFound();

  // Mora al día de hoy antes de mostrar la deuda (el servidor la vuelve a calcular al registrar).
  await db`select public.actualizar_mora(null, ${id}::uuid)`;
  const [hoy, cuotas, cierre] = await Promise.all([
    hoyLima(db),
    cuotasCobro(db, id),
    db`select 1 from public.cierre_caja where usuario_id = ${sesion.usuarioId} and fecha = public.hoy_lima()`,
  ]);
  const activo = ["VIGENTE", "EN_MORA", "APROBADO", "REFINANCIADO"].includes(cr.estado);

  return (
    <>
      <Link href={`/admin/creditos/${id}`} className="text-sm font-medium text-muted hover:text-brand">← Crédito {cr.codigo}</Link>
      <Encabezado titulo="Registrar pago">
        {cr.cliente} · {textoDocumento(cr.documento)} · {ETIQUETA_SERVICIO[cr.tipo]} {cr.codigo}
        {cr.penalidad > 0 && <> · Penalidad por atraso: S/ {cr.penalidad.toFixed(2)} por día</>}
      </Encabezado>
      {activo && cierre.length > 0 && (
        <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          Ya cerraste tu caja de hoy: para registrar más pagos, un administrador debe reabrirla en <Link href="/admin/caja" className="underline">Caja</Link>.
        </p>
      )}
      {activo ? (
        <Panel>
          <FormPago action={registrarPago} creditoId={id} cuotas={cuotas} hoy={hoy} />
        </Panel>
      ) : (
        <Vacio>Este crédito está {cr.estado.toLowerCase().replace(/_/g, " ")}: no admite pagos.</Vacio>
      )}
    </>
  );
}
