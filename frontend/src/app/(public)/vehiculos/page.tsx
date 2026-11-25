import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { PageHero } from "@/components/public/PageHero";
import { CATEGORIAS_VEHICULO } from "@/lib/catalogo";
import { productosPorCategoria } from "@/lib/server/catalogo";
import { CatalogoVehiculos } from "./CatalogoVehiculos";

export const metadata: Metadata = {
  title: "Crédito vehicular: motos y mototaxis",
  description: "Motos Honda, mototaxis y trimóviles 0 km con crédito vehicular directo: inicial flexible y cuotas mensuales hasta 36 meses.",
  alternates: { canonical: "/vehiculos" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function VehiculosPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, vehiculos] = await Promise.all([searchParams, productosPorCategoria(...CATEGORIAS_VEHICULO)]);
  const precioMax = Number(first(sp.precioMax));

  return (
    <main>
      <PageHero
        eyebrow="Crédito vehicular"
        title="Motos y mototaxis para trabajar"
        imagen="/motos/gallery/gallery-3.webp"
        alt="Moto Honda roja estacionada"
        aside={
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["36", "meses de plazo"],
              ["20%", "inicial sugerida"],
              ["24 h", "respuesta"],
            ].map(([n, t]) => (
              <div key={t} className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-md ring-1 ring-white/15">
                <dt className="sr-only">{t}</dt>
                <dd className="text-2xl font-extrabold text-white">{n}</dd>
                <dd className="mt-1 text-xs font-medium text-white/75">{t}</dd>
              </div>
            ))}
          </dl>
        }
      >
        <p>Modelos 0 km con crédito directo: inicial flexible, cuotas mensuales hasta 36 meses y sin boletas de pago.</p>
        <Link href="/vehiculos/torito-bajaj" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7ff0c4] transition-all hover:gap-2.5">
          ¿Buscas un Torito Bajaj? Mira nuestra sección de mototaxis <IconArrowRight size={16} />
        </Link>
      </PageHero>

      <CatalogoVehiculos
        vehiculos={vehiculos}
        inicial={{ q: first(sp.q), tipo: first(sp.tipo), uso: first(sp.uso), precioMax: Number.isFinite(precioMax) ? precioMax : 0, orden: first(sp.orden) }}
      />
    </main>
  );
}
