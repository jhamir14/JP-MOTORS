import type { ReactNode } from "react";

/** Plantilla de las páginas legales (texto largo con secciones numeradas). */
export function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: ReactNode }) {
  return (
    <main className="pb-20">
      <section className="border-b border-line-soft bg-surface">
        <div className="container max-w-[820px] py-10 md:py-14">
          <span className="eyebrow">Información legal</span>
          <h1 className="mt-3 text-[2.1rem] md:text-[2.6rem]">{titulo}</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: {actualizado}</p>
        </div>
      </section>
      <article className="container mt-10 max-w-[820px] [&_h2]:mt-10 [&_h2]:text-xl [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted">
        {children}
      </article>
    </main>
  );
}
