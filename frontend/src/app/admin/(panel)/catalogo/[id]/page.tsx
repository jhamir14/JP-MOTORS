import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm, BotonEnviar, ErrorCampo } from "@/components/admin/AdminForm";
import { Encabezado, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ETIQUETA_CATEGORIA, hrefProducto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA, calcularCredito, type Frecuencia, type TipoCalculo } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { requerirSesion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { eliminarImagen, eliminarPlan, marcarPortada, subirImagenes } from "../actions";
import { FormProducto, type ProductoEditable } from "../FormProducto";
import { FormPlan, type PlanEditable } from "./FormPlan";

export const metadata = { title: "Editar producto" };

export default async function EditarProductoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  await requerirSesion();
  const { id } = await params;
  const { creado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = sql();

  const [[producto], imagenes, planes, [stock]] = await Promise.all([
    db<ProductoEditable[]>`
      select id, categoria, marca, modelo, nombre, slug, descripcion, precio_contado::float8 as precio, specs, etiquetas,
             destacado, publicado, orden
      from public.producto_catalogo where id = ${id}`,
    db<{ id: string; url: string; alt: string | null; es_portada: boolean }[]>`
      select id, url, alt, es_portada from public.imagen_producto where producto_id = ${id} order by es_portada desc, orden, created_at`,
    db<PlanEditable[]>`
      select id, nombre, cuota_inicial::float8 as "cuotaInicial", numero_cuotas as "numeroCuotas", frecuencia,
             tipo_calculo as "tipoCalculo", tasa_porcentaje::float8 as "tasaPorcentaje", monto_cuota::float8 as "montoCuota",
             publicado, orden
      from public.plan_credito where producto_id = ${id} order by orden, numero_cuotas`,
    db<{ en_stock: number }[]>`select coalesce(en_stock, 0)::int as en_stock from public.v_stock_producto where producto_id = ${id}`,
  ]);
  if (!producto) notFound();

  const servicio = producto.categoria === "CELULAR" ? "CREDITO_CELULAR" : "CREDITO_VEHICULAR";
  const [tasa] = await db<{ frecuencia: Frecuencia; tipoCalculo: TipoCalculo; tasa: number }[]>`
    select frecuencia, tipo_calculo as "tipoCalculo", tasa_porcentaje::float8 as tasa
    from public.tasa_servicio
    where servicio = ${servicio} and activa and (categoria is null or categoria::text = ${producto.categoria})
    order by categoria nulls last, frecuencia desc limit 1`;

  return (
    <>
      <Link href="/admin/catalogo" className="text-sm font-medium text-muted hover:text-brand">← Catálogo</Link>
      <Encabezado
        titulo={producto.nombre}
        acciones={
          producto.publicado ? (
            <Link href={hrefProducto(producto)} target="_blank" className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-brand">
              Ver en la web ↗
            </Link>
          ) : (
            <Badge tone="outline">No publicado</Badge>
          )
        }
      >
        {ETIQUETA_CATEGORIA[producto.categoria]} · {stock?.en_stock ?? 0} unidades en stock ·{" "}
        <Link href={`/admin/inventario?producto=${producto.id}`} className="font-semibold text-brand">ver inventario</Link>
      </Encabezado>

      {creado && (
        <p role="status" className="mb-5 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          Producto creado. Ahora sube sus fotos y define los planes de crédito; luego márcalo como publicado.
        </p>
      )}

      <div className="grid gap-6">
        <Panel titulo="Datos del producto">
          <FormProducto producto={producto} />
        </Panel>

        <Panel titulo={`Fotos (${imagenes.length})`}>
          {imagenes.length > 0 && (
            <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {imagenes.map((img) => (
                <li key={img.id} className="overflow-hidden rounded-xl border border-line-soft">
                  <div className="relative aspect-square bg-brand-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del panel */}
                    <img src={img.url} alt={img.alt ?? ""} className="size-full object-contain" loading="lazy" />
                    {img.es_portada && <Badge tone="gold" className="absolute top-2 left-2">Portada</Badge>}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2 text-xs">
                    {!img.es_portada ? (
                      <form action={marcarPortada}>
                        <input type="hidden" name="id" value={img.id} />
                        <button type="submit" className="cursor-pointer font-semibold text-brand">Hacer portada</button>
                      </form>
                    ) : (
                      <span className="text-muted">Principal</span>
                    )}
                    <form action={eliminarImagen}>
                      <input type="hidden" name="id" value={img.id} />
                      <button type="submit" className="cursor-pointer font-semibold text-danger">Eliminar</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <AdminForm action={subirImagenes} resetOnSuccess className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="productoId" value={producto.id} />
            <div>
              <label htmlFor="imagenes" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Imágenes</label>
              <input
                id="imagenes"
                name="imagenes"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand"
              />
              <ErrorCampo name="imagenes" />
            </div>
            <div>
              <label htmlFor="alt" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Texto alternativo</label>
              <input id="alt" name="alt" placeholder={producto.nombre} className="w-full rounded-xl border border-line px-3.5 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <BotonEnviar size="sm" pendiente="Subiendo…">Subir</BotonEnviar>
          </AdminForm>
          <p className="mt-2 text-xs text-muted">JPG, PNG, WEBP o AVIF de hasta 5 MB. Se recomienda fondo uniforme y 1200 px de ancho.</p>
        </Panel>

        {producto.categoria !== "REPUESTO" && (
          <Panel titulo={`Planes de crédito (${planes.length})`}>
            <p className="mb-4 text-sm text-muted">
              Lo que se publica aparece en la ficha del producto y en su tarjeta («cuota desde»). Cada crédito firmado guarda su propia
              copia de las condiciones: cambiar un plan no altera créditos existentes.
            </p>
            {planes.length > 0 && (
              <ul className="mb-6 grid gap-3">
                {planes.map((pl) => {
                  const r = calcularCredito({ monto: producto.precio, ...pl });
                  const etq = ETIQUETA_FRECUENCIA[pl.frecuencia];
                  return (
                    <li key={pl.id}>
                      <details className="rounded-xl border border-line-soft [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-3 text-sm">
                          <span className="font-semibold">{pl.nombre ?? `${pl.numeroCuotas} ${etq.plural}`}</span>
                          <span className="tabular text-muted">
                            Inicial {formatSoles(pl.cuotaInicial)} · {pl.numeroCuotas} × <strong className="text-accent">{formatSoles(r.cuota, true)}</strong> {etq.adjetivo} · TEA {r.teaPorcentaje.toFixed(1)} %
                          </span>
                          <Badge tone={pl.publicado ? "accent" : "outline"}>{pl.publicado ? "Publicado" : "Oculto"}</Badge>
                        </summary>
                        <div className="border-t border-line-soft p-3">
                          <FormPlan productoId={producto.id} precio={producto.precio} plan={pl} />
                          <form action={eliminarPlan} className="mt-3">
                            <input type="hidden" name="id" value={pl.id} />
                            <button type="submit" className="cursor-pointer text-xs font-semibold text-danger">Eliminar plan</button>
                          </form>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3 className="mb-3 text-base">Agregar plan</h3>
            <FormPlan productoId={producto.id} precio={producto.precio} tasaSugerida={tasa} />
          </Panel>
        )}
      </div>
    </>
  );
}
