import Link from "next/link";
import { Badge, ButtonLink, Card, ExternalButton } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import { gamaCelular, hrefProducto, planDestacado, type Producto } from "@/lib/catalogo";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { ProductoImagen } from "./ProductoImagen";

export function CelularCard({ producto }: { producto: Producto }) {
  const href = hrefProducto(producto);
  const destacado = planDestacado(producto);
  const etq = destacado ? ETIQUETA_FRECUENCIA[destacado.plan.frecuencia] : null;

  return (
    <Card interactive className="flex h-full flex-col">
      <Link href={href} className="showcase relative flex h-52 items-center justify-center">
        <Badge tone="dark" className="absolute top-3 left-3 z-[1]">{gamaCelular(producto)}</Badge>
        {producto.stock > 0 && <Badge tone="accent" className="absolute top-3 right-3 z-[1]">En stock</Badge>}
        <ProductoImagen producto={producto} sizes="(max-width: 768px) 90vw, 280px" className="p-4" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{producto.marca}</span>
        <h3 className="mt-1 text-lg">
          <Link href={href} className="hover:text-brand">{producto.modelo}</Link>
        </h3>
        {producto.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted">{producto.descripcion}</p>}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line-soft pt-4">
          {destacado && etq ? (
            <div>
              <div className="text-xs text-muted">Desde</div>
              <div className="text-xl font-extrabold text-accent tabular">
                {formatSoles(destacado.resultado.cuota, true)}<span className="text-sm font-semibold text-muted">/{etq.abrev}</span>
              </div>
              <div className="text-xs text-muted tabular">
                {destacado.plan.numeroCuotas} {etq.plural} · {destacado.plan.cuotaInicial > 0 ? `inicial ${formatSoles(destacado.plan.cuotaInicial)}` : "sin inicial"}
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
          <ButtonLink
            href={`/financiamiento?servicio=CREDITO_CELULAR&producto=${encodeURIComponent(producto.nombre)}`}
            size="sm"
            className="flex-1"
          >
            Lo quiero
          </ButtonLink>
          <ExternalButton href={whatsappLink(whatsappMessages.celular(producto.nombre))} variant="outline" size="sm" aria-label={`Consultar ${producto.nombre} por WhatsApp`}>
            <IconWhatsApp size={18} className="text-whatsapp" />
          </ExternalButton>
        </div>
      </div>
    </Card>
  );
}
