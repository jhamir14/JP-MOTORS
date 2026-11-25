import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/public/PaginaLegal";
import { siteConfig } from "@/lib/config";

// Texto base preparado según la Ley 29733 y su reglamento (D.S. 016-2024-JUS). Debe validarlo el área legal
// antes de salir a producción (ver docs/PLAN_ACTUALIZACION_V2.md §1.4).
export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${siteConfig.name} trata y protege tus datos personales (Ley 29733).`,
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad y protección de datos personales" actualizado="25 de noviembre de 2026">
      <p>
        {siteConfig.legalName}{siteConfig.ruc ? ` (RUC ${siteConfig.ruc})` : ""}, en adelante «{siteConfig.name}», es responsable del
        tratamiento de los datos personales que nos entregas a través de este sitio web, WhatsApp y nuestras oficinas, conforme a
        la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.
      </p>

      <h2>1. Qué datos recopilamos</h2>
      <ul>
        <li>Identificación: nombres, apellidos, tipo y número de documento, fecha de nacimiento y estado civil.</li>
        <li>Contacto: celular, correo electrónico y domicilio.</li>
        <li>Información socioeconómica: actividad, ingresos aproximados y datos del producto o crédito que solicitas.</li>
        <li>Si contratas un crédito: copia de tu DNI, recibo de servicios, datos de tu garante y ubicación del domicilio.</li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Evaluar tu solicitud de crédito o préstamo y contactarte sobre ella.</li>
        <li>Ejecutar el contrato: cronogramas, cobranza, recordatorios de pago y constancias.</li>
        <li>Atender reclamos y quejas del Libro de Reclamaciones.</li>
        <li>Cumplir obligaciones legales, contables y de prevención de lavado de activos.</li>
      </ul>
      <p>Solo con tu consentimiento adicional usaremos tus datos para enviarte ofertas comerciales. Puedes retirarlo en cualquier momento.</p>

      <h2>3. Con quién los compartimos</h2>
      <p>
        No vendemos tus datos. Podemos compartirlos con proveedores que nos prestan servicios (alojamiento web, base de datos,
        mensajería, GPS o plataformas de bloqueo de equipos financiados) bajo obligaciones de confidencialidad, y con autoridades
        cuando la ley lo exija. Algunos proveedores pueden estar fuera del Perú (flujo transfronterizo).
      </p>

      <h2>4. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras dure la relación contractual y, luego, por el plazo que exijan las normas tributarias, comerciales y de
        prevención de lavado de activos. Las solicitudes no concretadas se conservan como máximo 12 meses.
      </p>

      <h2>5. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas: conexiones cifradas, acceso restringido por roles al panel interno,
        registro de auditoría de los cambios y almacenamiento privado de documentos.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición e información escribiendo a{" "}
        <a href={`mailto:${siteConfig.emailContacto}`} className="font-semibold text-brand">{siteConfig.emailContacto}</a> con
        copia de tu documento de identidad. Si no quedas conforme con la respuesta, puedes acudir a la Autoridad Nacional de
        Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.
      </p>

      <h2>7. Cambios a esta política</h2>
      <p>
        Publicaremos cualquier cambio en esta página. Consulta también nuestros <Link href="/terminos" className="font-semibold text-brand">términos y condiciones</Link>.
      </p>
    </PaginaLegal>
  );
}
