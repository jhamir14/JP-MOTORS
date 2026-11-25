"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { SERVICIOS_CREDITO } from "@/lib/admin/constantes";
import { CATEGORIAS } from "@/lib/catalogo";
import { FRECUENCIAS, TIPOS_CALCULO } from "@/lib/finance";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const entero = (campo: string) => z.string().trim().regex(/^\d{1,3}$/, `${campo}: número entero`).transform(Number);

const tasaSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    servicio: z.enum(SERVICIOS_CREDITO),
    categoria: z.enum(CATEGORIAS).or(z.literal("").transform(() => null)),
    nombre: z.string().trim().min(3, "Ingresa un nombre").max(80),
    frecuencia: z.enum(FRECUENCIAS),
    tipoCalculo: z.enum(TIPOS_CALCULO),
    tasaPorcentaje: z.string().trim().regex(/^\d{1,3}(\.\d{1,3})?$/, "Hasta 3 decimales (ej. 2.5)").transform(Number),
    cuotasMin: entero("Mínimo"),
    cuotasMax: entero("Máximo"),
    penalidadDiaria: z.string().trim().regex(/^\d{1,4}(\.\d{1,2})?$/, "Monto en soles (ej. 5.00)").transform(Number),
  })
  .refine((d) => d.cuotasMin >= 1 && d.cuotasMax >= d.cuotasMin, { path: ["cuotasMax"], message: "Debe ser mayor o igual al mínimo" });

export async function guardarTasa(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN", "ADMIN_CREDITOS");
  const parsed = tasaSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos de la tasa.", erroresZod(parsed.error));
  const d = parsed.data;
  const fila = {
    servicio: d.servicio,
    categoria: d.categoria,
    nombre: d.nombre,
    frecuencia: d.frecuencia,
    tipo_calculo: d.tipoCalculo,
    tasa_porcentaje: d.tasaPorcentaje,
    cuotas_min: d.cuotasMin,
    cuotas_max: d.cuotasMax,
    penalidad_diaria: d.penalidadDiaria,
    // La web solo publica tasas de crédito vehicular y celular; los préstamos en efectivo se informan en la evaluación.
    publica: fd.get("publica") === "on" && d.servicio !== "PRESTAMO_EFECTIVO",
    activa: fd.get("activa") === "on",
  };
  try {
    await comoUsuario(sesion, (tx) =>
      d.id ? tx`update public.tasa_servicio set ${tx(fila)} where id = ${d.id}` : tx`insert into public.tasa_servicio ${tx(fila)}`,
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return fallo("Ya hay una tasa activa para ese servicio, categoría y frecuencia. Desactiva la anterior o edítala.");
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/", "layout");
  return exito("Tasa guardada. Los simuladores de la web ya usan el nuevo valor; los créditos firmados no cambian.");
}

const topeSchema = z.object({
  tope: z.string().trim().regex(/^$|^\d{1,4}(\.\d{1,2})?$/, "Porcentaje (ej. 120) o vacío para desactivar"),
});

export async function guardarTopeTea(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const parsed = topeSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Valor no válido.", erroresZod(parsed.error));
  const valor = parsed.data.tope === "" ? null : Number(parsed.data.tope);
  try {
    await comoUsuario(sesion, (tx) => tx`
      update public.configuracion set valor = ${tx.json(valor)}, updated_by = ${sesion.usuarioId}, updated_at = now()
      where clave = 'tope_tea_porcentaje'`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito(valor == null ? "Tope de TEA desactivado." : `Tope de TEA fijado en ${valor} %.`);
}
