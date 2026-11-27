"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ESTADOS_SOLICITUD } from "@/lib/admin/constantes";
import type postgres from "postgres";
import { areaDe, tiposDe } from "@/lib/areas";
import { ROLES_EDITAN_KYC } from "@/lib/clientes";
import { comoUsuario, requerirSesion, type Sesion } from "@/lib/server/auth";
import { obtenerCatalogo } from "@/lib/server/catalogo";
import { correoConfigurado, enviarCorreo } from "@/lib/server/correo";
import { correoCotizacionCliente } from "@/lib/server/correosCotizacion";
import { sql } from "@/lib/server/db";
import type { Frecuencia } from "@/lib/finance";
import { whatsappDeServicio } from "@/lib/whatsapp";

const schema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS_SOLICITUD),
  notas: z.string().max(2000),
});

export async function actualizarSolicitud(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const parsed = schema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos.", erroresZod(parsed.error));
  const { id, estado, notas } = parsed.data;
  try {
    const r = await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set estado = ${estado}, notas = ${notas || null}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${id} and (${estado} <> 'CONVERTIDA' or cliente_id is not null) and ${filtroArea(tx, sesion)}`);
    if (r.count === 0 && estado === "CONVERTIDA")
      return fallo("Para marcarla como convertida usa «Convertir en cliente»: así queda vinculada a su ficha.", { estado: "Usa «Convertir en cliente»" });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito("Solicitud actualizada.");
}

/** Condición SQL: la solicitud es del área de quien está en sesión (las de «otro» servicio, solo quien ve todas). */
const filtroArea = (db: postgres.Sql | postgres.TransactionSql, sesion: Sesion) =>
  db`(servicio::text = any(${tiposDe(sesion.rol)}) or (servicio = 'OTRO' and ${!areaDe(sesion.rol)}))`;

const vincularSchema = z.object({ solicitudId: z.string().uuid(), clienteId: z.string().uuid() });

/** La persona de la solicitud ya era cliente: se vincula la solicitud a su ficha en vez de duplicarla. */
export async function vincularSolicitud(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const parsed = vincularSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Datos no válidos.");
  const { solicitudId, clienteId } = parsed.data;
  try {
    const r = await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set estado = 'CONVERTIDA', cliente_id = ${clienteId}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${solicitudId} and cliente_id is null and ${filtroArea(tx, sesion)}`);
    if (r.count === 0) return fallo("La solicitud ya estaba vinculada a un cliente.");
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/clientes/${clienteId}?vinculada=1`);
}

const correoSchema = z.object({ id: z.string().uuid(), nota: z.string().max(1000).default("") });

/** Reenvía al cliente su cotización por correo (sale de contacto@; si responde, llega a la bandeja de la empresa). */
export async function enviarCotizacionPorCorreo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const parsed = correoSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Datos no válidos.");
  if (!correoConfigurado()) return fallo("El envío de correos no está configurado (falta SMTP_PASSWORD en Vercel).");
  const { id, nota } = parsed.data;

  const [s] = await sql()<{ servicio: string; nombres: string; celular: string; email: string | null; producto_interes: string | null; monto_solicitado: number | null; cuota_inicial: number | null; datos_extra: Record<string, unknown> }[]>`
    select servicio::text, nombres, celular, email::text, producto_interes, monto_solicitado::float8, cuota_inicial::float8, datos_extra
    from public.solicitud_credito where id = ${id} and ${filtroArea(sql(), sesion)}`;
  if (!s) return fallo("No encontramos la solicitud.");
  if (!s.email) return fallo("Esta solicitud no tiene correo. Escríbele por WhatsApp.");
  const x = s.datos_extra ?? {};
  if (x.tipo !== "cotizacion") return fallo("Solo las cotizaciones de la web se pueden reenviar por correo.");

  const slug = String(x.producto_slug ?? "");
  const producto = (await obtenerCatalogo()).find((p) => p.slug === slug);
  const frecuencia = String(x.frecuencia) as Frecuencia;
  const numeroCuotas = Number(x.numero_cuotas);
  const cuota = Number(x.cuota);
  try {
    await enviarCorreo(
      correoCotizacionCliente(
        {
          nombre: s.nombres,
          celular: s.celular,
          correo: s.email,
          producto: { nombre: producto?.nombre ?? s.producto_interes ?? "Producto", slug, imagen: producto?.imagenes[0]?.url },
          whatsappAsesor: whatsappDeServicio(s.servicio),
          resultado: {
            frecuencia,
            numeroCuotas,
            cuota,
            inicial: s.cuota_inicial ?? 0,
            precio: s.monto_solicitado ?? 0,
            financiado: Number(x.financiado ?? (s.monto_solicitado ?? 0) - (s.cuota_inicial ?? 0)),
            totalCuotas: Number(x.total_cuotas ?? cuota * numeroCuotas),
            tasaPorcentaje: Number(x.tasa_porcentaje ?? 0),
          },
        },
        nota || undefined,
      ),
    );
  } catch (e) {
    console.error("[solicitudes] No se pudo enviar la cotización:", e);
    return fallo("No se pudo enviar el correo. Revisa la contraseña SMTP o inténtalo más tarde.");
  }
  try {
    await comoUsuario(sesion, (tx) => tx`
      update public.solicitud_credito
      set datos_extra = datos_extra || ${tx.json({ copia_enviada: true, correo_enviado_at: new Date().toISOString() })}::jsonb,
          estado = case when estado = 'NUEVA' then 'CONTACTADA'::public.estado_solicitud else estado end,
          asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
      where id = ${id}`);
  } catch (e) {
    console.error("[solicitudes] Correo enviado, pero no se pudo actualizar la solicitud:", e);
  }
  revalidatePath("/admin", "layout");
  return exito(`Cotización enviada a ${s.email}.`);
}
