import type { Metadata } from "next";
import { IconClock, IconShield, IconWhatsApp } from "@/components/icons";
import { FRECUENCIAS_PRESTAMO, SERVICIOS, type Servicio } from "@/schemas/solicitudCredito";
import { FormularioCredito, type ValoresIniciales } from "./FormularioCredito";

export const metadata: Metadata = {
  title: "Solicita tu crédito",
  description:
    "Solicita tu préstamo en efectivo, crédito vehicular o celular en cuotas. Un asesor te contactará por WhatsApp en menos de 24 horas.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const garantias = [
  { Icon: IconClock, texto: "Respuesta en menos de 24 horas" },
  { Icon: IconShield, texto: "Tus datos protegidos (Ley 29733)" },
  { Icon: IconWhatsApp, texto: "Seguimiento por WhatsApp" },
];

export default async function FinanciamientoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Compatibilidad con enlaces antiguos: /financiamiento?modelo=Navi → crédito vehicular
  const servicio = first(sp.servicio) as Servicio;
  const producto = (first(sp.producto) || first(sp.modelo)).slice(0, 80);
  const monto = first(sp.monto);
  const frecuencia = first(sp.frecuencia) as (typeof FRECUENCIAS_PRESTAMO)[number];

  const inicial: ValoresIniciales = {
    servicio: SERVICIOS.includes(servicio) ? servicio : first(sp.modelo) ? "CREDITO_VEHICULAR" : undefined,
    producto,
    monto: /^\d{1,6}$/.test(monto) ? monto : undefined,
    frecuencia: FRECUENCIAS_PRESTAMO.includes(frecuencia) ? frecuencia : undefined,
  };

  return (
    <main className="pb-20">
      <section className="border-b border-line-soft bg-surface">
        <div className="container py-10 md:py-14">
          <span className="eyebrow">Solicitud de evaluación</span>
          <h1 className="mt-3 text-[2.1rem] md:text-[2.8rem]">Solicita tu crédito en 3 minutos</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Completa tus datos y un asesor evaluará tu solicitud. Es gratis y no te compromete a nada.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            {garantias.map(({ Icon, texto }) => (
              <li key={texto} className="flex items-center gap-2">
                <Icon size={16} className="text-accent" /> {texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container mt-8 max-w-[860px]">
        <FormularioCredito inicial={inicial} />
      </div>
    </main>
  );
}
