import "server-only";
import { cache } from "react";
import { catalogoRespaldo, tasasRespaldo } from "@/data/catalogoRespaldo";
import type { CategoriaProducto, Producto, TasaPublica } from "@/lib/catalogo";
import { dbConfigurada, sql } from "./db";

/**
 * Lectura del catálogo público desde PostgreSQL. Solo devuelve productos y planes PUBLICADOS.
 * Si la base no está configurada o falla, se usa el respaldo estático para que la web nunca quede vacía.
 * `cache` evita repetir la consulta dentro de un mismo request (layout + página + metadata).
 */
export const obtenerCatalogo = cache(async (): Promise<Producto[]> => {
  if (!dbConfigurada) return catalogoRespaldo;
  try {
    const filas = await sql()<Producto[]>`
      select p.id, p.slug, p.categoria, p.marca, p.modelo, p.nombre, p.descripcion,
             p.precio_contado::float8 as precio, p.specs, p.etiquetas, p.destacado,
             coalesce((select json_agg(json_build_object('url', i.url, 'alt', coalesce(i.alt, p.nombre))
                                       order by i.es_portada desc, i.orden, i.created_at)
                       from public.imagen_producto i where i.producto_id = p.id), '[]'::json) as imagenes,
             coalesce((select json_agg(json_build_object(
                                 'id', pl.id, 'nombre', pl.nombre, 'cuotaInicial', pl.cuota_inicial::float8,
                                 'numeroCuotas', pl.numero_cuotas, 'frecuencia', pl.frecuencia,
                                 'tipoCalculo', pl.tipo_calculo, 'tasaPorcentaje', pl.tasa_porcentaje::float8,
                                 'montoCuota', pl.monto_cuota::float8) order by pl.orden, pl.numero_cuotas)
                       from public.plan_credito pl where pl.producto_id = p.id and pl.publicado), '[]'::json) as planes,
             coalesce(s.en_stock, 0)::int as stock
      from public.producto_catalogo p
      left join public.v_stock_producto s on s.producto_id = p.id
      where p.publicado and p.categoria <> 'REPUESTO'
      order by p.orden, p.nombre`;
    return filas.map((f) => ({ ...f, specs: (f.specs ?? {}) as Record<string, string> }));
  } catch (e) {
    console.error("[catálogo] No se pudo leer de la base de datos; se usa el respaldo estático:", e);
    return catalogoRespaldo;
  }
});

export async function productosPorCategoria(...categorias: CategoriaProducto[]) {
  return (await obtenerCatalogo()).filter((p) => categorias.includes(p.categoria));
}

export async function productoPorSlug(slug: string, categorias: readonly CategoriaProducto[]) {
  return (await obtenerCatalogo()).find((p) => p.slug === slug && categorias.includes(p.categoria)) ?? null;
}

export const obtenerTasasPublicas = cache(async (): Promise<TasaPublica[]> => {
  if (!dbConfigurada) return tasasRespaldo;
  try {
    const filas = await sql()<TasaPublica[]>`
      select servicio, frecuencia, tipo_calculo as "tipoCalculo", tasa_porcentaje::float8 as "tasaPorcentaje",
             cuotas_min as "cuotasMin", cuotas_max as "cuotasMax"
      from public.tasa_servicio
      where publica and activa and servicio in ('CREDITO_VEHICULAR', 'CREDITO_CELULAR')
      order by servicio, frecuencia`;
    return filas.length ? filas : tasasRespaldo;
  } catch (e) {
    console.error("[catálogo] No se pudieron leer las tasas; se usa el respaldo:", e);
    return tasasRespaldo;
  }
});
