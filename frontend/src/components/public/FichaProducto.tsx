import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconWhatsApp } from "@/components/icons";
import { hrefProducto, lineaDe, type Producto } from "@/lib/catalogo";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { ProductoCard } from "./ProductoCard";
import { ProductoImagen, sobreNegro } from "./ProductoImagen";

/** Lo que incluye la compra según la línea (lo mismo que ya informaba la web anterior). */
const incluye: Record<string, string[]> = {
  motos: ["Unidad nueva, 0 km", "Tarjeta de propiedad y placas", "Te acompañamos con la instalación del GPS"],
  mototaxis: ["Unidad nueva, 0 km", "Tarjeta de propiedad y placas", "Te acompañamos con la instalación del GPS"],
  celulares: ["Equipo nuevo", "Garantía del fabricante"],
};

/** Ficha pública de un producto: fotos, descripción, características y contacto por WhatsApp. */
export function FichaProducto({ producto, relacionados }: { producto: Producto; relacionados: Producto[] }) {
  const linea = lineaDe(producto);
  const [portada, ...galeria] = producto.imagenes;
  const specs = Object.entries(producto.specs).filter(([, v]) => v);

  return (
    <main>
      <section className="noche relative isolate overflow-hidden">
        <div className="container pt-6 pb-16 md:pb-24">
          <nav aria-label="Ruta" className="text-sm text-white/55">
            <Link href="/catalogo" className="transition-colors hover:text-white">Catálogo</Link>
            <span className="mx-2">/</span>
            <Link href={`/catalogo?linea=${linea.id}`} className="transition-colors hover:text-white">{linea.nombre}</Link>
          </nav>

          <div className="mt-8 grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div className="entrada relative mx-auto aspect-square w-full max-w-[540px]">
              <div aria-hidden className="absolute inset-[10%] rounded-full bg-electrico/30 blur-[70px]" />
              <div aria-hidden className="anillo absolute inset-[3%] [--grosor:2px]" />
              <div aria-hidden className="girar-lento absolute inset-0">
                <span className="absolute top-[2.4%] left-1/2 size-2 -translate-x-1/2 rounded-full bg-oro-claro shadow-[0_0_14px_3px_rgba(246,213,138,0.6)]" />
              </div>
              <div className="placa absolute inset-[7%] overflow-hidden rounded-full">
                <div className={`absolute inset-[8%] ${portada && sobreNegro(portada.url) ? "mix-blend-lighten" : ""}`}>
                  <ProductoImagen producto={producto} imagen={portada} priority sizes="(max-width: 768px) 80vw, 480px" />
                </div>
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-noche via-noche/70 to-transparent" />
              </div>
            </div>

            <div className="entrada" style={{ "--retraso": "150ms" } as React.CSSProperties}>
              <p className="text-sm font-medium text-oro-claro">{producto.marca}</p>
              <h1 className="display mt-3 text-[2.5rem] text-white md:text-[3.4rem]">{producto.modelo}</h1>
              {producto.descripcion && <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-white/70">{producto.descripcion}</p>}

              <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-white/10 pt-6">
                <div>
                  <div className="text-sm text-white/55">Precio referencial</div>
                  <div className="display-sm mt-1 text-[2rem] text-white tabular">{formatSoles(producto.precio)}</div>
                </div>
                <div className="pb-1 text-sm text-white/65">
                  {producto.stock > 0 ? (
                    <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-oro" /> Entrega inmediata</span>
                  ) : (
                    "Consulta disponibilidad"
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href={whatsappLink(whatsappMessages.producto(producto.nombre))} target="_blank" rel="noopener noreferrer" className="btn-oro">
                  <IconWhatsApp size={18} /> Consultar por este modelo
                </a>
                <Link href={`/catalogo?linea=${linea.id}`} className="btn-claro">Ver más {linea.nombre.toLowerCase()}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-niebla py-16 md:py-24">
        <div className="container grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-14">
          <div>
            <h2 className="display-sm text-[1.7rem] text-tinta">Características</h2>
            {specs.length > 0 ? (
              <dl className="mt-6 divide-y divide-tinta/10 overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-tinta/[0.06]">
                {specs.map(([clave, valor]) => (
                  <div key={clave} className="grid grid-cols-[1fr_1.3fr] gap-4 px-6 py-4">
                    <dt className="text-pizarra">{clave}</dt>
                    <dd className="font-semibold text-tinta">{valor}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-pizarra">Pídele la ficha técnica completa a un asesor por WhatsApp.</p>
            )}
            {producto.etiquetas.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {producto.etiquetas.map((e) => (
                  <li key={e} className="rounded-full border border-tinta/15 px-3.5 py-1.5 text-sm text-pizarra">{e}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="h-fit rounded-[1.75rem] bg-noche p-7 text-white md:p-8">
            <h2 className="display-sm text-[1.35rem] text-white">Qué incluye</h2>
            <ul className="mt-5 flex flex-col gap-3.5">
              {(incluye[linea.id] ?? []).map((t) => (
                <li key={t} className="flex gap-3 text-white/80">
                  <IconCheck size={18} strokeWidth={2.6} className="mt-0.5 shrink-0 text-oro" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-white/50">El precio es referencial y puede variar según disponibilidad.</p>
          </div>
        </div>

        {galeria.length > 0 && (
          <div className="container mt-16">
            <h2 className="display-sm text-[1.7rem] text-tinta">Galería</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {galeria.map((img) => (
                <div key={img.url} className="group relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-white">
                  <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 45vw, 280px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {relacionados.length > 0 && (
        <section className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-[2rem] text-tinta md:text-[2.6rem]">También te puede interesar</h2>
              <Link href={`/catalogo?linea=${linea.id}`} className="hidden items-center gap-2 font-semibold text-tinta hover:text-oro-oscuro md:inline-flex">
                Ver {linea.nombre.toLowerCase()} <IconArrowRight size={18} />
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((p, i) => (
                <ProductoCard key={p.id} producto={p} indice={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/** Metadatos SEO comunes de las fichas. */
export function metadataProducto(producto: Producto) {
  const title = producto.nombre;
  const description = `${producto.nombre} en Inversiones JP. ${producto.descripcion ?? ""}`.trim();
  const imagen = producto.imagenes[0];
  return {
    title,
    description,
    openGraph: { title, description, images: imagen ? [{ url: imagen.url, alt: imagen.alt }] : undefined },
    alternates: { canonical: hrefProducto(producto) },
  };
}

/** Datos estructurados (schema.org Product) para buscadores. */
export function JsonLdProducto({ producto, url }: { producto: Producto; url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    brand: { "@type": "Brand", name: producto.marca },
    description: producto.descripcion ?? undefined,
    image: producto.imagenes.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "PEN",
      price: producto.precio.toFixed(2),
      url,
      availability: producto.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
