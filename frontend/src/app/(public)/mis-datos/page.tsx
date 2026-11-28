import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/public/PaginaLegal";
import { siteConfig } from "@/lib/config";
import { whatsappLink } from "@/lib/whatsapp";

// Vía simple para ejercer los derechos ARCO (Ley 29733): eliminación, acceso, rectificación y oposición.
// El pedido llega por correo o WhatsApp con un texto ya armado; no se guarda nada nuevo en la web.
export const metadata: Metadata = {
  title: "Eliminar o consultar mis datos",
  description: `Pide a ${siteConfig.name} que elimine, corrija o te muestre tus datos personales (Ley 29733).`,
  alternates: { canonical: "/mis-datos" },
};

const asunto = "Solicitud de eliminación de datos personales (Ley 29733)";
const cuerpo = [
  `Hola, ${siteConfig.name}:`,
  "",
  "Solicito la eliminación (cancelación) de mis datos personales de sus registros.",
  "",
  "Nombres y apellidos: ",
  "Tipo y número de documento: ",
  "Celular o correo con el que me registré: ",
  "Detalle (opcional, p. ej. solo la solicitud de cotización del …): ",
  "",
  "Adjunto una foto de mi documento de identidad para acreditar que soy el titular.",
].join("\n");

const mailto = `mailto:${siteConfig.emailContacto}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
const whatsapp = whatsappLink(
  `Hola, quiero que eliminen mis datos personales de sus registros (Ley 29733). Mi nombre es … y mi documento es … . Les envío una foto de mi DNI para confirmar que soy el titular.`,
);

export default function MisDatosPage() {
  return (
    <PaginaLegal titulo="Eliminar o consultar mis datos" actualizado="28 de noviembre de 2026">
      <p>
        Puedes pedirnos en cualquier momento que <strong>eliminemos</strong> tus datos personales, que te digamos qué datos tenemos, que
        los corrijamos o que dejemos de usarlos para algún fin. Es gratis.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a
          href={mailto}
          className="inline-flex items-center justify-center rounded-full bg-[#0b1530] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Pedir por correo
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-black/15 px-6 py-3 font-semibold text-tinta transition-colors hover:bg-black/5"
        >
          Pedir por WhatsApp
        </a>
      </div>
      <p>
        Los botones abren un mensaje ya redactado a {siteConfig.emailContacto} o al WhatsApp {siteConfig.telefonoVisible}. Solo
        completa tus datos y adjunta una foto de tu documento de identidad.
      </p>

      <h2>Qué necesitamos</h2>
      <ul>
        <li>Tus nombres, apellidos y número de documento.</li>
        <li>El celular o correo con el que nos escribiste o enviaste la solicitud.</li>
        <li>Una foto de tu documento de identidad, para confirmar que eres el titular (nadie más puede pedir que se borren tus datos).</li>
        <li>Si actúas por otra persona, el poder o documento que te autoriza.</li>
      </ul>

      <h2>Qué pasa después</h2>
      <ul>
        <li>Te confirmamos que recibimos el pedido y te respondemos dentro de los plazos que fija la Ley N.° 29733 y su reglamento.</li>
        <li>
          Eliminamos tus solicitudes, cotizaciones y datos de contacto. Si tienes un crédito vigente, o si la ley nos obliga a guardar
          algún dato (por ejemplo, comprobantes, contratos o una hoja del Libro de Reclamaciones), lo conservamos bloqueado solo por el
          plazo legal y te lo explicamos en la respuesta.
        </li>
        <li>
          Si no estás conforme con la respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio
          de Justicia y Derechos Humanos.
        </li>
      </ul>

      <h2>Otros pedidos</h2>
      <p>
        Con los mismos datos puedes pedir acceso a tu información, corregirla o retirar tu autorización para recibir promociones. Más
        detalle en nuestra <Link href="/privacidad#derechos" className="font-semibold text-brand">política de privacidad</Link>.
      </p>
    </PaginaLegal>
  );
}
