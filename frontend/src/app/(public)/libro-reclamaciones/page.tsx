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
      <section className="noche">
        <div className="container max-w-[900px] pt-10 pb-14 md:pt-14 md:pb-20">
          <p className="text-sm font-medium text-oro-claro">Libro de Reclamaciones</p>
          <h1 className="display mt-4 text-[2.2rem] text-white md:text-[3rem]">Hoja de reclamación virtual</h1>
          <p className="mt-4 text-white/70">
            Conforme al Código de Protección y Defensa del Consumidor (Ley 29571), ponemos a tu disposición este Libro de
            Reclamaciones. Al enviarlo recibirás un código de seguimiento y te responderemos en un plazo máximo de 15 días hábiles.
          </p>
          <dl className="mt-8 grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-sm text-white sm:grid-cols-3">
            <div>
              <dt className="text-white/55">Razón social</dt>
              <dd className="font-semibold">{siteConfig.legalName}</dd>
            </div>
            <div>
              <dt className="text-white/55">RUC</dt>
              <dd className="font-semibold tabular">{siteConfig.ruc || "—"}</dd>
            </div>
            <div>
              <dt className="text-white/55">Domicilio</dt>
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
