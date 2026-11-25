import type { Metadata } from "next";
import { FormularioCredito } from "./FormularioCredito";

export const metadata: Metadata = {
  title: "Solicita tu crédito",
  description: "Completa tu solicitud de financiamiento y un asesor te contactará por WhatsApp para evaluar tu crédito.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinanciamientoPage({ searchParams }: { searchParams: SearchParams }) {
  const { modelo } = await searchParams;

  return (
    <main className="min-h-screen bg-bg pb-20">
      <section className="mb-10 border-b border-line-soft bg-surface pt-15 pb-10 text-center">
        <div className="container">
          <h1 className="mb-4 text-5xl font-black uppercase">
            Formulario de <span className="text-accent [-webkit-text-fill-color:currentColor]">financiamiento</span>
          </h1>
          <p className="mx-auto max-w-[600px] text-lg">
            Completa tus datos reales y descubre la cuota perfecta para llevarte tu moto hoy mismo.
          </p>
        </div>
      </section>

      <div className="container max-w-[800px]">
        <FormularioCredito modeloInicial={typeof modelo === "string" ? modelo.slice(0, 60) : ""} />
      </div>
    </main>
  );
}
