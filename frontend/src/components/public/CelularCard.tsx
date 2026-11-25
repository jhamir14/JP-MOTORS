import { Badge, ButtonLink, Card, ExternalButton } from "@/components/ui";
import { IconWhatsApp } from "@/components/icons";
import type { Celular } from "@/data/celulares";
import { creditConfig } from "@/lib/config";
import { cuotaFrancesa } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { PhoneMock } from "./PhoneMock";

export function CelularCard({ celular }: { celular: Celular }) {
  const semanas = creditConfig.plazoCelularPorDefecto;
  const cuota = cuotaFrancesa(celular.precio, creditConfig.tasaCelularSemanal, semanas);
  const nombre = `${celular.marca} ${celular.nombre}`;

  return (
    <Card interactive className="flex h-full flex-col">
      <div className="showcase relative flex h-52 items-center justify-center">
        <Badge tone="dark" className="absolute top-3 left-3">{celular.gama}</Badge>
        <PhoneMock celular={celular} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{celular.marca}</span>
        <h3 className="mt-1 text-lg">{celular.nombre}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{celular.descripcion}</p>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line-soft pt-4">
          <div>
            <div className="text-xs text-muted">Desde</div>
            <div className="text-xl font-extrabold text-accent tabular">
              {formatSoles(cuota, true)}<span className="text-sm font-semibold text-muted">/sem</span>
            </div>
            <div className="text-xs text-muted tabular">{semanas} semanas · sin inicial</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Contado</div>
            <div className="font-bold tabular">{formatSoles(celular.precio)}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <ButtonLink
            href={`/financiamiento?servicio=CREDITO_CELULAR&producto=${encodeURIComponent(nombre)}`}
            size="sm"
            className="flex-1"
          >
            Lo quiero
          </ButtonLink>
          <ExternalButton href={whatsappLink(whatsappMessages.celular(nombre))} variant="outline" size="sm" aria-label={`Consultar ${nombre} por WhatsApp`}>
            <IconWhatsApp size={18} className="text-whatsapp" />
          </ExternalButton>
        </div>
      </div>
    </Card>
  );
}
