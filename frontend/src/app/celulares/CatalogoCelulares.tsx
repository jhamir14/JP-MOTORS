"use client";
import { useMemo, useState } from "react";
import { CelularCard } from "@/components/public/CelularCard";
import { GAMAS, MARCAS_CELULAR, type Celular } from "@/data/celulares";
import { cn } from "@/lib/cn";

const chip = (activo: boolean) =>
  cn(
    "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
    activo ? "border-brand bg-brand text-white" : "border-line bg-surface text-fg hover:border-brand",
  );

export function CatalogoCelulares({ celulares }: { celulares: Celular[] }) {
  const [marca, setMarca] = useState<string>("Todas");
  const [gama, setGama] = useState<string>("Todas");

  const lista = useMemo(
    () =>
      celulares
        .filter((c) => (marca === "Todas" || c.marca === marca) && (gama === "Todas" || c.gama === gama))
        .sort((a, b) => Number(b.destacado) - Number(a.destacado) || a.precio - b.precio),
    [celulares, marca, gama],
  );

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Marca">
          <span className="mr-1 text-sm font-semibold text-muted">Marca</span>
          {["Todas", ...MARCAS_CELULAR].map((m) => (
            <button key={m} type="button" aria-pressed={marca === m} onClick={() => setMarca(m)} className={chip(marca === m)}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Gama">
          <span className="mr-1 text-sm font-semibold text-muted">Gama</span>
          {["Todas", ...GAMAS].map((g) => (
            <button key={g} type="button" aria-pressed={gama === g} onClick={() => setGama(g)} className={chip(gama === g)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {lista.length} {lista.length === 1 ? "modelo" : "modelos"}
      </p>
      {lista.length === 0 ? (
        <p className="py-16 text-center text-muted">No hay modelos con esos filtros. Prueba con otra marca o gama.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {lista.map((c) => (
            <CelularCard key={c.slug} celular={c} />
          ))}
        </div>
      )}
    </>
  );
}
