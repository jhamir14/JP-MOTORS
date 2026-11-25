"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge, Card, ExternalButton } from "@/components/ui";
import { IconSearch, IconWhatsApp } from "@/components/icons";
import { normalizarTexto, type Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export function CatalogoRepuestos({ repuestos, qInicial = "" }: { repuestos: Producto[]; qInicial?: string }) {
  const [q, setQ] = useState(qInicial);
  const [categoria, setCategoria] = useState("Todas");
  const categorias = useMemo(() => ["Todas", ...Array.from(new Set(repuestos.map((r) => r.etiquetas[0] ?? "Otros")))], [repuestos]);

  const lista = repuestos.filter((r) => {
    const t = normalizarTexto(q);
    return (
      (!t || normalizarTexto(`${r.nombre} ${r.descripcion ?? ""} ${r.marca}`).includes(t)) &&
      (categoria === "Todas" || (r.etiquetas[0] ?? "Otros") === categoria)
    );
  });

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:flex-row md:items-center">
        <div className="relative md:w-80">
          <IconSearch size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <label htmlFor="r-q" className="sr-only">Buscar repuesto</label>
          <input
            id="r-q"
            type="search"
            placeholder="Buscar (ej. aceite, llanta…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface py-2.5 pr-3.5 pl-10 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categoría">
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                categoria === c ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">{lista.length} productos</p>

      {lista.length === 0 ? (
        <p className="py-16 text-center text-muted">No encontramos productos. Prueba con otra palabra o categoría.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {lista.map((r) => (
            <Card key={r.id} interactive className="flex flex-col">
              <div className="relative aspect-square bg-surface-2">
                {r.etiquetas.includes("Agotado") && (
                  <Badge tone="outline" className="absolute top-2.5 left-2.5 z-[1]">Agotado</Badge>
                )}
                {r.imagenes[0] && (
                  <Image src={r.imagenes[0].url} alt={r.imagenes[0].alt} fill sizes="(max-width: 768px) 45vw, 280px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <span className="text-xs font-semibold text-muted">{r.etiquetas[0] ?? "Repuesto"}</span>
                <h3 className="mt-1 line-clamp-2 text-[0.95rem] leading-snug">{r.nombre}</h3>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="font-extrabold tabular">{formatSoles(r.precio, true)}</span>
                  <ExternalButton
                    href={whatsappLink(whatsappMessages.repuesto(r.nombre))}
                    variant={r.etiquetas.includes("Agotado") ? "outline" : "primary"}
                    size="sm"
                    aria-label={`Pedir ${r.nombre} por WhatsApp`}
                    className="px-3"
                  >
                    <IconWhatsApp size={16} /> <span className="max-sm:hidden">Pedir</span>
                  </ExternalButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
