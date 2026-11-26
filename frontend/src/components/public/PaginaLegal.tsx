import type { ReactNode } from "react";

/** Plantilla de las páginas legales (texto largo con secciones numeradas). */
export function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: ReactNode }) {
  return (
    <main className="pb-20">
      <section className="noche">
        <div className="container max-w-[820px] pt-10 pb-14 md:pt-14 md:pb-20">
          <p className="text-sm font-medium text-oro-claro">Información legal</p>
          <h1 className="display mt-4 text-[2.2rem] text-white md:text-[3rem]">{titulo}</h1>
          <p className="mt-3 text-sm text-white/55">Última actualización: {actualizado}</p>
        </div>
      </section>
      <article className="container mt-10 max-w-[820px] [&_h2]:mt-10 [&_h2]:text-xl [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted">
        {children}
      </article>
    </main>
  );
}
