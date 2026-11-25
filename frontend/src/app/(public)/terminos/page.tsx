import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/public/PaginaLegal";
import { siteConfig } from "@/lib/config";

// Texto base: debe validarlo el área legal antes de salir a producción (ver docs/PLAN_ACTUALIZACION_V2.md §1.4).
export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones de uso del sitio web y de las simulaciones de crédito de ${siteConfig.name}.`,
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones de uso" actualizado="25 de noviembre de 2026">
      <p>
        Al usar este sitio web aceptas estos términos. El sitio es operado por {siteConfig.legalName}
        {siteConfig.ruc ? ` (RUC ${siteConfig.ruc})` : ""}, con domicilio en {siteConfig.address.lines.join(", ")}.
      </p>

      <h2>1. Información de productos y precios</h2>
      <p>
        Los precios se expresan en soles e incluyen IGV. Las imágenes son referenciales. La disponibilidad de cada modelo se
        confirma al momento de la evaluación.
      </p>

      <h2>2. Simulaciones y planes de crédito</h2>
      <p>
        Las cuotas, tasas y la TEA que muestran los simuladores y los planes publicados son referenciales. Las condiciones
        definitivas (tasa, inicial, plazo, cuota, penalidad por atraso y costo efectivo) se informan antes de firmar y constan en
        el contrato y en el cronograma de pagos que recibes.
      </p>

      <h2>3. Solicitudes de evaluación</h2>
      <p>
        Enviar una solicitud no genera obligación de contratar para ninguna de las partes. {siteConfig.name} puede aprobar,
        modificar o denegar una solicitud según su evaluación crediticia.
      </p>

      <h2>4. Pagos y atrasos</h2>
      <p>
        Los pagos se realizan en las fechas del cronograma por los medios autorizados (efectivo con recibo, Yape, Plin o
        transferencia a cuentas de la empresa). Los atrasos generan la penalidad pactada en el contrato. Puedes adelantar
        cuotas o cancelar tu crédito en cualquier momento.
      </p>

      <h2>5. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra <Link href="/privacidad" className="font-semibold text-brand">política de privacidad</Link>.
      </p>

      <h2>6. Reclamos</h2>
      <p>
        Puedes presentar un reclamo o queja en nuestro <Link href="/libro-reclamaciones" className="font-semibold text-brand">Libro de Reclamaciones virtual</Link>.
      </p>
    </PaginaLegal>
  );
}
