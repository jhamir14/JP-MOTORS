import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/public/PaginaLegal";
import { siteConfig } from "@/lib/config";

// Redactados conforme al Código de Protección y Defensa del Consumidor (Ley 29571). Las condiciones particulares de cada
// financiamiento constan en el contrato y el cronograma que firma el cliente.
export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones de uso del sitio web y del financiamiento de motos, mototaxis y celulares de ${siteConfig.name}.`,
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones" actualizado="25 de noviembre de 2026">
      <p>
        Estos términos regulan el uso de este sitio web y las condiciones generales del financiamiento que ofrece{" "}
        {siteConfig.legalName} (nombre comercial «{siteConfig.name}»), con RUC {siteConfig.ruc} y domicilio en{" "}
        {siteConfig.address.lines.join(", ")}. Al usar el sitio o enviar una solicitud, aceptas estos términos.
      </p>

      <h2>1. Qué ofrecemos</h2>
      <p>
        {siteConfig.name} vende y financia directamente <strong>motos lineales, mototaxis (trimóviles) y celulares</strong>.
        <strong>No otorgamos préstamos de dinero en efectivo</strong>. No somos una entidad del sistema
        financiero: el financiamiento es un crédito directo por la compra del producto.
      </p>

      <h2>2. Productos, precios e imágenes</h2>
      <p>
        Los precios se expresan en soles e incluyen IGV. Las imágenes son referenciales y los colores pueden variar. La disponibilidad
        de cada modelo se confirma al momento de la evaluación; publicar un producto no garantiza que haya stock.
      </p>

      <h2>3. Simulaciones y planes de crédito</h2>
      <p>
        Las cuotas, tasas y la TEA que muestran los simuladores y los planes publicados son referenciales. Antes de firmar te informamos
        por escrito las condiciones definitivas: precio, cuota inicial, monto financiado, tasa, número y monto de cuotas, frecuencia,
        penalidad por atraso y el costo total. Esas condiciones constan en tu contrato y en tu cronograma de pagos.
      </p>

      <h2>4. Solicitud y evaluación</h2>
      <p>
        Enviar una solicitud es gratis y no obliga a ninguna de las partes. Para evaluarte podemos pedirte tu DNI, un recibo de servicios,
        fotos de tu domicilio, su ubicación y, en el crédito vehicular, un garante. {siteConfig.name} puede aprobar, modificar o denegar
        una solicitud según su evaluación. Debes ser mayor de 18 años y entregar información verdadera.
      </p>

      <h2>5. Cronograma de pagos</h2>
      <ul>
        <li>Las cuotas pueden ser diarias, semanales, quincenales o mensuales, según el producto y lo pactado.</li>
        <li>
          <strong>Los domingos y los feriados nacionales no se cobran.</strong> El cronograma los excluye: si una fecha de pago cae en
          domingo o feriado, la cuota vence el siguiente día hábil.
        </li>
        <li>Recibirás tu cronograma al firmar el contrato. Puedes pedir una copia actualizada en cualquier momento.</li>
      </ul>

      <h2>6. Pagos y recordatorios</h2>
      <p>
        Los pagos se hacen en las fechas del cronograma solo por los medios autorizados: efectivo contra entrega de recibo, Yape, Plin o
        transferencia a las cuentas de la empresa. Te enviaremos recordatorios de pago y avisos de tu crédito por WhatsApp al número que
        nos indicaste; mantenlo actualizado. {siteConfig.name} nunca te pedirá pagos a cuentas de terceros.
      </p>

      <h2>7. Atrasos</h2>
      <p>
        Si una cuota no se paga en su fecha, se aplica la penalidad por atraso pactada en el contrato. Además, según lo previsto en el
        contrato, podremos activar el corte de encendido del GPS del vehículo o el bloqueo del celular financiado hasta que regularices
        el pago; estas medidas se levantan al ponerte al día. La información de tus pagos se usa para tu historial interno con
        {" "}{siteConfig.name}.
      </p>

      <h2>8. Pago anticipado</h2>
      <p>
        Puedes adelantar cuotas o cancelar tu crédito antes de su vencimiento en cualquier momento, sin penalidades, con la reducción de
        los intereses que correspondan a los días no transcurridos.
      </p>

      <h2>9. Propiedad del bien y garantías</h2>
      <p>
        Cuando el contrato lo establezca, la propiedad del vehículo o equipo se transfiere al cliente al cancelar el total del
        financiamiento. El garante responde por las obligaciones del cliente en los términos del contrato.
      </p>

      <h2>10. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra{" "}
        <Link href="/privacidad" className="font-semibold text-brand">política de privacidad</Link>.
      </p>

      <h2>11. Uso del sitio</h2>
      <p>
        Los textos, logotipos e imágenes del sitio pertenecen a {siteConfig.name} o a sus titulares y no pueden usarse sin autorización.
        No está permitido usar el sitio para enviar información falsa ni intentar acceder a áreas restringidas.
      </p>

      <h2>12. Reclamos</h2>
      <p>
        Puedes presentar un reclamo o queja en nuestro{" "}
        <Link href="/libro-reclamaciones" className="font-semibold text-brand">Libro de Reclamaciones virtual</Link>. Te responderemos en un
        plazo máximo de 15 días hábiles. También puedes acudir al Indecopi.
      </p>

      <h2>13. Ley aplicable y cambios</h2>
      <p>
        Estos términos se rigen por las leyes del Perú. Podemos actualizarlos publicando la nueva versión en esta página; los cambios no
        afectan los contratos ya firmados.
      </p>
    </PaginaLegal>
  );
}
