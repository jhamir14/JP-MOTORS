import { siteConfig } from "@/lib/config";

/**
 * Datos estructurados de la empresa (schema.org) para que Google reconozca la marca
 * «Inversiones JP», su logo, teléfono y ubicación, y muestre el nombre del sitio en los resultados.
 */
export function JsonLdEmpresa() {
  const url = siteConfig.url.replace(/\/$/, "");
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url: `${url}/`,
        name: siteConfig.name,
        alternateName: ["Inversiones JP Perú", siteConfig.legalName, "JP Motors"],
        inLanguage: "es-PE",
        publisher: { "@id": `${url}/#empresa` },
      },
      {
        "@type": ["Store", "Organization"],
        "@id": `${url}/#empresa`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        alternateName: ["Inversiones JP Perú", "JP Motors"],
        url: `${url}/`,
        logo: `${url}/marca/logo-inversiones-jp.png`,
        image: `${url}/marca/logo-inversiones-jp.png`,
        description: siteConfig.description,
        email: siteConfig.emailContacto,
        telephone: `+${siteConfig.whatsappNumber}`,
        taxID: siteConfig.ruc,
        priceRange: "S/",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Santa Anita",
          addressRegion: "Lima",
          addressCountry: "PE",
        },
        areaServed: { "@type": "Country", name: "Perú" },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "09:00",
          closes: "19:00",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: `+${siteConfig.whatsappNumber}`,
          contactType: "sales",
          availableLanguage: "es",
          areaServed: "PE",
        },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
