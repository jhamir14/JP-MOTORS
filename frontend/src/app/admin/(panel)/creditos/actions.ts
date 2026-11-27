"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, erroresZod, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ROLES_CREDITOS, TIPOS_CREDITO_NUEVO, errorMotivoAnulacion, planCredito, validarCredito, type EntradaCredito, type ReglasCredito } from "@/lib/creditos";
import { ETIQUETA_AREA, areaDe, puedeVerTipo } from "@/lib/areas";
import { FRECUENCIAS, TIPOS_CALCULO } from "@/lib/finance";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";
import { configCreditos } from "@/lib/server/creditos";
import { sql } from "@/lib/server/db";
import { evaluarCliente } from "@/lib/scoring";
import { configBeneficios, perfilParaCredito } from "@/lib/server/scoring";

const uuid = z.string().uuid();
const uuidOpcional = z.union([uuid, z.literal("").transform(() => null)]);
const numero = (campo: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d+)?$/.test(v), `${campo}: usa solo números (ej. 1500.50)`)
    .transform(Number);
const numeroOpcional = (campo: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), `${campo}: usa solo números`)
    .transform((v) => (v === "" ? null : Number(v)));

const altaSchema = z.object({
  clienteId: z.string().uuid("Elige al cliente"),
  asesorId: uuidOpcional.default(""),
  tipo: z.enum(TIPOS_CREDITO_NUEVO),
  unidadId: z.string().uuid("Elige la unidad que se entrega"),
  garanteId: uuidOpcional,
  planId: uuidOpcional,
  tasaId: uuidOpcional,
  precio: numero("Precio"),
  cuotaInicial: numero("Inicial"),
  numeroCuotas: z.string().trim().regex(/^\d+$/, "Número de cuotas entero").transform(Number),
  frecuencia: z.enum(FRECUENCIAS),
  tipoCalculo: z.enum(TIPOS_CALCULO),
  modo: z.enum(["tasa", "cuota"]),
  tasaPorcentaje: numeroOpcional("Tasa"),
  montoCuota: numeroOpcional("Cuota"),
  penalidadDiaria: numero("Penalidad"),
  fechaDesembolso: z.string().trim(),
  primerVencimiento: z.string().trim(),
  notas: z.string().trim().max(1000, "Máximo 1000 caracteres").transform((v) => v || null),
  confirmo: z.literal("on", { errorMap: () => ({ message: "Confirma que revisaste el cronograma con el cliente" }) }),
  beneficio: z.enum(["", "1"]).default(""),
  confirmoRiesgo: z.string().optional(),
});

const mensajeP0001 = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  return err?.code === "P0001" && err.message ? err.message : null;
};

/** Recalcula estados de cuotas, créditos y clientes (la misma función del job diario). */
async function recalcularEstados() {
  try {
    await sql()`select * from public.recalcular_estados()`;
  } catch (e) {
    console.error("[creditos] No se pudo recalcular estados:", e);
  }
}

export async function crearCredito(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CREDITOS);
  const datos = datosDe(fd);
  const p = altaSchema.safeParse({ ...datos, confirmo: datos.confirmo ?? "" });
  if (!p.success) return fallo("Revisa los campos marcados.", erroresZod(p.error));
  const d = p.data;
  if (!puedeVerTipo(sesion.rol, d.tipo)) return fallo(`Tu área es ${ETIQUETA_AREA[areaDe(sesion.rol)!]}: no puedes registrar este tipo de crédito.`);
  const db = sql();

  const entrada: EntradaCredito = {
    tipo: d.tipo,
    precio: d.precio,
    cuotaInicial: d.cuotaInicial,
    numeroCuotas: d.numeroCuotas,
    frecuencia: d.frecuencia,
    tipoCalculo: d.tipoCalculo,
    tasaPorcentaje: d.modo === "tasa" ? d.tasaPorcentaje : null,
    montoCuota: d.modo === "cuota" ? d.montoCuota : null,
    penalidadDiaria: d.penalidadDiaria,
    fechaDesembolso: d.fechaDesembolso,
    primerVencimiento: d.primerVencimiento,
  };
  if (d.modo === "cuota" && d.montoCuota == null) return fallo("Revisa los campos marcados.", { montoCuota: "Ingresa la cuota pactada" });

  const [config, [cliente], [unidad], tasa, garante, perfil, beneficios] = await Promise.all([
    configCreditos(db),
    db<{ estado: string; datos_incompletos: boolean }[]>`select estado, datos_incompletos from public.cliente where id = ${d.clienteId}`,
    d.tipo === "CREDITO_VEHICULAR"
      ? db<{ estado: string; producto_id: string | null }[]>`select estado, producto_id from public.unidad_vehiculo where id = ${d.unidadId}`
      : db<{ estado: string; producto_id: string | null }[]>`select estado, producto_id from public.unidad_celular where id = ${d.unidadId}`,
    d.tasaId
      ? db<{ frecuencia: string; cuotas_min: number; cuotas_max: number; servicio: string }[]>`
          select frecuencia, cuotas_min, cuotas_max, servicio from public.tasa_servicio where id = ${d.tasaId} and activa`
      : Promise.resolve([]),
    d.garanteId
      ? db`select 1 from public.cliente_garante where cliente_id = ${d.clienteId} and garante_id = ${d.garanteId}`
      : Promise.resolve([]),
    perfilParaCredito(db, d.clienteId),
    configBeneficios(db),
  ]);

  if (!cliente) return fallo("El cliente no existe.");
  // Score: mora vigente (bloqueo), score bajo (confirmar) y beneficio (debe seguir calificando)
  const evaluacion = evaluarCliente(perfil, beneficios);
  if (evaluacion.bloqueo) return fallo(evaluacion.bloqueo, undefined, { href: `/admin/clientes/${d.clienteId}`, texto: "Ver sus créditos" });
  if (evaluacion.alertaRiesgo && d.confirmoRiesgo !== "on")
    return fallo("Revisa los campos marcados.", { confirmoRiesgo: "Confirma que apruebas el crédito pese al score bajo" });
  const nivel = d.beneficio === "1" ? evaluacion.nivel : null;
  if (d.beneficio === "1" && !nivel)
    return fallo(`El cliente ya no califica para el beneficio${evaluacion.motivoSinBeneficio ? ` (${evaluacion.motivoSinBeneficio.toLowerCase()})` : ""}. Quítalo y revisa las condiciones.`);
  if (cliente.estado === "BLOQUEADO_LEGAL") return fallo("El cliente tiene bloqueo legal: no puede recibir créditos.");
  if (config.exigeExpedienteCompleto && cliente.datos_incompletos)
    return fallo("El expediente del cliente está incompleto. Complétalo antes de registrar el crédito.", undefined, {
      href: `/admin/clientes/${d.clienteId}`,
      texto: "Ver pendientes",
    });
  if (!unidad || !["EN_STOCK", "RESERVADO"].includes(unidad.estado))
    return fallo("Revisa los campos marcados.", { unidadId: "La unidad ya no está disponible. Elige otra." });
  if (d.garanteId && garante.length === 0) return fallo("Revisa los campos marcados.", { garanteId: "El garante no está vinculado a este cliente" });
  if (d.tipo === "CREDITO_VEHICULAR" && config.vehicularExigeGarante && !d.garanteId)
    return fallo("Revisa los campos marcados.", { garanteId: "El crédito vehicular requiere un garante. Agrégalo en la ficha del cliente." });

  // El rango de cuotas de la tasa aplica cuando se usa esa tasa (sin plan del producto) y la frecuencia coincide.
  const t = tasa[0];
  const reglas: ReglasCredito = {
    topeTea: config.topeTea,
    ...(t && !d.planId && t.servicio === d.tipo && t.frecuencia === d.frecuencia
      ? { cuotasMin: t.cuotas_min, cuotasMax: t.cuotas_max + (nivel?.cuotasExtra ?? 0) }
      : {}),
  };
  const beneficioScore = nivel
    ? { nivel: nivel.nombre, scoreMin: nivel.scoreMin, score: perfil.puntaje, descuentoTasaPct: nivel.descuentoTasaPct,
        reduccionInicialPct: nivel.reduccionInicialPct, cuotasExtra: nivel.cuotasExtra }
    : null;
  const errores = validarCredito(entrada, reglas);
  if (Object.keys(errores).length) return fallo("Revisa los campos marcados.", errores);

  const plan = planCredito(entrada, new Set(config.feriados), reglas);
  const tea = Number.isFinite(plan.teaPorcentaje) && plan.teaPorcentaje < 9_999_999 ? plan.teaPorcentaje : null;

  let creditoId: string;
  try {
    creditoId = await comoUsuario(sesion, async (tx) => {
      const [cr] = await tx<{ id: string }[]>`
        insert into public.credito (
          tipo, cliente_id, garante_id, unidad_vehiculo_id, unidad_celular_id, plan_credito_id, creado_por, asesor_id,
          monto_total, cuota_inicial, tasa_porcentaje, tipo_calculo, total_intereses, monto_total_pagar,
          frecuencia, numero_cuotas, valor_cuota, penalidad_diaria, tea_porcentaje,
          fecha_desembolso, fecha_primer_vencimiento, estado, notas, beneficio_score)
        values (
          ${d.tipo}, ${d.clienteId}, ${d.garanteId}, ${d.tipo === "CREDITO_VEHICULAR" ? d.unidadId : null},
          ${d.tipo === "CREDITO_CELULAR" ? d.unidadId : null}, ${d.planId}, ${sesion.usuarioId}, ${d.asesorId ?? sesion.usuarioId},
          ${entrada.precio}, ${entrada.cuotaInicial}, ${plan.tasaPorcentaje}, ${d.tipoCalculo}, ${plan.totalIntereses}, ${plan.totalPagar},
          ${d.frecuencia}, ${d.numeroCuotas}, ${plan.valorCuota}, ${entrada.penalidadDiaria}, ${tea},
          ${entrada.fechaDesembolso}, ${plan.cuotas[0].fecha}, 'VIGENTE', ${d.notas}, ${beneficioScore ? tx.json(beneficioScore) : null})
        returning id`;
      const filas = plan.cuotas.map((c) => ({
        credito_id: cr.id,
        numero: c.numero,
        fecha_vencimiento: c.fecha,
        monto_cuota: c.cuota,
        capital: c.capital,
        interes: c.interes,
        saldo_capital: c.saldo,
      }));
      // Inserción por lotes (los créditos diarios pueden tener cientos de cuotas)
      for (let i = 0; i < filas.length; i += 200) await tx`insert into public.cuota ${tx(filas.slice(i, i + 200))}`;
      // La unidad queda VENDIDO_CREDITO por el trigger credito_estado_unidad; se verifica igualmente.
      const tabla = d.tipo === "CREDITO_VEHICULAR" ? tx`public.unidad_vehiculo` : tx`public.unidad_celular`;
      const [u] = await tx<{ estado: string }[]>`select estado from ${tabla} where id = ${d.unidadId}`;
      if (u?.estado !== "VENDIDO_CREDITO") throw Object.assign(new Error("No se pudo reservar la unidad"), { code: "P0001" });
      return cr.id;
    });
  } catch (e) {
    const m = mensajeP0001(e);
    if (m) return fallo(m);
    if ((e as { code?: string })?.code === "23505") return fallo("Revisa los campos marcados.", { unidadId: "La unidad ya tiene un crédito activo." });
    return fallo(mensajeErrorBD(e));
  }

  await recalcularEstados();
  revalidatePath("/admin", "layout");
  redirect(`/admin/creditos/${creditoId}?creado=1`);
}

// -----------------------------------------------------------------------------
// Préstamo de dinero: monto, cuotas e interés (sin unidad ni inicial)
// -----------------------------------------------------------------------------
const prestamoSchema = z.object({
  clienteId: z.string().uuid("Elige al cliente"),
  asesorId: uuidOpcional.default(""),
  garanteId: uuidOpcional,
  tasaId: uuidOpcional,
  monto: numero("Monto"),
  numeroCuotas: z.string().trim().regex(/^\d+$/, "Número de cuotas entero").transform(Number),
  frecuencia: z.enum(FRECUENCIAS),
  tipoCalculo: z.enum(TIPOS_CALCULO),
  tasaPorcentaje: numero("Interés"),
  penalidadDiaria: numero("Penalidad"),
  fechaDesembolso: z.string().trim(),
  primerVencimiento: z.string().trim(),
  notas: z.string().trim().max(1000, "Máximo 1000 caracteres").transform((v) => v || null),
  confirmo: z.literal("on", { errorMap: () => ({ message: "Confirma que revisaste el cronograma con el cliente" }) }),
  confirmoRiesgo: z.string().optional(),
});

export async function crearPrestamo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CREDITOS);
  const datos = datosDe(fd);
  const p = prestamoSchema.safeParse({ ...datos, confirmo: datos.confirmo ?? "" });
  if (!p.success) return fallo("Revisa los campos marcados.", erroresZod(p.error));
  const d = p.data;
  if (!puedeVerTipo(sesion.rol, "PRESTAMO_EFECTIVO")) return fallo(`Tu área es ${ETIQUETA_AREA[areaDe(sesion.rol)!]}: los préstamos de dinero los registra el administrador de créditos.`);
  const db = sql();

  const entrada: EntradaCredito = {
    tipo: "PRESTAMO_EFECTIVO",
    precio: d.monto,
    cuotaInicial: 0,
    numeroCuotas: d.numeroCuotas,
    frecuencia: d.frecuencia,
    tipoCalculo: d.tipoCalculo,
    tasaPorcentaje: d.tasaPorcentaje,
    montoCuota: null,
    penalidadDiaria: d.penalidadDiaria,
    fechaDesembolso: d.fechaDesembolso,
    primerVencimiento: d.primerVencimiento,
  };

  const [config, [cliente], garante, perfil, beneficios] = await Promise.all([
    configCreditos(db),
    db<{ estado: string }[]>`select estado from public.cliente where id = ${d.clienteId}`,
    d.garanteId
      ? db`select 1 from public.cliente_garante where cliente_id = ${d.clienteId} and garante_id = ${d.garanteId}`
      : Promise.resolve([]),
    perfilParaCredito(db, d.clienteId),
    configBeneficios(db),
  ]);
  if (!cliente) return fallo("El cliente no existe.");
  if (cliente.estado === "BLOQUEADO_LEGAL") return fallo("El cliente tiene bloqueo legal: no puede recibir préstamos.");
  const evaluacion = evaluarCliente(perfil, beneficios);
  if (evaluacion.bloqueo) return fallo(evaluacion.bloqueo, undefined, { href: `/admin/clientes/${d.clienteId}`, texto: "Ver sus créditos" });
  if (evaluacion.alertaRiesgo && d.confirmoRiesgo !== "on")
    return fallo("Revisa los campos marcados.", { confirmoRiesgo: "Confirma que apruebas el préstamo pese al score bajo" });
  if (d.garanteId && garante.length === 0) return fallo("Revisa los campos marcados.", { garanteId: "El garante no está vinculado a este cliente" });

  const reglas: ReglasCredito = { topeTea: config.topeTea };
  const errores = validarCredito(entrada, reglas);
  if (Object.keys(errores).length) return fallo("Revisa los campos marcados.", { ...errores, ...(errores.precio ? { monto: errores.precio } : {}) });
  const plan = planCredito(entrada, new Set(config.feriados), reglas);
  const tea = Number.isFinite(plan.teaPorcentaje) && plan.teaPorcentaje < 9_999_999 ? plan.teaPorcentaje : null;

  let creditoId: string;
  try {
    creditoId = await comoUsuario(sesion, async (tx) => {
      const [cr] = await tx<{ id: string }[]>`
        insert into public.credito (
          tipo, cliente_id, garante_id, creado_por, asesor_id,
          monto_total, cuota_inicial, tasa_porcentaje, tipo_calculo, total_intereses, monto_total_pagar,
          frecuencia, numero_cuotas, valor_cuota, penalidad_diaria, tea_porcentaje,
          fecha_desembolso, fecha_primer_vencimiento, estado, notas)
        values (
          'PRESTAMO_EFECTIVO', ${d.clienteId}, ${d.garanteId}, ${sesion.usuarioId}, ${d.asesorId ?? sesion.usuarioId},
          ${entrada.precio}, 0, ${plan.tasaPorcentaje}, ${d.tipoCalculo}, ${plan.totalIntereses}, ${plan.totalPagar},
          ${d.frecuencia}, ${d.numeroCuotas}, ${plan.valorCuota}, ${entrada.penalidadDiaria}, ${tea},
          ${entrada.fechaDesembolso}, ${plan.cuotas[0].fecha}, 'VIGENTE', ${d.notas})
        returning id`;
      const filas = plan.cuotas.map((c) => ({
        credito_id: cr.id,
        numero: c.numero,
        fecha_vencimiento: c.fecha,
        monto_cuota: c.cuota,
        capital: c.capital,
        interes: c.interes,
        saldo_capital: c.saldo,
      }));
      for (let i = 0; i < filas.length; i += 200) await tx`insert into public.cuota ${tx(filas.slice(i, i + 200))}`;
      return cr.id;
    });
  } catch (e) {
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }

  await recalcularEstados();
  revalidatePath("/admin", "layout");
  redirect(`/admin/creditos/${creditoId}?creado=1`);
}

const anularSchema = z.object({ creditoId: uuid, motivo: z.string().trim() });

export async function anularCredito(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CREDITOS);
  const p = anularSchema.safeParse(datosDe(fd));
  if (!p.success) return fallo("Datos no válidos.");
  const error = errorMotivoAnulacion(p.data.motivo);
  if (error) return fallo("Revisa los campos marcados.", { motivo: error });

  try {
    const r = await comoUsuario(sesion, async (tx) => {
      const [cr] = await tx<{ estado: string; tipo: string; pagado: number }[]>`
        select cr.estado, cr.tipo::text, coalesce((select sum(cu.monto_pagado) from public.cuota cu where cu.credito_id = cr.id), 0)::float8 as pagado
        from public.credito cr where cr.id = ${p.data.creditoId} for update`;
      if (!cr || !puedeVerTipo(sesion.rol, cr.tipo)) return "El crédito no existe.";
      if (cr.estado === "ANULADO") return "El crédito ya estaba anulado.";
      if (cr.estado === "FINALIZADO_LIQUIDADO") return "Un crédito cancelado no se puede anular.";
      if (cr.pagado > 0) return "El crédito tiene pagos aplicados a sus cuotas: no se puede anular.";
      await tx`
        update public.credito set estado = 'ANULADO', motivo_anulacion = ${p.data.motivo}, anulado_por = ${sesion.usuarioId}, anulado_at = now()
        where id = ${p.data.creditoId}`;
      return null;
    });
    if (r) return fallo(r);
  } catch (e) {
    return fallo(mensajeP0001(e) ?? mensajeErrorBD(e));
  }

  await recalcularEstados();
  revalidatePath("/admin", "layout");
  redirect(`/admin/creditos/${p.data.creditoId}?anulado=1`);
}

// -----------------------------------------------------------------------------
// Eliminar (definitivo, solo Superadmin): borra el crédito con su cronograma, pagos y documentos.
// -----------------------------------------------------------------------------
export async function eliminarCredito(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fallo("Crédito no válido.");
  if (String(fd.get("confirmacion") ?? "").trim().toUpperCase() !== "ELIMINAR")
    return fallo("Escribe ELIMINAR para confirmar.", { confirmacion: "Escribe ELIMINAR" });
  const [cr] = await sql()<{ cliente_id: string; tipo: string }[]>`select cliente_id, tipo::text from public.credito where id = ${id.data}`;
  if (!cr) return fallo("El crédito ya no existe.");
  try {
    await comoUsuario(sesion, (tx) => tx`select public.eliminar_credito(${id.data})`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/creditos?${cr.tipo === "PRESTAMO_EFECTIVO" ? "tipo=prestamo&" : ""}eliminado=1`);
}
