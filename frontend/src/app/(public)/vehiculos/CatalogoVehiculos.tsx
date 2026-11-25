"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { VehiculoCard } from "@/components/public/VehiculoCard";
import { Button } from "@/components/ui";
import { ETIQUETA_CATEGORIA, cilindrada, normalizarTexto, type CategoriaProducto, type Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";

const ORDENES = ["Destacados", "Menor precio", "Mayor precio", "Mayor cilindrada"] as const;
type Orden = (typeof ORDENES)[number];
const PRECIO_MIN = 3000;

interface Props {
  vehiculos: Producto[];
  inicial: { q: string; tipo: string; uso: string; precioMax: number; orden: string };
}

export function CatalogoVehiculos({ vehiculos, inicial }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const precioMaximo = Math.max(PRECIO_MIN + 1000, Math.ceil(Math.max(0, ...vehiculos.map((v) => v.precio)) / 1000) * 1000);
  const tipos = useMemo(() => Array.from(new Set(vehiculos.map((v) => v.categoria))), [vehiculos]);
  const usos = useMemo(() => Array.from(new Set(vehiculos.flatMap((v) => v.etiquetas))).sort(), [vehiculos]);

  const [q, setQ] = useState(inicial.q);
  const [tipo, setTipo] = useState(tipos.includes(inicial.tipo as CategoriaProducto) ? inicial.tipo : "Todos");
  const [uso, setUso] = useState(usos.includes(inicial.uso) ? inicial.uso : "Todos");
  const [precioMax, setPrecioMax] = useState(Math.min(inicial.precioMax || precioMaximo, precioMaximo));
  const [orden, setOrden] = useState<Orden>(ORDENES.includes(inicial.orden as Orden) ? (inicial.orden as Orden) : "Destacados");

  // Filtros en la URL: se pueden compartir y no se pierden al volver atrás.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tipo !== "Todos") params.set("tipo", tipo);
    if (uso !== "Todos") params.set("uso", uso);
    if (precioMax < precioMaximo) params.set("precioMax", String(precioMax));
    if (orden !== "Destacados") params.set("orden", orden);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [q, tipo, uso, precioMax, orden, precioMaximo, pathname, router]);

  const resultado = useMemo(() => {
    const term = normalizarTexto(q);
    const lista = vehiculos.filter((v) => {
      const texto = normalizarTexto(`${v.nombre} ${v.marca} ${ETIQUETA_CATEGORIA[v.categoria]} ${v.etiquetas.join(" ")}`);
      return (
        (!term || texto.includes(term)) &&
        (tipo === "Todos" || v.categoria === tipo) &&
        (uso === "Todos" || v.etiquetas.includes(uso)) &&
        v.precio <= precioMax
      );
    });
    if (orden === "Menor precio") return [...lista].sort((a, b) => a.precio - b.precio);
    if (orden === "Mayor precio") return [...lista].sort((a, b) => b.precio - a.precio);
    if (orden === "Mayor cilindrada") return [...lista].sort((a, b) => (cilindrada(b) ?? 0) - (cilindrada(a) ?? 0));
    return [...lista].sort((a, b) => Number(b.destacado) - Number(a.destacado));
  }, [vehiculos, q, tipo, uso, precioMax, orden]);

  const limpiar = () => {
    setQ("");
    setTipo("Todos");
    setUso("Todos");
    setPrecioMax(precioMaximo);
    setOrden("Destacados");
  };

  const labelCls = "mb-2 block text-sm font-semibold text-muted";
  const chip = (activo: boolean) =>
    cn(
      "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
      activo ? "border-brand bg-brand text-white" : "border-line bg-surface text-fg hover:border-brand",
    );

  return (
    <section className="py-10 md:py-14">
      <div className="container flex flex-col gap-8">
        <div className="grid items-start gap-6 rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:grid-cols-2 md:p-6 lg:grid-cols-4">
          <div>
            <label htmlFor="f-q" className={labelCls}>Buscar por modelo</label>
            <input
              id="f-q"
              type="search"
              placeholder="Ej. CB190R"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>

          <div>
            <label htmlFor="f-precio" className={labelCls}>
              Precio máximo: <span className="text-fg tabular">{precioMax >= precioMaximo ? "Sin límite" : formatSoles(precioMax)}</span>
            </label>
            <input
              id="f-precio"
              type="range"
              min={PRECIO_MIN}
              max={precioMaximo}
              step={500}
              value={precioMax}
              onChange={(e) => setPrecioMax(Number(e.target.value))}
              className="w-full cursor-pointer accent-brand"
            />
            <div className="mt-1 flex justify-between text-xs text-muted tabular">
              <span>{formatSoles(PRECIO_MIN)}</span>
              <span>{formatSoles(precioMaximo)}</span>
            </div>
          </div>

          <div>
            <span className={labelCls}>Tipo</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de vehículo">
              {["Todos", ...tipos].map((t) => (
                <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={chip(tipo === t)}>
                  {t === "Todos" ? t : ETIQUETA_CATEGORIA[t as CategoriaProducto]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Uso</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Uso">
              {["Todos", ...usos].map((u) => (
                <button key={u} type="button" aria-pressed={uso === u} onClick={() => setUso(u)} className={chip(uso === u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-6 flex items-center justify-between gap-4">
            <span className="text-sm text-muted" aria-live="polite">
              <strong className="text-fg">{resultado.length}</strong> {resultado.length === 1 ? "modelo" : "modelos"}
            </span>
            <label className="sr-only" htmlFor="f-orden">Ordenar por</label>
            <select
              id="f-orden"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              className="cursor-pointer rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium outline-none focus:border-brand"
            >
              {ORDENES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {resultado.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-16 text-center">
              <h2 className="text-2xl">No se encontraron modelos</h2>
              <p className="mt-2 text-muted">Intenta ajustar o limpiar tus filtros de búsqueda.</p>
              <Button onClick={limpiar} size="sm" variant="secondary" className="mt-6">Limpiar filtros</Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resultado.map((v, i) => (
                <VehiculoCard key={v.id} producto={v} priority={i < 3} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
