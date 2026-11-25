"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotoCard } from "@/components/public/MotoCard";
import { Button } from "@/components/ui";
import type { Moto } from "@/data/motos";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";

const ORDENES = ["Destacados", "Menor precio", "Mayor precio", "Mayor cilindrada"] as const;
type Orden = (typeof ORDENES)[number];
const PRECIO_MIN = 3000;

interface Props {
  motos: Moto[];
  categorias: readonly string[];
  precioMaximo: number;
  inicial: { q: string; categoria: string; precioMax: number; orden: string };
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function CatalogoMotos({ motos, categorias, precioMaximo, inicial }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(inicial.q);
  const [categoria, setCategoria] = useState(categorias.includes(inicial.categoria) ? inicial.categoria : "Todas");
  const [precioMax, setPrecioMax] = useState(Math.min(inicial.precioMax, precioMaximo));
  const [orden, setOrden] = useState<Orden>(ORDENES.includes(inicial.orden as Orden) ? (inicial.orden as Orden) : "Destacados");

  // Mantener los filtros en la URL para que se puedan compartir y no se pierdan al volver atrás.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria !== "Todas") params.set("categoria", categoria);
    if (precioMax < precioMaximo) params.set("precioMax", String(precioMax));
    if (orden !== "Destacados") params.set("orden", orden);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [q, categoria, precioMax, orden, precioMaximo, pathname, router]);

  const resultado = useMemo(() => {
    const term = normalizar(q);
    const lista = motos.filter((m) => {
      const texto = normalizar(`${m.nombre} ${m.marca} ${m.categoria}`);
      return (!term || texto.includes(term)) && (categoria === "Todas" || m.categoria === categoria) && m.precio <= precioMax;
    });
    if (orden === "Menor precio") return [...lista].sort((a, b) => a.precio - b.precio);
    if (orden === "Mayor precio") return [...lista].sort((a, b) => b.precio - a.precio);
    if (orden === "Mayor cilindrada") return [...lista].sort((a, b) => b.cc - a.cc);
    return [...lista].sort((a, b) => Number(b.destacado) - Number(a.destacado));
  }, [motos, q, categoria, precioMax, orden]);

  const limpiar = () => {
    setQ("");
    setCategoria("Todas");
    setPrecioMax(precioMaximo);
    setOrden("Destacados");
  };

  const labelCls = "mb-2 block text-sm font-bold text-muted";

  return (
    <section className="py-15">
      <div className="container flex flex-col gap-10">
        <aside className="rounded-xl border border-line-soft bg-[rgba(15,17,21,0.5)] p-6">
          <h2 className="mb-6 border-b border-line pb-3 text-lg font-extrabold uppercase">Filtros rápidos</h2>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-start gap-8">
            <div>
              <label htmlFor="f-q" className={labelCls}>Buscar por modelo</label>
              <input
                id="f-q"
                type="search"
                placeholder="Ej. CB190R"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-md border border-line bg-white/5 p-3 text-white outline-none transition-colors focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="f-precio" className={labelCls}>
                Precio máximo: {precioMax >= precioMaximo ? "Sin límite" : formatSoles(precioMax)}
              </label>
              <input
                id="f-precio"
                type="range"
                min={PRECIO_MIN}
                max={precioMaximo}
                step={500}
                value={precioMax}
                onChange={(e) => setPrecioMax(Number(e.target.value))}
                className="w-full cursor-pointer accent-accent"
              />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{formatSoles(PRECIO_MIN)}</span>
                <span>{formatSoles(precioMaximo)}</span>
              </div>
            </div>

            <div>
              <span className={labelCls}>Categoría</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Categoría">
                {["Todas", ...categorias].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={categoria === cat}
                    onClick={() => setCategoria(cat)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-[0.8rem] transition-all",
                      categoria === cat ? "border-accent bg-accent font-extrabold text-black" : "border-line bg-white/5 text-white hover:border-accent/50",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-line-soft pb-4">
            <span className="text-[0.95rem] text-muted" aria-live="polite">
              Mostrando <strong className="text-white">{resultado.length}</strong> {resultado.length === 1 ? "modelo" : "modelos"}
            </span>
            <label className="sr-only" htmlFor="f-orden">Ordenar por</label>
            <select
              id="f-orden"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="cursor-pointer rounded-md border border-line bg-surface px-4 py-2 text-white outline-none"
            >
              {ORDENES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {resultado.length === 0 ? (
            <div className="py-20 text-center text-muted">
              <h2 className="mb-4 text-3xl">No se encontraron modelos</h2>
              <p>Intenta ajustar o limpiar tus filtros de búsqueda.</p>
              <Button onClick={limpiar} size="sm" className="mt-6">Limpiar filtros</Button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
              {resultado.map((moto, i) => (
                <MotoCard key={moto.id} moto={moto} showFinanciar priority={i < 3} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
