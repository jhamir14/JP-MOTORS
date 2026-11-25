"use client";
import { useState } from "react";
import { ButtonLink } from "@/components/ui";
import { IconArrowRight, IconMoto, IconPhone } from "@/components/icons";
import type { Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { CelularCard } from "./CelularCard";
import { VehiculoCard } from "./VehiculoCard";

interface Vertical {
  id: "motos" | "toritos" | "celulares";
  etiqueta: string;
  titulo: string;
  texto: string;
  href: string;
  productos: Producto[];
}

/** Portada: selector Motos / Toritos / Celulares con los productos destacados de cada línea. */
export function SelectorVertical({ motos, toritos, celulares }: { motos: Producto[]; toritos: Producto[]; celulares: Producto[] }) {
  const verticales: Vertical[] = [
    { id: "motos", etiqueta: "Motos", titulo: "Motos para trabajar y moverte", texto: "Motos lineales Honda con cuotas mensuales.", href: "/vehiculos?tipo=MOTO_LINEAL", productos: motos },
    { id: "toritos", etiqueta: "Toritos y mototaxis", titulo: "Mototaxis y trimóviles", texto: "Torito Bajaj y Honda Motokar para transportistas.", href: "/vehiculos/torito-bajaj", productos: toritos },
    { id: "celulares", etiqueta: "Celulares", titulo: "Estrena celular pagando por semana", texto: "iPhone, Samsung, Xiaomi y Honor sin inicial obligatoria.", href: "/celulares", productos: celulares },
  ];
  const [activo, setActivo] = useState<Vertical["id"]>("motos");
  const v = verticales.find((x) => x.id === activo)!;

  return (
    <div>
      <div role="tablist" aria-label="Línea de productos" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line-soft bg-surface p-1.5 shadow-card">
        {verticales.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={activo === x.id}
            aria-controls={`panel-${x.id}`}
            type="button"
            onClick={() => setActivo(x.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all",
              activo === x.id ? "bg-brand text-white shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {x.id === "celulares" ? <IconPhone size={18} /> : <IconMoto size={18} />}
            {x.etiqueta}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${v.id}`} aria-labelledby={`tab-${v.id}`} className="mt-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-[1.6rem] md:text-[2rem]">{v.titulo}</h3>
            <p className="mt-1 text-muted">{v.texto}</p>
          </div>
          <ButtonLink href={v.href} variant="outline" size="sm" className="self-start md:self-auto">
            Ver todos <IconArrowRight size={16} />
          </ButtonLink>
        </div>
        {v.productos.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-line py-12 text-center text-muted">
            Pronto publicaremos modelos en esta línea. Escríbenos y te cotizamos.
          </p>
        ) : (
          <div className={cn("mt-8 grid gap-5 sm:grid-cols-2", v.id === "celulares" ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {v.productos.map((p, i) =>
              p.categoria === "CELULAR" ? <CelularCard key={p.id} producto={p} /> : <VehiculoCard key={p.id} producto={p} priority={i === 0} />,
            )}
          </div>
        )}
      </div>
    </div>
  );
}
