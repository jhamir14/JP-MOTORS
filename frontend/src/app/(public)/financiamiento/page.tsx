import type { Metadata } from "next";
import { IconClock, IconShield, IconWhatsApp } from "@/components/icons";
import { PageHero } from "@/components/public/PageHero";
import { SERVICIOS, type Servicio } from "@/schemas/solicitudCredito";
import { FormularioCredito, type ValoresIniciales } from "./FormularioCredito";

export const metadata: Metadata = {
  title: "Solicita tu crédito",
  description:
    "Solicita el financiamiento de tu moto, mototaxi o celular en cuotas. Un asesor te contactará por WhatsApp en menos de 24 horas.",
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
  const cuotaInicial = first(sp.inicial);

  const inicial: ValoresIniciales = {
    servicio: SERVICIOS.includes(servicio) ? servicio : first(sp.modelo) ? "CREDITO_VEHICULAR" : undefined,
    producto,
    inicial: /^\d{1,6}(\.\d{1,2})?$/.test(cuotaInicial) && Number(cuotaInicial) > 0 ? cuotaInicial : undefined,
  };

  return (
    <main className="pb-20">
      <PageHero
        eyebrow="Solicitud de evaluación"
        title="Solicita tu crédito en 3 minutos"
        imagen="/financing_worker.webp"
        alt="Cliente con las llaves de su moto"
        posicion="center 20%"
      >
        <p>Completa tus datos y un asesor evaluará tu solicitud. Es gratis y no te compromete a nada.</p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white">
          {garantias.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-center gap-2">
              <Icon size={16} className="text-[#7ff0c4]" /> {texto}
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container mt-8 max-w-[860px]">
        <FormularioCredito inicial={inicial} />
      </div>
    </main>
  );
}
