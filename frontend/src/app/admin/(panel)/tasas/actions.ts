"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { SERVICIOS_FINANCIAMIENTO } from "@/lib/admin/constantes";
import { parsearFeriados } from "@/lib/calendario";
import { CATEGORIAS } from "@/lib/catalogo";
import { FRECUENCIAS, TIPOS_CALCULO } from "@/lib/finance";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const entero = (campo: string) => z.string().trim().regex(/^\d{1,3}$/, `${campo}: número entero`).transform(Number);

const tasaSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    servicio: z.enum(SERVICIOS_FINANCIAMIENTO),
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
    publica: fd.get("publica") === "on",
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

/** Feriados: no se cobran. Ninguna cuota del cronograma vence en domingo ni en feriado (pasa al siguiente día hábil). */
export async function guardarFeriados(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const r = parsearFeriados(String(fd.get("feriados") ?? ""));
  if ("error" in r) return fallo(r.error, { feriados: r.error });
  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.configuracion (clave, valor, descripcion, updated_by)
      values ('feriados', ${tx.json(r.fechas)}, 'Feriados (AAAA-MM-DD): no se cobran. Ninguna cuota vence en domingo ni feriado; pasa al siguiente día hábil.', ${sesion.usuarioId})
      on conflict (clave) do update set valor = excluded.valor, updated_by = excluded.updated_by, updated_at = now()`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin/tasas");
  return exito(`Feriados guardados (${r.fechas.length} fechas). Se aplican a los cronogramas que se generen desde ahora.`);
}

const texto = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).transform((v) => v || null);
const empresaSchema = z.object({
  representanteLegal: texto(120),
  representanteDocumento: texto(60),
  domicilio: texto(250),
  ciudad: z.string().trim().min(2, "Ingresa la ciudad").max(60),
});

/** Datos del vendedor/acreedor que se imprimen en contratos, pagaré y recibos (clave privada empresa_documentos). */
export async function guardarDatosDocumentos(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const parsed = empresaSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos.", erroresZod(parsed.error));
  const d = parsed.data;
  const valor = { representante_legal: d.representanteLegal, representante_documento: d.representanteDocumento, domicilio: d.domicilio, ciudad: d.ciudad };
  const validados = fd.get("validados") === "on";
  try {
    await comoUsuario(sesion, async (tx) => {
      await tx`
        insert into public.configuracion (clave, valor, descripcion, publica, updated_by)
        values ('empresa_documentos', ${tx.json(valor)}, 'Datos del vendedor/acreedor que se imprimen en contratos, pagaré y recibos', false, ${sesion.usuarioId})
        on conflict (clave) do update set valor = excluded.valor, updated_by = excluded.updated_by, updated_at = now()`;
      await tx`
        insert into public.configuracion (clave, valor, descripcion, publica, updated_by)
        values ('documentos_validados', ${tx.json(validados)}, 'true cuando un abogado validó los textos de los contratos, la cláusula de bloqueo y el pagaré', false, ${sesion.usuarioId})
        on conflict (clave) do update set valor = excluded.valor, updated_by = excluded.updated_by, updated_at = now()`;
    });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin/tasas");
  return exito("Datos guardados. Se usan en los próximos documentos que se generen.");
}

const porcentaje = (campo: string, max: number) =>
  z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, `${campo}: porcentaje (ej. 10)`).transform(Number)
    .refine((n) => n <= max, `${campo}: máximo ${max} %`);
const nombreNivel = z.string().trim().min(3, "Ingresa un nombre").max(40);
const scoreMin = z.enum(["3", "4", "5"]).transform(Number);
const cuotasExtra = z.string().trim().regex(/^\d{1,2}$/, "Número entero").transform(Number).refine((n) => n <= 24, "Máximo 24");
const beneficiosSchema = z
  .object({
    nombre1: nombreNivel, scoreMin1: scoreMin, descuentoTasa1: porcentaje("Descuento", 50), reduccionInicial1: porcentaje("Reducción", 100), cuotasExtra1: cuotasExtra,
    nombre2: nombreNivel, scoreMin2: scoreMin, descuentoTasa2: porcentaje("Descuento", 50), reduccionInicial2: porcentaje("Reducción", 100), cuotasExtra2: cuotasExtra,
    alertaScoreMax: z.enum(["0", "1", "2", "3"]).transform(Number),
  })
  .refine((d) => d.scoreMin1 > d.scoreMin2, { path: ["scoreMin2"], message: "Debe ser menor que el del primer nivel" });

/** Beneficios del siguiente financiamiento según el score (configuracion.beneficios_score). */
export async function guardarBeneficios(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const parsed = beneficiosSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos de los beneficios.", erroresZod(parsed.error));
  const d = parsed.data;
  const nivel = (i: 1 | 2) => ({
    scoreMin: d[`scoreMin${i}`], nombre: d[`nombre${i}`], descuentoTasaPct: d[`descuentoTasa${i}`],
    reduccionInicialPct: d[`reduccionInicial${i}`], cuotasExtra: d[`cuotasExtra${i}`],
  });
  const valor = {
    activo: fd.get("activo") === "on",
    niveles: [nivel(1), nivel(2)],
    requiereCreditoCancelado: fd.get("requiereCreditoCancelado") === "on",
    alertaScoreMax: d.alertaScoreMax,
    bloquearConMora: fd.get("bloquearConMora") === "on",
  };
  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.configuracion (clave, valor, descripcion, publica, updated_by)
      values ('beneficios_score', ${tx.json(valor)}, 'Beneficios del siguiente financiamiento según el score del cliente, y alertas por score bajo o mora vigente', false, ${sesion.usuarioId})
      on conflict (clave) do update set valor = excluded.valor, updated_by = excluded.updated_by, updated_at = now()`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  return exito(valor.activo ? "Beneficios guardados. Se sugieren en los próximos créditos; los ya registrados no cambian." : "Beneficios desactivados.");
}
