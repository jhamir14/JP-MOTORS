"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { datosDe, erroresZod, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { CATEGORIAS } from "@/lib/catalogo";
import { PREFIJO_PLAN_JP, cotizarCelularJP, gamaCelular, planJP, plazosCelular } from "@/lib/celularesJP";
import { FRECUENCIAS, TIPOS_CALCULO, calcularCredito } from "@/lib/finance";
import { categoriasDe } from "@/lib/areas";
import { productoEnArea } from "@/lib/server/areas";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { TIPOS_IMAGEN, detectarTipo } from "@/lib/server/archivos";

/** Catálogo: superadmin y los administradores de motos y de celulares (cada uno, solo sus categorías). */
const ROLES_CATALOGO = ["SUPERADMIN", "ADMIN_MOTOS", "ADMIN_CELULARES", "ASESOR_VENTAS"] as const;
const FUERA_DE_AREA = "Este producto no es de tu área.";

/** Producto al que pertenece una imagen o un plan (para comprobar el área antes de tocarlo). */
async function productoDe(tabla: "imagen_producto" | "plan_credito", id: string): Promise<string | null> {
  const db = sql();
  const [f] = await (tabla === "imagen_producto"
    ? db<{ producto_id: string }[]>`select producto_id from public.imagen_producto where id = ${id}`
    : db<{ producto_id: string }[]>`select producto_id from public.plan_credito where id = ${id}`);
  return f?.producto_id ?? null;
}

/** Tras cualquier cambio del catálogo se regeneran las páginas públicas y el panel. */
function refrescar(productoId?: string) {
  revalidatePath("/", "layout");
  if (productoId) revalidatePath(`/admin/catalogo/${productoId}`);
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const importe = (campo: string) =>
  z.string().trim().min(1, `Ingresa ${campo}`).regex(/^\d+(\.\d{1,2})?$/, "Usa solo números (ej. 1500.50)").transform(Number)
    .refine((n) => n <= 10_000_000, "Monto fuera de rango");

// -----------------------------------------------------------------------------
// Producto
// -----------------------------------------------------------------------------
const productoSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  categoria: z.enum(CATEGORIAS),
  marca: z.string().trim().min(1, "Ingresa la marca").max(60),
  modelo: z.string().trim().min(1, "Ingresa el modelo").max(80),
  nombre: z.string().trim().min(2, "Ingresa el nombre comercial").max(120),
  slug: z.string().trim().toLowerCase().max(80).refine((s) => s === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s), "Solo minúsculas, números y guiones"),
  descripcion: z.string().trim().max(1000),
  precio: importe("el precio al contado"),
  specs: z.string().max(4000),
  etiquetas: z.string().max(300),
  orden: z.string().trim().regex(/^-?\d{0,6}$/, "Número entero").transform((v) => Number(v || 0)),
});

/** "Clave: valor" por línea → objeto. */
function parsearSpecs(texto: string): Record<string, string> | string {
  const out: Record<string, string> = {};
  for (const [i, linea] of texto.split(/\r?\n/).entries()) {
    if (!linea.trim()) continue;
    const pos = linea.indexOf(":");
    if (pos < 1) return `Línea ${i + 1}: usa el formato «Clave: valor»`;
    const clave = linea.slice(0, pos).trim().slice(0, 40);
    const valor = linea.slice(pos + 1).trim().slice(0, 120);
    if (clave && valor) out[clave] = valor;
  }
  return out;
}

export async function guardarProducto(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const parsed = productoSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los campos marcados.", erroresZod(parsed.error));
  const d = parsed.data;
  if (!categoriasDe(sesion.rol).includes(d.categoria) || (d.id && !(await productoEnArea(sesion, d.id))))
    return fallo(FUERA_DE_AREA, { categoria: "Elige una categoría de tu área" });
  const specs = parsearSpecs(d.specs);
  if (typeof specs === "string") return fallo("Revisa las especificaciones.", { specs });
  const etiquetas = Array.from(new Set(d.etiquetas.split(",").map((e) => e.trim()).filter(Boolean))).slice(0, 10);
  const slug = d.slug || slugify(d.nombre);
  if (!slug) return fallo("No se pudo generar el enlace; escríbelo a mano.", { slug: "Requerido" });
  const leidas = await leerImagenes(fd);
  if ("error" in leidas) return leidas.error;

  const fila = {
    categoria: d.categoria,
    marca: d.marca,
    modelo: d.modelo,
    nombre: d.nombre,
    slug,
    descripcion: d.descripcion || null,
    precio_contado: d.precio,
    etiquetas,
    destacado: fd.get("destacado") === "on",
    publicado: fd.get("publicado") === "on",
    orden: d.orden,
  };

  let id = d.id;
  try {
    await comoUsuario(sesion, async (tx) => {
      if (id) {
        const r = await tx`update public.producto_catalogo set ${tx(fila)}, specs = ${tx.json(specs)} where id = ${id}`;
        if (r.count === 0) throw Object.assign(new Error("no encontrado"), { code: "P0002" });
        // Celulares: los planes JP siguen al precio (misma inicial y plazo, cuota recalculada).
        if (d.categoria === "CELULAR") await recalcularPlanesJP(tx, id, d.precio);
      } else {
        const [nuevo] = await tx<{ id: string }[]>`insert into public.producto_catalogo ${tx({ ...fila, specs: tx.json(specs) })} returning id`;
        id = nuevo.id;
        // Celular nuevo: nace con su plan semanal según la metodología JP.
        if (d.categoria === "CELULAR") {
          const g = gamaCelular(d.precio);
          const inicial = Math.min(g.inicial, Math.floor(d.precio / 2));
          const c = cotizarCelularJP(d.precio, inicial, plazosCelular(d.precio, inicial).sugerido);
          if (c.cuota > 0) await tx`insert into public.plan_credito ${tx({ ...planJP(c), producto_id: id, publicado: true, orden: 0 })}`;
        }
      }
      if (leidas.listos.length) await guardarImagenes(tx, sesion.usuarioId, id!, leidas.listos, d.nombre);
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fallo("Ya existe un producto con ese enlace (slug).", { slug: "Elige otro enlace" });
    return fallo(mensajeErrorBD(e));
  }
  refrescar(id);
  if (!d.id) redirect(`/admin/catalogo/${id}?creado=1`);
  if (leidas.listos.length) return exito(`Producto guardado con ${leidas.listos.length === 1 ? "1 foto nueva" : `${leidas.listos.length} fotos nuevas`}.`);
  return exito(fila.publicado ? "Producto guardado y publicado en la web." : "Producto guardado (no publicado).");
}

export async function cambiarPublicacion(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const id = z.string().uuid().parse(fd.get("id"));
  const publicado = fd.get("publicado") === "true";
  if (!(await productoEnArea(sesion, id))) return;
  await comoUsuario(sesion, (tx) => tx`update public.producto_catalogo set publicado = ${publicado} where id = ${id}`);
  refrescar(id);
}

// -----------------------------------------------------------------------------
// Imágenes (se guardan en la tabla `archivo` y se sirven en /api/archivos/<id>)
// -----------------------------------------------------------------------------
const MAX_BYTES = 5 * 1024 * 1024;

type ImagenLista = { nombre: string; tipo: string; datos: Buffer };

/** Valida los archivos del campo `imagenes` (tipo real por sus bytes y tamaño). Devuelve el error o la lista. */
async function leerImagenes(fd: FormData): Promise<{ error: EstadoAccion } | { listos: ImagenLista[] }> {
  const archivos = fd.getAll("imagenes").filter((f): f is File => f instanceof File && f.size > 0);
  if (archivos.length > 8) return { error: fallo("Sube como máximo 8 imágenes a la vez.", { imagenes: "Máximo 8" }) };
  const listos: ImagenLista[] = [];
  for (const f of archivos) {
    if (f.size > MAX_BYTES) return { error: fallo(`«${f.name}» pesa más de 5 MB. Redúcela antes de subirla.`, { imagenes: "Máximo 5 MB por imagen" }) };
    const datos = Buffer.from(await f.arrayBuffer());
    const tipo = detectarTipo(datos);
    if (!tipo || !(TIPOS_IMAGEN as readonly string[]).includes(tipo))
      return { error: fallo(`«${f.name}» no es una imagen JPG, PNG, WEBP o AVIF.`, { imagenes: "Formato no permitido" }) };
    listos.push({ nombre: f.name.slice(0, 120), tipo, datos });
  }
  return { listos };
}

/** Guarda las imágenes en `archivo` y las enlaza al producto (la primera es portada si aún no tiene). */
async function guardarImagenes(tx: Tx, usuarioId: string, productoId: string, listos: ImagenLista[], alt: string) {
  const [{ nombre, tiene_portada, max_orden }] = await tx<{ nombre: string; tiene_portada: boolean; max_orden: number }[]>`
    select p.nombre,
           exists (select 1 from public.imagen_producto i where i.producto_id = p.id and i.es_portada) as tiene_portada,
           coalesce((select max(orden) from public.imagen_producto i where i.producto_id = p.id), -1)::int as max_orden
    from public.producto_catalogo p where p.id = ${productoId}`;
  let portada = !tiene_portada;
  let orden = max_orden;
  for (const img of listos) {
    const [a] = await tx<{ id: string }[]>`
      insert into public.archivo (nombre, tipo_mime, tamano, datos, subido_por)
      values (${img.nombre}, ${img.tipo}, ${img.datos.length}, ${img.datos}, ${usuarioId}) returning id`;
    await tx`
      insert into public.imagen_producto (producto_id, url, alt, orden, es_portada)
      values (${productoId}, ${`/api/archivos/${a.id}`}, ${alt || nombre}, ${++orden}, ${portada})`;
    portada = false;
  }
}

export async function subirImagenes(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const productoId = z.string().uuid().safeParse(fd.get("productoId"));
  if (!productoId.success) return fallo("Producto no válido.");
  if (!(await productoEnArea(sesion, productoId.data))) return fallo(FUERA_DE_AREA);
  const leidas = await leerImagenes(fd);
  if ("error" in leidas) return leidas.error;
  const { listos } = leidas;
  if (listos.length === 0) return fallo("Elige al menos una imagen.", { imagenes: "Elige una imagen" });
  const alt = String(fd.get("alt") ?? "").trim().slice(0, 150);

  try {
    await comoUsuario(sesion, (tx) => guardarImagenes(tx, sesion.usuarioId, productoId.data, listos, alt));
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar(productoId.data);
  return exito(listos.length === 1 ? "Imagen subida." : `${listos.length} imágenes subidas.`);
}

export async function eliminarImagen(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const id = z.string().uuid().parse(fd.get("id"));
  const dueno = await productoDe("imagen_producto", id);
  if (!dueno || !(await productoEnArea(sesion, dueno))) return;
  let productoId: string | undefined;
  await comoUsuario(sesion, async (tx) => {
    const [img] = await tx<{ producto_id: string; url: string; es_portada: boolean }[]>`
      delete from public.imagen_producto where id = ${id} returning producto_id, url, es_portada`;
    if (!img) return;
    productoId = img.producto_id;
    const archivo = /^\/api\/archivos\/([0-9a-f-]{36})$/.exec(img.url)?.[1];
    if (archivo) await tx`delete from public.archivo where id = ${archivo}`;
    if (img.es_portada) {
      await tx`
        update public.imagen_producto set es_portada = true
        where id = (select id from public.imagen_producto where producto_id = ${img.producto_id} order by orden limit 1)`;
    }
  });
  refrescar(productoId);
}

export async function marcarPortada(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const id = z.string().uuid().parse(fd.get("id"));
  const dueno = await productoDe("imagen_producto", id);
  if (!dueno || !(await productoEnArea(sesion, dueno))) return;
  let productoId: string | undefined;
  await comoUsuario(sesion, async (tx) => {
    const [img] = await tx<{ producto_id: string }[]>`select producto_id from public.imagen_producto where id = ${id}`;
    if (!img) return;
    productoId = img.producto_id;
    await tx`update public.imagen_producto set es_portada = false where producto_id = ${img.producto_id} and es_portada`;
    await tx`update public.imagen_producto set es_portada = true where id = ${id}`;
  });
  refrescar(productoId);
}

// -----------------------------------------------------------------------------
// Metodología JP (celulares): planes semanales con la tasa mensual de su gama
// -----------------------------------------------------------------------------
type Tx = Parameters<Parameters<typeof comoUsuario>[1]>[0];

/** Recalcula la cuota de los planes JP del producto con su nueva tasa/precio (conserva inicial y semanas). */
async function recalcularPlanesJP(tx: Tx, productoId: string, precio: number) {
  const planes = await tx<{ id: string; inicial: number; semanas: number }[]>`
    select id, cuota_inicial::float8 as inicial, numero_cuotas as semanas from public.plan_credito
    where producto_id = ${productoId} and nombre like ${`${PREFIJO_PLAN_JP}%`} and frecuencia = 'SEMANAL'`;
  for (const pl of planes) {
    const c = cotizarCelularJP(precio, pl.inicial, pl.semanas);
    if (c.cuota > 0 && pl.inicial < precio) await tx`update public.plan_credito set ${tx(planJP(c))} where id = ${pl.id}`;
  }
}

const planJPSchema = z.object({
  productoId: z.string().uuid(),
  inicial: z.string().trim().regex(/^\d{1,7}$/, "Monto entero (ej. 150)").transform(Number),
  semanas: z.string().trim().regex(/^\d{1,3}$/, "Número entero").transform(Number).refine((n) => n >= 4 && n <= 104, "Entre 4 y 104 semanas"),
});

/** Crea (o reemplaza) el plan JP del celular con la inicial y semanas indicadas. */
export async function aplicarPlanJP(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const parsed = planJPSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos del plan.", erroresZod(parsed.error));
  const d = parsed.data;
  const [producto] = await sql()<{ precio: number; categoria: string }[]>`
    select precio_contado::float8 as precio, categoria::text from public.producto_catalogo where id = ${d.productoId}`;
  if (!producto) return fallo("Producto no encontrado.");
  if (!categoriasDe(sesion.rol).includes(producto.categoria)) return fallo(FUERA_DE_AREA);
  if (producto.categoria !== "CELULAR") return fallo("La metodología JP es solo para celulares.");
  if (d.inicial >= producto.precio) return fallo("La inicial debe ser menor que el precio.", { inicial: "Menor que el precio" });
  const c = cotizarCelularJP(producto.precio, d.inicial, d.semanas);
  try {
    await comoUsuario(sesion, async (tx) => {
      // Los planes JP anteriores se borran (o se ocultan si un crédito ya los usa).
      await tx`
        delete from public.plan_credito pl where pl.producto_id = ${d.productoId} and pl.nombre like ${`${PREFIJO_PLAN_JP}%`}
          and not exists (select 1 from public.credito cr where cr.plan_credito_id = pl.id)`;
      await tx`update public.plan_credito set publicado = false where producto_id = ${d.productoId} and nombre like ${`${PREFIJO_PLAN_JP}%`}`;
      await tx`insert into public.plan_credito ${tx({ ...planJP(c), producto_id: d.productoId, publicado: true, orden: 0 })}`;
    });
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar(d.productoId);
  return exito(`Plan JP guardado: inicial S/ ${c.inicial} + ${c.semanas} cuotas de S/ ${c.cuota} (${c.tasaMensual} % mensual). Total S/ ${c.totalPagado}.`);
}

// -----------------------------------------------------------------------------
// Planes de crédito por producto
// -----------------------------------------------------------------------------
const planSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    productoId: z.string().uuid(),
    nombre: z.string().trim().max(60),
    cuotaInicial: z.string().trim().regex(/^\d*(\.\d{1,2})?$/, "Usa solo números").transform((v) => Number(v || 0)),
    numeroCuotas: z.string().trim().regex(/^\d{1,3}$/, "Número entero").transform(Number).refine((n) => n >= 1 && n <= 400, "Entre 1 y 400"),
    frecuencia: z.enum(FRECUENCIAS),
    tipoCalculo: z.enum(TIPOS_CALCULO),
    modo: z.enum(["tasa", "cuota"]),
    tasaPorcentaje: z.string().trim().regex(/^\d*(\.\d{1,3})?$/, "Usa hasta 3 decimales"),
    montoCuota: z.string().trim().regex(/^\d*(\.\d{1,2})?$/, "Usa hasta 2 decimales"),
    orden: z.string().trim().regex(/^-?\d{0,6}$/).transform((v) => Number(v || 0)),
  })
  .superRefine((d, ctx) => {
    if (d.modo === "tasa" && d.tasaPorcentaje === "") ctx.addIssue({ code: "custom", path: ["tasaPorcentaje"], message: "Ingresa la tasa" });
    if (d.modo === "cuota" && !(Number(d.montoCuota) > 0)) ctx.addIssue({ code: "custom", path: ["montoCuota"], message: "Ingresa el monto de la cuota" });
  });

export async function guardarPlan(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const parsed = planSchema.safeParse(datosDe(fd));
  if (!parsed.success) return fallo("Revisa los datos del plan.", erroresZod(parsed.error));
  const d = parsed.data;
  if (!(await productoEnArea(sesion, d.productoId))) return fallo(FUERA_DE_AREA);

  const [producto] = await sql()<{ precio: number }[]>`select precio_contado::float8 as precio from public.producto_catalogo where id = ${d.productoId}`;
  if (!producto) return fallo("Producto no encontrado.");
  if (d.cuotaInicial >= producto.precio) return fallo("La inicial debe ser menor que el precio.", { cuotaInicial: "Debe ser menor que el precio" });

  const tasa = d.modo === "tasa" ? Number(d.tasaPorcentaje) : null;
  const cuota = d.modo === "cuota" ? Number(d.montoCuota) : null;
  const r = calcularCredito({
    monto: producto.precio,
    cuotaInicial: d.cuotaInicial,
    numeroCuotas: d.numeroCuotas,
    frecuencia: d.frecuencia,
    tipoCalculo: d.tipoCalculo,
    tasaPorcentaje: tasa,
    montoCuota: cuota,
  });
  if (cuota != null && Number.isNaN(r.tasaPeriodo))
    return fallo("Con esa cuota no se cubre el monto financiado.", { montoCuota: "Cuota insuficiente" });

  // Tope de TEA (Ley 31143 / BCRP): lo fija el área legal en configuracion.tope_tea_porcentaje.
  const [conf] = await sql()<{ tope: number | null }[]>`
    select (valor #>> '{}')::numeric::float8 as tope from public.configuracion
    where clave = 'tope_tea_porcentaje' and jsonb_typeof(valor) = 'number'`;
  if (conf?.tope != null && r.teaPorcentaje > conf.tope) {
    return fallo(`La TEA del plan (${r.teaPorcentaje.toFixed(2)} %) supera el tope configurado de ${conf.tope} %.`, {
      [d.modo === "tasa" ? "tasaPorcentaje" : "montoCuota"]: "Supera el tope de TEA",
    });
  }

  const fila = {
    producto_id: d.productoId,
    nombre: d.nombre || null,
    cuota_inicial: d.cuotaInicial,
    numero_cuotas: d.numeroCuotas,
    frecuencia: d.frecuencia,
    tipo_calculo: d.tipoCalculo,
    tasa_porcentaje: tasa,
    monto_cuota: cuota,
    publicado: fd.get("publicado") === "on",
    orden: d.orden,
  };
  try {
    await comoUsuario(sesion, (tx) =>
      d.id
        ? tx`update public.plan_credito set ${tx(fila)} where id = ${d.id} and producto_id = ${d.productoId}`
        : tx`insert into public.plan_credito ${tx(fila)}`,
    );
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  refrescar(d.productoId);
  return exito(`Plan guardado: cuota de S/ ${r.cuota.toFixed(2)} · TEA ${r.teaPorcentaje.toFixed(2)} %.`);
}

export async function eliminarPlan(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_CATALOGO);
  const id = z.string().uuid().parse(fd.get("id"));
  const dueno = await productoDe("plan_credito", id);
  if (!dueno || !(await productoEnArea(sesion, dueno))) return;
  let productoId: string | undefined;
  await comoUsuario(sesion, async (tx) => {
    const [p] = await tx<{ producto_id: string }[]>`delete from public.plan_credito where id = ${id} returning producto_id`;
    productoId = p?.producto_id;
  });
  refrescar(productoId);
}
