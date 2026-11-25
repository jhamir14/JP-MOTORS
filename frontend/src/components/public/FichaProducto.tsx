import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, ExternalButton, buttonClasses } from "@/components/ui";
import { IconCheck, IconWhatsApp } from "@/components/icons";
import { ETIQUETA_CATEGORIA, resultadoPlan, servicioDeProducto, type Producto, type TasaPublica } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { ProductoImagen } from "./ProductoImagen";
import { Simulador } from "./Simulador";

/** Ficha pública de un vehículo o celular: fotos, specs, planes publicados y simulador. */
export function FichaProducto({ producto, tasas, volver }: { producto: Producto; tasas: TasaPublica[]; volver: { href: string; label: string } }) {
  const esCelular = producto.categoria === "CELULAR";
  const servicio = servicioDeProducto(producto);
  const planes = producto.planes
    .map((plan) => ({ plan, r: resultadoPlan(producto, plan) }))
    .filter(({ r }) => r.cuota > 0);
  const inicialSugerida = planes[0]?.plan.cuotaInicial ?? 0;
  const mensaje = esCelular ? whatsappMessages.celular(producto.nombre) : whatsappMessages.moto(producto.nombre);
  const [portada, ...galeria] = producto.imagenes;
  const specs = Object.entries(producto.specs).filter(([, v]) => v);

  return (
    <main>
      <div className="container pt-6">
        <Link href={volver.href} className="text-sm font-medium text-muted hover:text-brand">← {volver.label}</Link>
      </div>

      <section className="container grid items-start gap-8 pt-6 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <div className="flex flex-col gap-6">
          <div className="showcase relative flex h-[300px] items-center justify-center overflow-hidden rounded-3xl md:h-[440px]">
            <Badge tone="dark" className="absolute top-4 left-4 z-[1]">{ETIQUETA_CATEGORIA[producto.categoria]}</Badge>
            {producto.stock > 0 && <Badge tone="accent" className="absolute top-4 right-4 z-[1]">En stock</Badge>}
            <ProductoImagen producto={producto} imagen={portada} priority sizes="(max-width: 768px) 90vw, 620px" className="p-8" />
          </div>

          <div>
            <span className="eyebrow">{producto.marca}</span>
            <h1 className="mt-2 text-[2.2rem] md:text-[2.8rem]">{producto.modelo}</h1>
            {producto.descripcion && <p className="mt-3 text-lg text-muted">{producto.descripcion}</p>}
            {producto.etiquetas.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {producto.etiquetas.map((e) => <Badge key={e} tone="outline">{e}</Badge>)}
              </div>
            )}
          </div>

          {specs.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map(([key, value]) => (
                <div key={key} className="rounded-xl border border-line-soft bg-surface p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{key}</dt>
                  <dd className="mt-1 font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {planes.length > 0 && (
            <div>
              <h2 className="text-[1.5rem]">Planes de crédito</h2>
              <p className="mt-1 text-sm text-muted">Condiciones publicadas para este modelo. Sujetas a evaluación crediticia.</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {planes.map(({ plan, r }) => {
                  const etq = ETIQUETA_FRECUENCIA[plan.frecuencia];
                  return (
                    <li key={plan.id} className="rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
                      <div className="text-sm font-semibold text-muted">{plan.nombre ?? `${plan.numeroCuotas} ${etq.plural}`}</div>
                      <div className="mt-1 text-2xl font-extrabold text-accent tabular">
                        {formatSoles(r.cuota, true)}<span className="text-sm font-semibold text-muted">/{etq.abrev}</span>
                      </div>
                      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                        <li className="flex items-center gap-2"><IconCheck size={14} className="text-accent" strokeWidth={3} />
                          Inicial: <strong className="tabular">{plan.cuotaInicial > 0 ? formatSoles(plan.cuotaInicial) : "sin inicial"}</strong></li>
                        <li className="flex items-center gap-2"><IconCheck size={14} className="text-accent" strokeWidth={3} />
                          {plan.numeroCuotas} cuotas {plan.frecuencia === "DIARIO" ? "diarias" : `${etq.adjetivo}es`}</li>
                        <li className="flex items-center gap-2"><IconCheck size={14} className="text-accent" strokeWidth={3} />
                          Total a pagar: <span className="tabular">{formatSoles(r.totalPagar + plan.cuotaInicial)}</span></li>
                      </ul>
                      <div className="mt-3 text-xs text-muted tabular">TEA {Number.isFinite(r.teaPorcentaje) ? `${r.teaPorcentaje.toFixed(2)}%` : "—"}</div>
                      <ButtonLink
                        href={`/financiamiento?servicio=${servicio}&producto=${encodeURIComponent(producto.nombre)}&inicial=${plan.cuotaInicial}`}
                        size="sm"
                        variant="secondary"
                        className="mt-4 w-full"
                      >
                        Solicitar este plan
                      </ButtonLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5 md:sticky md:top-28">
          <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card">
            <div className="text-sm font-semibold text-muted">Precio al contado</div>
            <div className="mt-1 text-[2.4rem] leading-none font-extrabold tabular">{formatSoles(producto.precio)}</div>
            <div className="mt-1 text-sm text-muted">
              {esCelular ? "Equipo nuevo, con garantía" : "Incluye tarjeta de propiedad y placas"} · {producto.stock > 0 ? "entrega inmediata" : "consulta disponibilidad"}
            </div>
            <div className="mt-5 flex gap-3">
              <a href="#simulador" className={buttonClasses({}, "flex-1")}>Simular cuotas</a>
              <ExternalButton href={whatsappLink(mensaje)} variant="outline" className="flex-1">
                <IconWhatsApp size={18} className="text-whatsapp" /> Consultar
              </ExternalButton>
            </div>
          </div>
          <div id="simulador" className="scroll-mt-28">
            <Simulador
              tasas={tasas}
              modos={[esCelular ? "celular" : "vehicular"]}
              producto={{ nombre: producto.nombre, precio: producto.precio, inicialSugerida }}
            />
          </div>
        </aside>
      </section>

      {galeria.length > 0 && (
        <section className="border-t border-line-soft bg-surface py-14">
          <div className="container">
            <h2 className="text-[1.8rem]">Galería</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {galeria.map((img) => (
                <div key={img.url} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
                  <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 45vw, 280px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/** Metadatos SEO comunes de las fichas. */
export function metadataProducto(producto: Producto, canonical: string) {
  const title = producto.nombre;
  const description = `${producto.nombre} desde ${formatSoles(producto.precio)} al contado o en cuotas con Inversiones JP. ${producto.descripcion ?? ""}`.trim();
  const imagen = producto.imagenes[0];
  return {
    title,
    description,
    openGraph: { title, description: producto.descripcion ?? description, images: imagen ? [{ url: imagen.url, alt: imagen.alt }] : undefined },
    alternates: { canonical },
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
