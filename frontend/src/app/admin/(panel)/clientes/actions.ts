"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import {
  ESTADOS_CIVILES,
  PARENTESCOS,
  ROLES_EDITAN_KYC,
  SEXOS,
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_KYC,
  TIPOS_VIVIENDA,
  DOCUMENTOS_GARANTE,
  coordenadasEnPeru,
  errorDocumento,
  normalizarCelular,
  normalizarDocumento,
} from "@/lib/clientes";
import { detectarTipo } from "@/lib/server/archivos";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";
import { actualizarCompletitud, clientesConDocumento, garantesConDocumento } from "@/lib/server/clientes";
import { sql } from "@/lib/server/db";

const uuid = z.string().uuid();
const vacioANull = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).transform((v) => v || null);
const enumOpcional = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.union([z.enum(valores), z.literal("").transform(() => null)]);

const celularOpcional = (campo: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || normalizarCelular(v) != null, `${campo}: 9 dígitos que empiecen con 9`)
    .transform((v) => (v ? normalizarCelular(v) : null));

const edad = (iso: string) => {
  const f = new Date(`${iso}T00:00:00`);
  const hoy = new Date();
  let a = hoy.getFullYear() - f.getFullYear();
  if (hoy.getMonth() < f.getMonth() || (hoy.getMonth() === f.getMonth() && hoy.getDate() < f.getDate())) a--;
  return a;
};

const coordenada = z
  .string()
  .trim()
  .refine((v) => v === "" || /^-?\d{1,3}(\.\d{1,8})?$/.test(v), "Coordenada no válida (ej. -12.0464)")
  .transform((v) => (v === "" ? null : Number(v)));

function refrescar(clienteId?: string) {
  revalidatePath("/admin", "layout");
  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
}

// -----------------------------------------------------------------------------
// Cliente: alta y edición
// -----------------------------------------------------------------------------
const clienteSchema = z
  .object({
    id: uuid.optional().or(z.literal("").transform(() => undefined)),
    solicitudId: uuid.optional().or(z.literal("").transform(() => undefined)),
    numeroOriginal: z.string().optional(),
    nombres: z.string().trim().min(2, "Ingresa los nombres").max(80),
    apellidos: z.string().trim().min(2, "Ingresa los apellidos").max(80),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z.string().transform(normalizarDocumento),
    fechaNacimiento: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida")
      .refine((v) => v === "" || edad(v) >= 18, "Debe ser mayor de edad")
      .refine((v) => v === "" || edad(v) <= 100, "Revisa la fecha")
      .transform((v) => v || null),
    sexo: enumOpcional(SEXOS),
    estadoCivil: enumOpcional(ESTADOS_CIVILES),
    telefono: z
      .string()
      .trim()
      .refine((v) => normalizarCelular(v) != null, "Celular de 9 dígitos que empiece con 9")
      .transform((v) => normalizarCelular(v)!),
    telefonoSecundario: celularOpcional("Teléfono 2"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo no válido")
      .transform((v) => v || null),
    direccion: vacioANull(200),
    urbanizacion: vacioANull(100),
    distrito: vacioANull(60),
    provincia: vacioANull(60),
    departamento: vacioANull(40),
    referencia: vacioANull(200),
    tipoVivienda: enumOpcional(TIPOS_VIVIENDA),
    latitud: coordenada,
    longitud: coordenada,
    ocupacion: vacioANull(100),
    direccionTrabajo: vacioANull(200),
    ingresoMensual: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 1_000_000), "Usa solo números (ej. 2500)")
      .transform((v) => (v === "" ? null : Number(v))),
    notas: vacioANull(2000),
  })
  .superRefine((d, ctx) => {
    // Un documento provisional de la migración (ej. SIN-DOC-12) se puede conservar mientras no se cambie.
    const sinCambio = d.id && d.numeroOriginal != null && d.numeroDocumento === normalizarDocumento(d.numeroOriginal);
    const error = errorDocumento(d.tipoDocumento, d.numeroDocumento);
    if (error && !sinCambio) ctx.addIssue({ code: "custom", path: ["numeroDocumento"], message: error });
    if ((d.latitud == null) !== (d.longitud == null))
      ctx.addIssue({ code: "custom", path: ["longitud"], message: "Ingresa latitud y longitud juntas" });
    else if (d.latitud != null && d.longitud != null && !coordenadasEnPeru(d.latitud, d.longitud))
      ctx.addIssue({ code: "custom", path: ["latitud"], message: "La ubicación no está en el Perú (¿coordenadas invertidas?)" });
  });

export async function guardarCliente(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const parsed = clienteSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los campos marcados.", erroresZod(parsed.error));
  const d = parsed.data;
  // Sin cambios en el documento: se conserva tal cual estaba guardado (ej. «SIN-DOC-7» de la migración).
  if (d.id && d.numeroOriginal != null && d.numeroDocumento === normalizarDocumento(d.numeroOriginal)) d.numeroDocumento = d.numeroOriginal;

  const [duplicado] = await clientesConDocumento(sql(), d.tipoDocumento, d.numeroDocumento, d.id);
  if (duplicado) {
    return fallo(
      `Ya existe un cliente con ese documento: ${duplicado.nombres} ${duplicado.apellidos} (${duplicado.tipo_documento} ${duplicado.numero_documento}).`,
      { numeroDocumento: "Documento ya registrado" },
      { href: `/admin/clientes/${duplicado.id}`, texto: "Abrir su ficha →" },
    );
  }

  const fila = {
    nombres: d.nombres,
    apellidos: d.apellidos,
    tipo_documento: d.tipoDocumento,
    numero_documento: d.numeroDocumento,
    fecha_nacimiento: d.fechaNacimiento,
    sexo: d.sexo,
    estado_civil: d.estadoCivil,
    telefono: d.telefono,
    telefono_secundario: d.telefonoSecundario,
    email: d.email,
    direccion: d.direccion,
    urbanizacion: d.urbanizacion,
    distrito: d.distrito,
    provincia: d.provincia,
    departamento: d.departamento,
    referencia: d.referencia,
    tipo_vivienda: d.tipoVivienda,
    ocupacion: d.ocupacion,
    direccion_trabajo: d.direccionTrabajo,
    ingreso_mensual: d.ingresoMensual,
    notas: d.notas,
  };

  let id = d.id;
  try {
    await comoUsuario(sesion, async (tx) => {
      if (id) {
        const [antes] = await tx<{ latitud: number | null; longitud: number | null }[]>`
          select latitud::float8, longitud::float8 from public.cliente where id = ${id} for update`;
        if (!antes) throw Object.assign(new Error("no encontrado"), { code: "P0002" });
        const geoCambio = antes.latitud !== d.latitud || antes.longitud !== d.longitud;
        await tx`
          update public.cliente set ${tx(fila)}, latitud = ${d.latitud}, longitud = ${d.longitud}
            ${geoCambio ? tx`, geo_precision_m = null, geo_registrada_at = ${d.latitud == null ? null : new Date()}` : tx``}
          where id = ${id}`;
      } else {
        const [nuevo] = await tx<{ id: string }[]>`
          insert into public.cliente ${tx({
            ...fila,
            latitud: d.latitud,
            longitud: d.longitud,
            geo_registrada_at: d.latitud == null ? null : new Date(),
            registrado_por: sesion.usuarioId,
          })} returning id`;
        id = nuevo.id;
        if (d.solicitudId) {
          await tx`
            update public.solicitud_credito
            set estado = 'CONVERTIDA', cliente_id = ${id}, asignado_a = coalesce(asignado_a, ${sesion.usuarioId})
            where id = ${d.solicitudId} and cliente_id is null`;
        }
      }
      await actualizarCompletitud(tx, id!);
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P0002") return fallo("El cliente ya no existe.");
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe un cliente con ese documento.", { numeroDocumento: "Documento ya registrado" });
    return fallo(mensajeErrorBD(e));
  }
  refrescar(id);
  if (!d.id) redirect(`/admin/clientes/${id}?creado=1`);
  redirect(`/admin/clientes/${id}?guardado=1`);
}

// -----------------------------------------------------------------------------
// Ubicación GPS del domicilio (desde el celular del asesor)
// -----------------------------------------------------------------------------
const ubicacionSchema = z.object({
  clienteId: uuid,
  latitud: z.coerce.number().min(-90).max(90),
  longitud: z.coerce.number().min(-180).max(180),
  precision: z.coerce.number().min(0).max(100_000).optional(),
});

export async function guardarUbicacion(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const parsed = ubicacionSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("No se recibió una ubicación válida.");
  const { clienteId, latitud, longitud, precision } = parsed.data;
  if (!coordenadasEnPeru(latitud, longitud)) return fallo("La ubicación obtenida no está en el Perú. Inténtalo de nuevo al aire libre.");
  try {
    await comoUsuario(sesion, async (tx) => {
      const r = await tx`
        update public.cliente
        set latitud = ${latitud.toFixed(6)}, longitud = ${longitud.toFixed(6)},
            geo_precision_m = ${precision == null ? null : Math.round(precision)}, geo_registrada_at = now()
        where id = ${clienteId}`;
      if (r.count === 0) throw Object.assign(new Error("no encontrado"), { code: "P0002" });
      await actualizarCompletitud(tx, clienteId);
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P0002") return fallo("El cliente ya no existe.");
    return fallo(mensajeErrorBD(e));
  }
  refrescar(clienteId);
  const aviso = precision != null && precision > 100 ? ` Precisión baja (±${Math.round(precision)} m): conviene repetirla en el domicilio.` : "";
  return exito(`Ubicación guardada.${aviso}`);
}

// -----------------------------------------------------------------------------
// Documentos KYC privados
// -----------------------------------------------------------------------------
const MAX_DOC = 8 * 1024 * 1024;
const TIPOS_DOC_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function subirDocumento(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const dueño = z
    .object({
      clienteId: uuid.optional().or(z.literal("").transform(() => undefined)),
      garanteId: uuid.optional().or(z.literal("").transform(() => undefined)),
      volverA: uuid.optional().or(z.literal("").transform(() => undefined)),
      tipo: z.enum(TIPOS_DOCUMENTO_KYC),
    })
    .refine((v) => Boolean(v.clienteId) !== Boolean(v.garanteId))
    .safeParse(datosDe(fd));
  if (!dueño.success) return fallo("Datos del documento no válidos.");
  const { clienteId, garanteId, tipo, volverA } = dueño.data;
  if (garanteId && !(DOCUMENTOS_GARANTE as readonly string[]).includes(tipo)) return fallo("A un garante solo se le piden DNI y otros documentos.");

  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return fallo("Elige un archivo o toma una foto.", { archivo: "Elige un archivo" });
  if (archivo.size > MAX_DOC) return fallo("El archivo pesa más de 8 MB.", { archivo: "Máximo 8 MB" });
  const datos = Buffer.from(await archivo.arrayBuffer());
  const tipoMime = detectarTipo(datos);
  if (!tipoMime || !TIPOS_DOC_PERMITIDOS.includes(tipoMime))
    return fallo("Solo se aceptan fotos JPG, PNG o WEBP y archivos PDF.", { archivo: "Formato no permitido" });
  const sha256 = createHash("sha256").update(datos).digest("hex");
  const reemplazar = tipo !== "OTRO" && fd.get("reemplazar") !== "no";

  try {
    await comoUsuario(sesion, async (tx) => {
      // DNI, recibo y fachada: uno vigente por tipo (el anterior se reemplaza). «Otro» se acumula.
      if (reemplazar) {
        await tx`
          delete from public.documento_kyc
          where tipo = ${tipo} and ${clienteId ? tx`cliente_id = ${clienteId}` : tx`garante_id = ${garanteId!}`}`;
      }
      await tx`
        insert into public.documento_kyc ${tx({
          cliente_id: clienteId ?? null,
          garante_id: garanteId ?? null,
          tipo,
          nombre: (archivo.name || "documento").slice(0, 120),
          tipo_mime: tipoMime,
          tamano: datos.length,
          sha256,
          datos,
          subido_por: sesion.usuarioId,
        })}`;
      if (clienteId) await actualizarCompletitud(tx, clienteId);
    });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar(clienteId ?? volverA);
  return exito("Documento guardado de forma privada.");
}

export async function eliminarDocumento(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const id = uuid.parse(fd.get("id"));
  const volverA = uuid.safeParse(fd.get("volverA"));
  await comoUsuario(sesion, async (tx) => {
    const [doc] = await tx<{ cliente_id: string | null }[]>`
      select cliente_id from public.documento_kyc where id = ${id}`;
    if (!doc) return;
    await tx`delete from public.documento_kyc where id = ${id}`;
    if (doc.cliente_id) await actualizarCompletitud(tx, doc.cliente_id);
  });
  refrescar(volverA.success ? volverA.data : undefined);
}

// -----------------------------------------------------------------------------
// Garantes
// -----------------------------------------------------------------------------
const garanteSchema = z
  .object({
    clienteId: uuid,
    garanteId: uuid.optional().or(z.literal("").transform(() => undefined)),
    nombres: z.string().trim().min(2, "Ingresa los nombres").max(80),
    apellidos: z.string().trim().min(2, "Ingresa los apellidos").max(80),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z.string().transform(normalizarDocumento),
    telefono: z
      .string()
      .trim()
      .refine((v) => normalizarCelular(v) != null, "Celular de 9 dígitos que empiece con 9")
      .transform((v) => normalizarCelular(v)!),
    direccion: vacioANull(200),
    parentesco: enumOpcional(PARENTESCOS),
    notas: vacioANull(500),
  })
  .superRefine((d, ctx) => {
    const error = errorDocumento(d.tipoDocumento, d.numeroDocumento);
    if (error) ctx.addIssue({ code: "custom", path: ["numeroDocumento"], message: error });
  });

/**
 * Registra un garante y lo vincula al cliente. Si ya existe un garante con ese documento,
 * se reutiliza (se actualizan su teléfono y dirección) en lugar de duplicarlo.
 */
export async function guardarGarante(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const parsed = garanteSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos del garante.", erroresZod(parsed.error));
  const d = parsed.data;

  const [cliente] = await clientesConDocumento(sql(), d.tipoDocumento, d.numeroDocumento);
  if (cliente?.id === d.clienteId) return fallo("El cliente no puede ser su propio garante.", { numeroDocumento: "Es el mismo cliente" });

  let reutilizado = false as false | "otro" | "mismo";
  try {
    await comoUsuario(sesion, async (tx) => {
      let garanteId = d.garanteId;
      const datos = { nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono, direccion: d.direccion };
      if (garanteId) {
        await tx`
          update public.garante set ${tx({ ...datos, tipo_documento: d.tipoDocumento, numero_documento: d.numeroDocumento })}
          where id = ${garanteId}`;
      } else {
        const [existente] = await garantesConDocumento(tx, d.tipoDocumento, d.numeroDocumento);
        if (existente) {
          garanteId = existente.id;
          const [vinculo] = await tx`select 1 from public.cliente_garante where cliente_id = ${d.clienteId} and garante_id = ${garanteId}`;
          reutilizado = vinculo ? "mismo" : "otro";
          await tx`update public.garante set telefono = ${d.telefono}, direccion = coalesce(${d.direccion}, direccion) where id = ${garanteId}`;
        } else {
          const [g] = await tx<{ id: string }[]>`
            insert into public.garante ${tx({ ...datos, tipo_documento: d.tipoDocumento, numero_documento: d.numeroDocumento, parentesco: d.parentesco })}
            returning id`;
          garanteId = g.id;
        }
      }
      await tx`
        insert into public.cliente_garante (cliente_id, garante_id, parentesco, notas)
        values (${d.clienteId}, ${garanteId!}, ${d.parentesco}, ${d.notas})
        on conflict (cliente_id, garante_id) do update set parentesco = excluded.parentesco, notas = excluded.notas`;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe otro garante con ese documento.", { numeroDocumento: "Documento ya registrado" });
    return fallo(mensajeErrorBD(e));
  }
  refrescar(d.clienteId);
  return exito(
    reutilizado === "otro"
      ? "Ese garante ya estaba registrado (respalda a otro cliente): se vinculó y se actualizaron su teléfono y dirección."
      : reutilizado === "mismo"
        ? "Ese garante ya estaba vinculado a este cliente: se actualizaron su teléfono y dirección."
        : d.garanteId ? "Garante actualizado." : "Garante registrado y vinculado.",
  );
}

export async function desvincularGarante(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_EDITAN_KYC);
  const clienteId = uuid.parse(fd.get("clienteId"));
  const garanteId = uuid.parse(fd.get("garanteId"));
  await comoUsuario(sesion, (tx) => tx`
    delete from public.cliente_garante where cliente_id = ${clienteId} and garante_id = ${garanteId}`);
  refrescar(clienteId);
}

// -----------------------------------------------------------------------------
// Bloqueo legal (solo administración)
// -----------------------------------------------------------------------------
const bloqueoSchema = z.object({
  clienteId: uuid,
  bloquear: z.enum(["si", "no"]),
  motivo: z.string().trim().max(500),
});

export async function cambiarBloqueo(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion("SUPERADMIN", "ADMIN_CREDITOS");
  const parsed = bloqueoSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Datos no válidos.");
  const { clienteId, bloquear, motivo } = parsed.data;
  if (bloquear === "si" && motivo.length < 5) return fallo("Indica el motivo del bloqueo.", { motivo: "Requerido" });
  const nota = `[${new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" })}] ${bloquear === "si" ? "Bloqueo legal" : "Desbloqueo"} por ${sesion.nombres} ${sesion.apellidos}${motivo ? `: ${motivo}` : ""}`;
  try {
    await comoUsuario(sesion, (tx) => tx`
      update public.cliente
      set estado = ${bloquear === "si" ? "BLOQUEADO_LEGAL" : "NUEVO"},
          notas = concat_ws(E'\n', nullif(notas, ''), ${nota}::text)
      where id = ${clienteId}`);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar(clienteId);
  return exito(
    bloquear === "si"
      ? "Cliente bloqueado: no podrá recibir nuevos créditos."
      : "Bloqueo levantado. El estado se recalcula con su historial en el proceso diario.",
  );
}
