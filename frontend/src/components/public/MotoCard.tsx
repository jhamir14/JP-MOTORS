import Image from "next/image";
import Link from "next/link";
import { Badge, ButtonLink, Card, buttonClasses } from "@/components/ui";
import type { Moto } from "@/data/motos";
import { formatSoles } from "@/lib/format";

export function MotoCard({ moto, showFinanciar = false, priority = false }: { moto: Moto; showFinanciar?: boolean; priority?: boolean }) {
  return (
    <Card interactive className="flex h-full flex-col">
      <Link href={`/motos/${moto.id}`} className="relative flex h-[220px] w-full items-center justify-center bg-white/[0.02] p-5">
        <Badge className="absolute top-4 right-4 z-[2]">{moto.categoria}</Badge>
        <Image
          src={moto.imagen}
          alt={`Moto ${moto.marca} ${moto.nombre}`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 90vw, 380px"
          className="object-contain p-5 mix-blend-screen [filter:contrast(1.1)_drop-shadow(0_4px_6px_rgba(0,0,0,0.5))]"
        />
      </Link>

      <div className="flex flex-grow flex-col p-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[1px] text-muted">Marca {moto.marca}</div>
        <h3 className="mb-4 text-[1.3rem] leading-tight font-extrabold">{moto.nombre}</h3>

        <div className="mb-6 flex gap-3">
          <Badge tone="outline">⚙️ {moto.cc} cc</Badge>
          <Badge tone="outline">⚖️ {moto.peso}</Badge>
        </div>

        <div className="mt-auto border-t border-line-soft pt-4">
          <div className="mb-1 text-xs uppercase text-muted">Precio contado</div>
          <div className="text-2xl font-black text-white">{formatSoles(moto.precio)}</div>
        </div>

        <div className="mt-6 flex gap-2">
          <Link href={`/motos/${moto.id}`} className={buttonClasses({ variant: "outline", size: "sm", caps: false }, "flex-1")}>
            Detalles
          </Link>
          {showFinanciar && (
            <ButtonLink href={`/financiamiento?modelo=${encodeURIComponent(moto.nombre)}`} size="sm" caps={false} className="flex-1">
              Financiar
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}
