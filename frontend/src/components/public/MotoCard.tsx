import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, Card, buttonClasses } from "@/components/ui";
import type { Moto } from "@/data/motos";
import { creditConfig } from "@/lib/config";
import { cuotaFrancesa } from "@/lib/finance";
import { formatSoles } from "@/lib/format";

export function MotoCard({ moto, priority = false }: { moto: Moto; priority?: boolean }) {
  const meses = 24;
  const cuota = cuotaFrancesa(moto.precio * 0.8, creditConfig.tasaVehicularMensual, meses);

  return (
    <Card interactive className="flex h-full flex-col">
      <Link href={`/motos/${moto.id}`} className="showcase relative block h-52">
        <Badge tone="dark" className="absolute top-3 left-3 z-[1]">{moto.categoria}</Badge>
        <Image
          src={moto.imagen}
          alt={`${moto.marca} ${moto.nombre}`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 90vw, 380px"
          className="object-contain p-4 mix-blend-lighten"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{moto.marca} · {moto.cc} cc</span>
        <h3 className="mt-1 text-lg">
          <Link href={`/motos/${moto.id}`} className="hover:text-brand">{moto.nombre}</Link>
        </h3>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line-soft pt-4">
          <div>
            <div className="text-xs text-muted">Cuota referencial</div>
            <div className="text-xl font-extrabold text-accent tabular">
              {formatSoles(cuota)}<span className="text-sm font-semibold text-muted">/mes</span>
            </div>
            <div className="text-xs text-muted">{meses} meses · 20% de inicial</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Contado</div>
            <div className="font-bold tabular">{formatSoles(moto.precio)}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/motos/${moto.id}`} className={buttonClasses({ variant: "outline", size: "sm" }, "flex-1")}>
            Ver detalle
          </Link>
          <ButtonLink
            href={`/financiamiento?servicio=CREDITO_VEHICULAR&producto=${encodeURIComponent(`${moto.marca} ${moto.nombre}`)}`}
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
