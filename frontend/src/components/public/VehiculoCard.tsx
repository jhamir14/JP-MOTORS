import Link from "next/link";
import { Badge, ButtonLink, Card, buttonClasses } from "@/components/ui";
import { ETIQUETA_CATEGORIA, cilindrada, hrefProducto, planDestacado, type Producto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { ProductoImagen } from "./ProductoImagen";

export function VehiculoCard({ producto, priority = false }: { producto: Producto; priority?: boolean }) {
  const href = hrefProducto(producto);
  const destacado = planDestacado(producto);
  const cc = cilindrada(producto);
  const etq = destacado ? ETIQUETA_FRECUENCIA[destacado.plan.frecuencia] : null;

  return (
    <Card interactive className="flex h-full flex-col">
      <Link href={href} className="showcase relative block h-52">
        <Badge tone="dark" className="absolute top-3 left-3 z-[1]">{ETIQUETA_CATEGORIA[producto.categoria]}</Badge>
        {producto.stock > 0 && <Badge tone="accent" className="absolute top-3 right-3 z-[1]">En stock</Badge>}
        <ProductoImagen producto={producto} priority={priority} sizes="(max-width: 768px) 90vw, 380px" />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {producto.marca}{cc ? ` · ${cc} cc` : ""}
        </span>
        <h3 className="mt-1 text-lg">
          <Link href={href} className="hover:text-brand">{producto.modelo}</Link>
        </h3>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line-soft pt-4">
          {destacado && etq ? (
            <div>
              <div className="text-xs text-muted">Cuota desde</div>
              <div className="text-xl font-extrabold text-accent tabular">
                {formatSoles(destacado.resultado.cuota)}<span className="text-sm font-semibold text-muted">/{etq.abrev}</span>
              </div>
              <div className="text-xs text-muted tabular">
                {destacado.plan.numeroCuotas} {etq.plural} · inicial {formatSoles(destacado.plan.cuotaInicial)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted">Consulta tu plan</div>
          )}
          <div className="text-right">
            <div className="text-xs text-muted">Contado</div>
            <div className="font-bold tabular">{formatSoles(producto.precio)}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={href} className={buttonClasses({ variant: "outline", size: "sm" }, "flex-1")}>
            Ver detalle
          </Link>
          <ButtonLink
            href={`/financiamiento?servicio=CREDITO_VEHICULAR&producto=${encodeURIComponent(producto.nombre)}`}
            size="sm"
            className="flex-1"
          >
            Financiar
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
