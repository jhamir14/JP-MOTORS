"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { formatSoles } from "@/lib/format";

interface Props {
  categorias: readonly string[];
  precioMaximo: number;
}

const label = "mb-3 block text-[0.8rem] font-bold uppercase";
const PRECIO_MIN = 3000;

/**
 * Buscador del hero. Es un <form method="get"> a /motos: funciona incluso sin JavaScript
 * y deja la búsqueda en la URL (compartible y medible en GA).
 */
export function HeroSearch({ categorias, precioMaximo }: Props) {
  const [precio, setPrecio] = useState(precioMaximo);

  return (
    <div className="mx-auto hidden max-w-[1000px] grid-cols-2 gap-12 rounded-xl border border-white/10 bg-[rgba(15,17,21,0.4)] px-5 py-10 backdrop-blur-md md:grid">
      <form action="/motos" method="get">
        <h3 className="mb-6 text-[0.9rem] font-bold uppercase tracking-[1px]">Completa los filtros y encuentra tu moto ideal</h3>

        <div className="mb-6">
          <label htmlFor="hero-precio" className={label}>
            Precio máximo: <span className="text-accent">{precio >= precioMaximo ? "Sin límite" : formatSoles(precio)}</span>
          </label>
          <input
            id="hero-precio"
            type="range"
            name={precio >= precioMaximo ? undefined : "precioMax"}
            min={PRECIO_MIN}
            max={precioMaximo}
            step={500}
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            className="mb-2 w-full accent-accent"
          />
          <div className="flex justify-between text-xs font-bold text-muted">
            <span>{formatSoles(PRECIO_MIN)}</span>
            <span>{formatSoles(precioMaximo)}+</span>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="hero-categoria" className={label}>Tipo de moto</label>
          <select
            id="hero-categoria"
            name="categoria"
            defaultValue=""
            className="w-full cursor-pointer rounded border border-white/20 bg-transparent px-4 py-3 text-base text-white"
          >
            <option value="">Sin preferencia</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Button type="submit" block className="font-black">Buscar motos</Button>
      </form>

      <div className="flex flex-col justify-between">
        <form action="/motos" method="get">
          <label htmlFor="hero-q" className="mb-4 block text-[0.9rem] font-bold uppercase tracking-[1px]">
            ¿Tienes una moto en mente? Búscala aquí.
          </label>
          <div className="relative">
            <IconSearch size={20} strokeWidth={3} className="absolute top-1/2 left-4 -translate-y-1/2 text-black" />
            <input
              id="hero-q"
              type="search"
              name="q"
              placeholder="Escribe modelo, marca o tipo de moto"
              className="w-full rounded border-none bg-white py-4 pr-4 pl-12 font-bold text-black outline-none"
            />
          </div>
        </form>

        <div className="mt-10">
          <h3 className="mb-4 text-[0.9rem] font-bold uppercase tracking-[1px]">Mira todos los modelos</h3>
          <ButtonLink href="/motos" variant="outline" block className="justify-between rounded">
            Ver catálogo completo <IconArrowRight size={20} />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
