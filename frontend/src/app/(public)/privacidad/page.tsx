import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/public/PaginaLegal";
import { siteConfig } from "@/lib/config";

// Redactada conforme a la Ley N.° 29733 y su reglamento (D.S. 016-2024-JUS). Conviene que un abogado la revise
// cuando haya cambios en los proveedores o en el tratamiento de datos.
export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${siteConfig.name} trata y protege tus datos personales (Ley 29733).`,
  alternates: { canonical: "/privacidad" },
};

const correo = <a href={`mailto:${siteConfig.emailContacto}`} className="font-semibold text-brand">{siteConfig.emailContacto}</a>;

export default function PrivacidadPage() {
  return (
    <PaginaLegal titulo="Política de privacidad y protección de datos personales" actualizado="25 de noviembre de 2026">
      <p>
        Esta política explica cómo {siteConfig.legalName} (nombre comercial «{siteConfig.name}»), con RUC {siteConfig.ruc} y domicilio en{" "}
        {siteConfig.address.lines.join(", ")}, trata los datos personales de quienes usan este sitio web, nos escriben por WhatsApp o
        financian un producto con nosotros, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {siteConfig.name} es responsable de los bancos de datos de solicitantes, clientes, garantes y reclamos. Para cualquier consulta
        sobre tus datos puedes escribir a {correo} o al WhatsApp {siteConfig.telefonoVisible}.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li><strong>Identificación:</strong> nombres, apellidos, tipo y número de documento, fecha de nacimiento, sexo y estado civil.</li>
        <li><strong>Contacto:</strong> número de celular (y WhatsApp), correo electrónico y domicilio.</li>
        <li><strong>Información socioeconómica:</strong> ocupación o negocio, ingresos aproximados, tipo de vivienda y producto que deseas financiar.</li>
        <li>
          <strong>Expediente del crédito</strong> (solo si financias un producto): fotos del DNI, recibo de luz o agua, foto de la fachada,
          ubicación GPS del domicilio, datos y DNI del garante, contrato, cronograma y pagos.
        </li>
        <li>
          <strong>Datos del bien financiado:</strong> número de motor, chasis, placa y datos del GPS del vehículo, o IMEI y plataforma de
          bloqueo del celular.
        </li>
        <li><strong>Navegación:</strong> datos estadísticos de uso del sitio mediante Google Analytics (ver punto 9).</li>
      </ul>
      <p>No solicitamos datos sensibles distintos de los necesarios para evaluar y administrar el financiamiento.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Evaluar tu solicitud de financiamiento y contactarte sobre ella.</li>
        <li>Responder las cotizaciones que haces en el cotizador de la web, por WhatsApp o por correo, y enviarte una copia de tu cotización.</li>
        <li>Celebrar y ejecutar el contrato: entrega del producto, cronograma de pagos, registro de pagos y constancias.</li>
        <li>
          Enviarte <strong>recordatorios de pago y avisos de tu crédito por WhatsApp</strong> o llamada al número que nos proporcionaste.
        </li>
        <li>Gestionar la cobranza, incluidas las visitas al domicilio y, si el contrato lo prevé, el uso del GPS o del bloqueo del equipo financiado.</li>
        <li>Atender las hojas del Libro de Reclamaciones.</li>
        <li>Cumplir obligaciones legales, tributarias y contables, y atender requerimientos de autoridades.</li>
      </ul>
      <p>
        Usaremos tus datos para enviarte ofertas o promociones solo si nos das un consentimiento adicional, que puedes retirar en
        cualquier momento respondiendo «BAJA» por WhatsApp o escribiendo a {correo}.
      </p>

      <h2>4. Base legal</h2>
      <p>
        Tratamos tus datos con tu consentimiento (que otorgas al enviar una solicitud o firmar el contrato), porque son necesarios para
        ejecutar el contrato de financiamiento y para cumplir obligaciones legales. Si no nos entregas los datos obligatorios no podremos
        evaluar tu solicitud.
      </p>

      <h2>5. Con quién los compartimos</h2>
      <p>No vendemos ni alquilamos tus datos. Solo los compartimos con:</p>
      <ul>
        <li>Proveedores que nos prestan servicios y actúan por encargo nuestro: alojamiento del sitio web (Vercel), base de datos (Railway), correo electrónico (Hostinger), mensajería (WhatsApp) y analítica web (Google).</li>
        <li>Proveedores de GPS vehicular y de plataformas de bloqueo de equipos, solo para los productos financiados que los incluyan.</li>
        <li>Autoridades judiciales o administrativas, cuando la ley lo exija.</li>
      </ul>
      <p>
        Algunos de estos proveedores almacenan la información en servidores fuera del Perú (principalmente en Estados Unidos). Esta
        transferencia internacional se realiza con proveedores que ofrecen niveles adecuados de seguridad y solo para las finalidades
        indicadas.
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>Solicitudes que no se concretan: hasta 12 meses desde su envío.</li>
        <li>Clientes y garantes: mientras dure el crédito y, luego, durante los plazos que exigen las normas tributarias, comerciales y de defensa ante reclamos.</li>
        <li>Hojas de reclamación: al menos dos años desde su presentación.</li>
      </ul>
      <p>Vencidos esos plazos, los datos se eliminan o se anonimizan.</p>

      <h2>7. Cómo los protegemos</h2>
      <p>
        El sitio usa conexiones cifradas (HTTPS). Los documentos de identidad, recibos y fotos del domicilio se guardan en un almacenamiento
        privado: no tienen enlaces públicos y solo los puede ver el personal autorizado con usuario y contraseña, según su rol. Cada acceso a
        esos documentos y cada cambio en tu ficha queda registrado (quién y cuándo).
      </p>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de información, acceso, rectificación, cancelación, oposición y portabilidad, así como revocar tu
        consentimiento, escribiendo a {correo} con una copia de tu documento de identidad y el detalle de tu pedido. Te responderemos dentro
        de los plazos que fija la ley. La cancelación no procede respecto de los datos que debamos conservar por una obligación legal o
        mientras exista un crédito vigente.
      </p>
      <p>
        Si consideras que no atendimos tu pedido, puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de
        Justicia y Derechos Humanos.
      </p>

      <h2>9. Cookies y analítica</h2>
      <p>
        Usamos Google Analytics para conocer de forma estadística cómo se usa el sitio (páginas visitadas, dispositivo, ciudad aproximada).
        No usamos esa información para identificarte. Puedes bloquear las cookies desde la configuración de tu navegador.
      </p>

      <h2>10. Menores de edad</h2>
      <p>Nuestros productos son solo para mayores de 18 años. No recopilamos a sabiendas datos de menores.</p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Publicaremos cualquier cambio en esta página con su fecha de actualización. Consulta también nuestros{" "}
        <Link href="/terminos" className="font-semibold text-brand">términos y condiciones</Link>.
      </p>
    </PaginaLegal>
  );
}
