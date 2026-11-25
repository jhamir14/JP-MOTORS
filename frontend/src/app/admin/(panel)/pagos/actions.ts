"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import {
  ACCIONES_BLOQUEO,
  METODOS_PAGO,
  ROLES_ANULAN_PAGOS,
  ROLES_BLOQUEO,
  deudaTotal,
  distribuirPago,
  errorMotivoAnulacionPago,
  validarPago,
} from "@/lib/pagos";
import { detectarTipo } from "@/lib/server/archivos";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";
import { hoyLima } from "@/lib/server/cobranza";
import { sql } from "@/lib/server/db";
import { cuotasCobro } from "@/lib/server/pagos";

const uuid = z.string().uuid();
const MAX_VOUCHER = 8 * 1024 * 1024;
const TIPOS_VOUCHER = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const mensajeP0001 = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  return err?.code === "P0001" && err.message ? err.message : null;
};

/** Estados de cuotas, créditos y perfil de clientes (la misma función del job diario). */
async function recalcularEstados() {
  try {
    await sql()`select * from public.recalcular_estados()`;
  } catch (e) {
    console.error("[pagos] No se pudo recalcular estados:", e);
  }
}

function refrescar() {
  revalidatePath("/admin", "layout");
}

const pagoSchema = z.object({
  creditoId: uuid,
  monto: z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Usa solo números con hasta 2 decimales (ej. 150.50)")
    .transform(Number),
  metodo: z.enum(METODOS_PAGO, { errorMap: () => ({ message: "Elige el método de pago" }) }),
  numeroOperacion: z.string().trim().max(60, "Máximo 60 caracteres").transform((v) => v || null),
  notas: z.string().trim().max(500, "Máximo 500 caracteres").transform((v) => v || null),
});

/** Registra un pago: lo reparte entre las cuotas (mora → interés → capital) y guarda el voucher. */
export async function registrarPago(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const datos = datosDe(fd);
  const p = pagoSchema.safeParse({ numeroOperacion: "", notas: "", ...datos });
  if (!p.success) {
    const errores: Record<string, string> = {};
    for (const i of p.error.issues) errores[String(i.path[0])] ??= i.message;
    return fallo("Revisa los campos marcados.", errores);
  }
  const d = p.data;

  // Voucher opcional (foto o PDF), validado por su contenido real.
  const archivo = fd.get("voucher");
  let voucher: { nombre: string; tipo: string; datos: Buffer; sha256: string } | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_VOUCHER) return fallo("Revisa los campos marcados.", { voucher: "Máximo 8 MB" });
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const tipo = detectarTipo(bytes);
    if (!tipo || !TIPOS_VOUCHER.includes(tipo)) return fallo("Revisa los campos marcados.", { voucher: "Solo fotos JPG, PNG, WEBP o PDF" });
    voucher = { nombre: (archivo.name || "voucher").slice(0, 120), tipo, datos: bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
  }

  let resultado: { error: EstadoAccion } | { pagoId: string };
  try {
    resultado = await comoUsuario(sesion, async (tx) => {
      // Un pago a la vez por crédito: evita que dos cobradores apliquen sobre el mismo saldo.
      await tx`select pg_advisory_xact_lock(hashtext(${"pago:" + d.creditoId}))`;
      const [cr] = await tx<{ estado: string }[]>`select estado from public.credito where id = ${d.creditoId}`;
      if (!cr) return { error: fallo("El crédito no existe.") };
      if (!["VIGENTE", "EN_MORA", "APROBADO", "REFINANCIADO"].includes(cr.estado))
        return { error: fallo(`Este crédito no admite pagos (estado: ${cr.estado.toLowerCase().replace(/_/g, " ")}).`) };

      const hoy = await hoyLima(tx);
      await tx`select public.actualizar_mora(${hoy}::date, ${d.creditoId}::uuid)`;
      const cuotas = await cuotasCobro(tx, d.creditoId);
      const errores = validarPago(d, deudaTotal(cuotas));
      if (Object.keys(errores).length) return { error: fallo("Revisa los campos marcados.", errores) };

      const reparto = distribuirPago(cuotas, d.monto);
      if (reparto.sobrante > 0 || reparto.aplicaciones.length === 0) return { error: fallo("No se pudo repartir el pago entre las cuotas.") };

      const [pago] = await tx<{ id: string }[]>`
        insert into public.pago (credito_id, monto, metodo, numero_operacion, fecha_pago, registrado_por, notas)
        values (${d.creditoId}, ${d.monto}, ${d.metodo}, ${d.numeroOperacion}, ${hoy}, ${sesion.usuarioId}, ${d.notas})
        returning id`;
      await tx`insert into public.aplicacion_pago ${tx(
        reparto.aplicaciones.map((a) => ({ pago_id: pago.id, cuota_id: a.cuotaId, mora: a.mora, interes: a.interes, capital: a.capital })),
      )}`;
      if (voucher) {
        await tx`
          insert into public.voucher_pago (pago_id, nombre, tipo_mime, tamano, sha256, datos, subido_por)
          values (${pago.id}, ${voucher.nombre}, ${voucher.tipo}, ${voucher.datos.length}, ${voucher.sha256}, ${voucher.datos}, ${sesion.usuarioId})`;
      }
      return { pagoId: pago.id };
    });
  } catch (e) {
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }
  if ("error" in resultado) return resultado.error;

  await recalcularEstados();
  refrescar();
  redirect(`/admin/pagos/${resultado.pagoId}?nuevo=1`);
}

const anularSchema = z.object({ pagoId: uuid, motivo: z.string().trim() });

/** Anula un pago (solo admins): sus aplicaciones dejan de contar y las cuotas vuelven a quedar pendientes. */
export async function anularPago(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_ANULAN_PAGOS);
  const p = anularSchema.safeParse(datosDe(fd));
  if (!p.success) return fallo("Datos no válidos.");
  const error = errorMotivoAnulacionPago(p.data.motivo);
  if (error) return fallo("Revisa los campos marcados.", { motivo: error });

  try {
    const r = await comoUsuario(sesion, async (tx) => {
      const [pago] = await tx<{ anulado: boolean; credito_id: string }[]>`select anulado, credito_id from public.pago where id = ${p.data.pagoId}`;
      if (!pago) return "El pago no existe.";
      if (pago.anulado) return "El pago ya estaba anulado.";
      await tx`select pg_advisory_xact_lock(hashtext(${"pago:" + pago.credito_id}))`;
      await tx`
        update public.pago set anulado = true, motivo_anulacion = ${p.data.motivo}, anulado_por = ${sesion.usuarioId}, anulado_at = now()
        where id = ${p.data.pagoId}`;
      return null;
    });
    if (r) return fallo(r);
  } catch (e) {
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }
  await recalcularEstados();
  refrescar();
  redirect(`/admin/pagos/${p.data.pagoId}?anulado=1`);
}

const cierreSchema = z.object({
  efectivoContado: z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Usa solo números con hasta 2 decimales")
    .transform(Number),
  observaciones: z.string().trim().max(500, "Máximo 500 caracteres").transform((v) => v || null),
});

/** Cierra la caja del día del usuario. Los totales los calcula la base (trigger de cierre_caja). */
export async function cerrarCaja(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion();
  const p = cierreSchema.safeParse({ observaciones: "", ...datosDe(fd) });
  if (!p.success) return fallo("Revisa los campos marcados.", { efectivoContado: p.error.issues[0]?.message ?? "Monto no válido" });
  try {
    await comoUsuario(sesion, async (tx) => {
      const hoy = await hoyLima(tx);
      await tx`
        insert into public.cierre_caja (fecha, usuario_id, efectivo_contado, observaciones)
        values (${hoy}, ${sesion.usuarioId}, ${p.data.efectivoContado}, ${p.data.observaciones})`;
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") return fallo("Ya cerraste tu caja de hoy.");
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }
  revalidatePath("/admin/caja");
  return exito("Caja cerrada. Entrega el efectivo y los comprobantes.");
}

/** Reabre una caja cerrada (solo admins) para que el usuario registre más pagos ese día. */
export async function reabrirCaja(fd: FormData): Promise<void> {
  const sesion = await requerirSesion(...ROLES_ANULAN_PAGOS);
  const id = uuid.safeParse(fd.get("cierreId"));
  if (!id.success) return;
  try {
    await comoUsuario(sesion, (tx) => tx`delete from public.cierre_caja where id = ${id.data}`);
  } catch (e) {
    console.error("[caja] No se pudo reabrir la caja:", e);
  }
  revalidatePath("/admin/caja");
}

const ACCIONES = [...ACCIONES_BLOQUEO.CREDITO_CELULAR, ...ACCIONES_BLOQUEO.CREDITO_VEHICULAR].map((a) => a.value) as [string, ...string[]];
const eventoSchema = z.object({
  creditoId: uuid,
  accion: z.enum(ACCIONES),
  motivo: z.string().trim().min(5, "Mínimo 5 caracteres").max(500, "Máximo 500 caracteres"),
});

/** Deja registrado un bloqueo/desbloqueo de celular o corte/restablecimiento de GPS hecho en la plataforma del proveedor. */
export async function registrarEventoBloqueo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_BLOQUEO);
  const p = eventoSchema.safeParse(datosDe(fd));
  if (!p.success) {
    const errores: Record<string, string> = {};
    for (const i of p.error.issues) errores[String(i.path[0])] ??= i.message;
    return fallo("Revisa los campos marcados.", errores);
  }
  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.evento_bloqueo (credito_id, accion, motivo, realizado_por)
      values (${p.data.creditoId}, ${p.data.accion}, ${p.data.motivo}, ${sesion.usuarioId})`);
  } catch (e) {
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }
  revalidatePath(`/admin/creditos/${p.data.creditoId}`);
  return exito("Acción registrada y estado de la unidad actualizado.");
}
