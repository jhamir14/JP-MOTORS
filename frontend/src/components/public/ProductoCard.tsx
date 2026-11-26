import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { cilindrada, hrefProducto, lineaDe, planDestacado, type Producto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { ProductoImagen, fotoSobreNegro } from "./ProductoImagen";
import { cn } from "@/lib/cn";

/** Dato corto que distingue al producto dentro de su línea. */
function datoClave(p: Producto) {
  const cc = cilindrada(p);
  if (cc) return `${Math.round(cc)} cc`;
  return p.specs["Sistema"] ?? p.etiquetas[0] ?? null;
}

/**
 * Tarjeta del catálogo: placa marino con el anillo dorado del logotipo detrás del producto.
 * Toda la tarjeta es un enlace a la ficha.
 */
export function ProductoCard({ producto, priority = false, indice = 0 }: { producto: Producto; priority?: boolean; indice?: number }) {
  const linea = lineaDe(producto);
  const dato = datoClave(producto);
  const cuota = planDestacado(producto);

  return (
    <Link
      href={hrefProducto(producto)}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_1px_0_rgba(10,22,51,0.06),0_20px_40px_-28px_rgba(10,22,51,0.45)] ring-1 ring-tinta/[0.06] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1.5 hover:shadow-[0_1px_0_rgba(10,22,51,0.06),0_36px_60px_-30px_rgba(10,22,51,0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro motion-safe:animate-[tarjeta-entrada_0.7s_cubic-bezier(0.2,0.8,0.2,1)_both]"
      style={{ animationDelay: `${Math.min(indice, 8) * 60}ms` }}
    >
      <div className="placa relative m-2 mb-0 aspect-[5/4] overflow-hidden rounded-[1.4rem]">
        <div
          aria-hidden
          className="anillo absolute top-1/2 left-1/2 aspect-square h-[84%] -translate-x-1/2 -translate-y-1/2 opacity-60 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] [--grosor:1.5px] group-hover:scale-110 group-hover:rotate-45 group-hover:opacity-100"
        />
        <div className={cn("absolute inset-[6%] transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.06]", fotoSobreNegro(producto) && "mix-blend-lighten")}>
          <ProductoImagen producto={producto} priority={priority} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px" />
        </div>
        {/* Asienta el producto y oculta el borde inferior de las fotos recortadas sobre negro */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-noche via-noche/70 to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-white/10 px-3 py-1 text-[0.72rem] font-semibold text-white/90 backdrop-blur-md">
          {linea.singular}
        </span>
        {producto.stock > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-oro px-3 py-1 text-[0.72rem] font-bold text-noche">Entrega inmediata</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <span className="text-[0.8rem] font-medium text-pizarra">
          {producto.marca}
          {dato ? <span className="text-pizarra/60"> / {dato}</span> : null}
        </span>
        <h3 className="display-sm mt-1 text-[1.18rem] text-tinta">{producto.modelo}</h3>

        {cuota && (
          <div className="mt-1.5 text-[0.8rem] text-pizarra">
            Precio <span className="font-semibold text-tinta tabular">{formatSoles(producto.precio)}</span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          {cuota ? (
            <div className="min-w-0">
              <div className="text-[0.72rem] font-semibold tracking-wide text-oro-oscuro uppercase">Cuota desde</div>
              <div className="flex items-baseline gap-1">
                <span className="text-[1.4rem] leading-tight font-extrabold text-tinta tabular">{formatSoles(Math.ceil(cuota.resultado.cuota))}</span>
                <span className="text-sm font-medium text-pizarra">/{ETIQUETA_FRECUENCIA[cuota.plan.frecuencia].singular}</span>
              </div>
              <div className="mt-0.5 text-[0.75rem] text-pizarra tabular">
                {cuota.plan.cuotaInicial > 0 ? `Inicial ${formatSoles(cuota.plan.cuotaInicial)}` : "Sin inicial"} · {cuota.plan.numeroCuotas}{" "}
                {ETIQUETA_FRECUENCIA[cuota.plan.frecuencia].plural}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[0.72rem] text-pizarra">Precio referencial</div>
              <div className="text-lg font-extrabold text-tinta tabular">{formatSoles(producto.precio)}</div>
            </div>
          )}
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tinta text-white transition-[background-color,color,transform] duration-500 group-hover:-rotate-45 group-hover:bg-oro group-hover:text-noche">
            <IconArrowRight size={18} />
            <span className="sr-only">Ver ficha de {producto.nombre}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
