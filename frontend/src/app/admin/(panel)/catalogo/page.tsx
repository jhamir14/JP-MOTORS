import Link from "next/link";
import { Encabezado, Tabla, Vacio } from "@/components/admin/ui";
import { Badge, ButtonLink } from "@/components/ui";
import { CATEGORIAS, ETIQUETA_CATEGORIA, hrefProducto, type CategoriaProducto } from "@/lib/catalogo";
import { categoriasDe } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { requerirSeccion } from "@/lib/server/auth";
import { sql } from "@/lib/server/db";
import { cambiarPublicacion } from "./actions";

export const metadata = { title: "Catálogo" };

interface Fila {
  id: string; slug: string; categoria: CategoriaProducto; marca: string; nombre: string; precio: number;
  publicado: boolean; destacado: boolean; portada: string | null; planes: number; planes_publicados: number; stock: number;
}

export default async function CatalogoAdminPage({ searchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const sesion = await requerirSeccion("catalogo");
  const sp = await searchParams;
  // Cada administrador ve solo las categorías de su área (motos o celulares).
  const categorias = categoriasDe(sesion.rol);
  const visibles = CATEGORIAS.filter((c) => categorias.includes(c));
  const categoria = (visibles as readonly string[]).includes(sp.categoria ?? "") ? sp.categoria! : null;
  const q = (sp.q ?? "").trim().slice(0, 60);

  const filas = await sql()<Fila[]>`
    select p.id, p.slug, p.categoria, p.marca, p.nombre, p.precio_contado::float8 as precio, p.publicado, p.destacado,
           (select url from public.imagen_producto i where i.producto_id = p.id order by i.es_portada desc, i.orden limit 1) as portada,
           (select count(*) from public.plan_credito pl where pl.producto_id = p.id)::int as planes,
           (select count(*) from public.plan_credito pl where pl.producto_id = p.id and pl.publicado)::int as planes_publicados,
           coalesce(s.en_stock, 0)::int as stock
    from public.producto_catalogo p
    left join public.v_stock_producto s on s.producto_id = p.id
    where p.categoria <> 'REPUESTO'
      and (${categoria}::text is null or p.categoria::text = ${categoria})
      and p.categoria::text = any(${categorias})
      and (${q} = '' or p.nombre ilike ${"%" + q + "%"} or p.marca ilike ${"%" + q + "%"} or p.slug ilike ${"%" + q + "%"})
    order by p.categoria, p.orden, p.nombre`;

  return (
    <>
      <Encabezado
        titulo="Catálogo"
        acciones={<ButtonLink href="/admin/catalogo/nuevo" size="sm">+ Nuevo producto</ButtonLink>}
      >
        Lo publicado aparece en la web en segundos. Edita precios, fotos, especificaciones y planes de crédito.
      </Encabezado>

      <form className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o marca"
          className="min-w-0 flex-1 rounded-xl md:w-64 md:flex-none border border-line bg-surface px-3.5 py-2 text-sm outline-none focus:border-brand"
        />
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <button type="submit" className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Buscar</button>
        <div className="flex flex-wrap gap-2 md:ml-3">
          {visibles.length > 1 && [null, ...visibles].map((c) => {
            const params = new URLSearchParams();
            if (c) params.set("categoria", c);
            if (q) params.set("q", q);
            return (
              <Link
                key={c ?? "todas"}
                href={`/admin/catalogo${params.size ? `?${params}` : ""}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  categoria === c ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
                )}
              >
                {c ? ETIQUETA_CATEGORIA[c] : "Todas"}
              </Link>
            );
          })}
        </div>
      </form>

      {filas.length === 0 ? (
        <Vacio>No hay productos con esos filtros.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="text-right">Contado</th>
              <th>Planes</th>
              <th>Stock</th>
              <th>Web</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/catalogo/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-ink">
                      {p.portada ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel (puede no estar publicada)
                        <img src={p.portada} alt="" className="size-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[0.6rem] text-white/60">sin foto</span>
                      )}
                    </span>
                    <span>
                      {p.nombre}
                      <span className="block text-xs font-normal text-muted">{p.marca} · /{p.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap">{ETIQUETA_CATEGORIA[p.categoria]}</td>
                <td className="text-right font-semibold tabular whitespace-nowrap">{formatSoles(p.precio, true)}</td>
                <td className="whitespace-nowrap text-muted">{p.planes_publicados}/{p.planes}</td>
                <td>{p.stock > 0 ? <Badge tone="accent">{p.stock}</Badge> : <span className="text-muted">—</span>}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <form action={cambiarPublicacion}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="publicado" value={String(!p.publicado)} />
                      <button
                        type="submit"
                        title={p.publicado ? "Despublicar" : "Publicar"}
                        className={cn(
                          "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold",
                          p.publicado ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted",
                        )}
                      >
                        {p.publicado ? "Publicado" : "Oculto"}
                      </button>
                    </form>
                    {p.destacado && <Badge tone="gold">Destacado</Badge>}
                    {p.publicado && (
                      <Link href={hrefProducto(p)} target="_blank" className="text-xs font-semibold text-brand">Ver ↗</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
