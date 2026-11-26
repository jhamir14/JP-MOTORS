"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProductoCard } from "@/components/public/ProductoCard";
import { IconWhatsApp } from "@/components/icons";
import { LINEAS, cilindrada, lineaDe, normalizarTexto, type LineaId, type Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const ORDENES = ["Destacados", "Menor precio", "Mayor precio", "Nombre"] as const;
type Orden = (typeof ORDENES)[number];
type Filtro = LineaId | "todos";

interface Props {
  productos: Producto[];
  inicial: { linea: Filtro; q: string; orden: string };
}

export function CatalogoCliente({ productos, inicial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [linea, setLinea] = useState<Filtro>(inicial.linea);
  const [q, setQ] = useState(inicial.q);
  const [orden, setOrden] = useState<Orden>(ORDENES.includes(inicial.orden as Orden) ? (inicial.orden as Orden) : "Destacados");

  // Filtros en la URL: se pueden compartir y no se pierden al volver atrás.
  useEffect(() => {
    const params = new URLSearchParams();
    if (linea !== "todos") params.set("linea", linea);
    if (q) params.set("q", q);
    if (orden !== "Destacados") params.set("orden", orden);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [linea, q, orden, pathname, router]);

  const pestañas = useMemo(
    () => [
      { id: "todos" as Filtro, nombre: "Todo", total: productos.length },
      ...LINEAS.map((l) => ({ id: l.id as Filtro, nombre: l.nombre, total: productos.filter((p) => lineaDe(p).id === l.id).length })),
    ].filter((t) => t.total > 0),
    [productos],
  );

  const resultado = useMemo(() => {
    const termino = normalizarTexto(q);
    const lista = productos.filter((p) => {
      const texto = normalizarTexto(`${p.nombre} ${p.marca} ${p.etiquetas.join(" ")} ${Object.values(p.specs).join(" ")}`);
      return (linea === "todos" || lineaDe(p).id === linea) && (!termino || texto.includes(termino));
    });
    if (orden === "Menor precio") return [...lista].sort((a, b) => a.precio - b.precio);
    if (orden === "Mayor precio") return [...lista].sort((a, b) => b.precio - a.precio);
    if (orden === "Nombre") return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    // Destacados: primero los destacados; los repuestos al final cuando se ve todo el catálogo.
    return [...lista].sort(
      (a, b) =>
        Number(a.categoria === "REPUESTO") - Number(b.categoria === "REPUESTO") ||
        Number(b.destacado) - Number(a.destacado) ||
        (cilindrada(b) ?? 0) - (cilindrada(a) ?? 0),
    );
  }, [productos, linea, q, orden]);

  // Indicador dorado que se desliza bajo la pestaña activa.
  const barra = useRef<HTMLDivElement>(null);
  const [indicador, setIndicador] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const medir = () => {
      const activo = barra.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (activo) setIndicador({ x: activo.offsetLeft, w: activo.offsetWidth });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [linea, pestañas]);

  const limpiar = () => {
    setLinea("todos");
    setQ("");
    setOrden("Destacados");
  };

  // Cambia la clave del grid para que las tarjetas vuelvan a entrar escalonadas al filtrar.
  const claveGrid = `${linea}|${orden}|${normalizarTexto(q)}`;

  return (
    <section className="relative bg-niebla pb-24">
      <div className="container">
        {/* Barra de filtros, montada sobre el borde del hero */}
        <div className="sticky top-[76px] z-20 -mt-14 rounded-[1.75rem] border border-white/60 bg-white/90 p-3 shadow-[0_24px_50px_-30px_rgba(10,22,51,0.55)] backdrop-blur-xl md:top-[84px] md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
              <div ref={barra} role="group" aria-label="Línea de productos" className="relative flex w-max gap-1 rounded-full bg-niebla p-1">
                {indicador && (
                  <span
                    aria-hidden
                    className="absolute top-1 bottom-1 rounded-full bg-noche shadow-[0_8px_20px_-8px_rgba(5,14,36,0.7)] transition-[left,width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                    style={{ left: indicador.x, width: indicador.w }}
                  />
                )}
                {pestañas.map((t) => {
                  const activo = linea === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setLinea(t.id)}
                      className={cn(
                        "relative z-[1] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300",
                        activo ? "text-white" : "text-pizarra hover:text-tinta",
                      )}
                    >
                      {t.nombre}
                      <span className={cn("text-xs tabular transition-colors", activo ? "text-oro-claro" : "text-pizarra/60")}>{t.total}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <label htmlFor="f-q" className="sr-only">Buscar por modelo o marca</label>
              <input
                id="f-q"
                type="search"
                placeholder="Buscar modelo"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-tinta/10 bg-white px-5 py-2.5 text-[0.95rem] text-tinta outline-none placeholder:text-pizarra/60 focus:border-oro focus:ring-4 focus:ring-oro/20 lg:w-64"
              />
              <label htmlFor="f-orden" className="sr-only">Ordenar por</label>
              <select
                id="f-orden"
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                className="cursor-pointer rounded-full border border-tinta/10 bg-white px-4 py-2.5 text-sm font-semibold text-tinta outline-none focus:border-oro focus:ring-4 focus:ring-oro/20"
              >
                {ORDENES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-pizarra" aria-live="polite">
          <strong className="text-tinta tabular">{resultado.length}</strong> {resultado.length === 1 ? "modelo" : "modelos"}
        </p>

        {resultado.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-tinta/15 bg-white px-6 py-16 text-center">
            <h2 className="display-sm text-[1.6rem] text-tinta">No encontramos modelos con esa búsqueda</h2>
            <p className="mx-auto mt-3 max-w-md text-pizarra">Prueba con otra palabra o pregúntale a un asesor: también conseguimos modelos a pedido.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={limpiar} className="btn-linea">Ver todo el catálogo</button>
              <a href={whatsappLink(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className="btn-oro">
                <IconWhatsApp size={18} /> Preguntar por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div key={claveGrid} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resultado.map((p, i) => (
              <ProductoCard key={p.id} producto={p} indice={i} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
