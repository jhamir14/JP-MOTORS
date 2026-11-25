"use client";

/** Imprime la página (o la guarda como PDF desde el diálogo del navegador). */
export function BotonImprimir({ children = "Imprimir cronograma" }: { children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-brand print:hidden">
      {children}
    </button>
  );
}
