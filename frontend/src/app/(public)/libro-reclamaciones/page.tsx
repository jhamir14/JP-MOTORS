import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { FormularioReclamo } from "./FormularioReclamo";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones",
  description: `Libro de Reclamaciones virtual de ${siteConfig.legalName}. Registra tu reclamo o queja y recibe respuesta en un máximo de 15 días hábiles.`,
  alternates: { canonical: "/libro-reclamaciones" },
};

export default function LibroReclamacionesPage() {
  return (
    <main className="pb-20">
      <section className="border-b border-line-soft bg-surface">
        <div className="container max-w-[900px] py-10 md:py-14">
          <span className="eyebrow">Libro de Reclamaciones</span>
          <h1 className="mt-3 text-[2.1rem] md:text-[2.6rem]">Hoja de reclamación virtual</h1>
          <p className="mt-3 text-muted">
            Conforme al Código de Protección y Defensa del Consumidor (Ley 29571), ponemos a tu disposición este Libro de
            Reclamaciones. Al enviarlo recibirás un código de seguimiento y te responderemos en un plazo máximo de 15 días hábiles.
          </p>
          <dl className="mt-6 grid gap-3 rounded-2xl border border-line-soft bg-surface-2 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Razón social</dt>
              <dd className="font-semibold">{siteConfig.legalName}</dd>
            </div>
            <div>
              <dt className="text-muted">RUC</dt>
              <dd className="font-semibold tabular">{siteConfig.ruc || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Domicilio</dt>
              <dd className="font-semibold">{siteConfig.address.lines.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="container mt-8 max-w-[900px]">
        <FormularioReclamo />
        <p className="mt-6 text-xs text-muted">
          La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para
          interponer una denuncia ante el INDECOPI. El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15)
          días hábiles.
        </p>
      </div>
    </main>
  );
}
