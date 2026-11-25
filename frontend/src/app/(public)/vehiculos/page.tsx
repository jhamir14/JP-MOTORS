import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
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
      <section className="border-b border-line-soft bg-surface">
        <div className="container grid items-center gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <span className="eyebrow">Crédito vehicular</span>
            <h1 className="mt-3 text-[2.2rem] md:text-[3rem]">Motos y mototaxis para trabajar</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Modelos 0 km con crédito directo: inicial flexible, cuotas mensuales hasta 36 meses y sin boletas de pago.
            </p>
            <Link href="/vehiculos/torito-bajaj" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5 transition-all">
              ¿Buscas un Torito Bajaj? Mira nuestra sección de mototaxis <IconArrowRight size={16} />
            </Link>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["36", "meses de plazo"],
              ["20%", "inicial sugerida"],
              ["24 h", "respuesta"],
            ].map(([n, t]) => (
              <div key={t} className="rounded-2xl bg-brand-soft p-4 text-center">
                <dt className="sr-only">{t}</dt>
                <dd className="text-2xl font-extrabold text-brand">{n}</dd>
                <dd className="mt-1 text-xs font-medium text-muted">{t}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <CatalogoVehiculos
        vehiculos={vehiculos}
        inicial={{ q: first(sp.q), tipo: first(sp.tipo), uso: first(sp.uso), precioMax: Number.isFinite(precioMax) ? precioMax : 0, orden: first(sp.orden) }}
      />
    </main>
  );
}
