import type { Metadata } from "next";
import { ButtonLink, Card, ExternalButton } from "@/components/ui";
import { IconArrowRight, IconCheck, IconWhatsApp } from "@/components/icons";
import { SectionHeading } from "@/components/public/SectionHeading";
import { Simulador } from "@/components/public/Simulador";
import { VehiculoCard } from "@/components/public/VehiculoCard";
import { normalizarTexto } from "@/lib/catalogo";
import { obtenerTasasPublicas, productosPorCategoria } from "@/lib/server/catalogo";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Torito Bajaj y mototaxis a crédito",
  description:
    "Mototaxi Torito Bajaj RE 4T (gasolina, GLP o GNV) y trimóviles de carga con crédito directo para transportistas: inicial flexible y cuotas mensuales.",
  alternates: { canonical: "/vehiculos/torito-bajaj" },
};

export const revalidate = 300;

const versiones = [
  {
    nombre: "Torito RE 4T Pasajeros",
    uso: "Transporte de pasajeros",
    puntos: ["Motor 198.6 cc, 4 tiempos", "Encendido digital twin spark", "Gasolina, Dual GLP o Dual GNV"],
  },
  {
    nombre: "Torito Máxima Cargo",
    uso: "Reparto y comercio",
    puntos: ["Tolva abierta o furgón cerrado", "Chasis reforzado para carga", "Ideal para mercados y delivery"],
  },
  {
    nombre: "Honda Motokar",
    uso: "Provincia y selva",
    puntos: ["Motor Honda confiable", "Carreta techada de pasajeros", "Repuestos en todo el país"],
  },
];

const porQue = [
  "No pedimos boletas de pago: evaluamos tu trabajo como transportista",
  "Inicial flexible y cuotas mensuales que se ajustan a tus ingresos",
  "Te acompañamos con placas, tarjeta de propiedad y GPS",
  "Si pagas puntual, accedes a préstamos en efectivo para tu negocio",
];

export default async function ToritoBajajPage() {
  const [trimoviles, tasas] = await Promise.all([
    productosPorCategoria("TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"),
    obtenerTasasPublicas(),
  ]);
  const bajaj = trimoviles.filter((t) => normalizarTexto(`${t.marca} ${t.nombre}`).includes("bajaj"));
  const mostrar = bajaj.length ? bajaj : trimoviles;

  return (
    <main>
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(242,169,0,0.22)_0%,transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgba(37,99,235,0.35)_0%,transparent_70%)]" />
        <div className="container relative grid items-center gap-10 pt-12 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-16 md:pb-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-gold">
              Mototaxis y trimóviles
            </span>
            <h1 className="mt-5 text-[2.3rem] leading-[1.08] text-white md:text-[3.2rem]">
              Tu Torito Bajaj propio, <span className="text-gold">pagando con tu trabajo</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Financiamos mototaxis de pasajeros y trimóviles de carga para transportistas y comerciantes. Crédito directo,
              sin bancos y con cuotas mensuales.
            </p>
            <ul className="mt-7 grid gap-3">
              {porQue.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-white/85">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold">
                    <IconCheck size={14} strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/financiamiento?servicio=CREDITO_VEHICULAR&producto=Torito%20Bajaj" size="lg">
                Solicitar evaluación <IconArrowRight size={18} />
              </ButtonLink>
              <ExternalButton href={whatsappLink(whatsappMessages.moto("Torito Bajaj"))} variant="light" size="lg">
                <IconWhatsApp size={20} className="text-whatsapp" /> Cotizar por WhatsApp
              </ExternalButton>
            </div>
          </div>
          <div className="text-fg">
            <Simulador tasas={tasas} modos={["vehicular"]} />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <SectionHeading eyebrow="Modelos" title="Elige el trimóvil para tu trabajo">
            Trabajamos con Torito Bajaj y Honda Motokar. Consulta disponibilidad, colores y versiones a gas.
          </SectionHeading>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {versiones.map((v) => (
              <Card key={v.nombre} className="p-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{v.uso}</span>
                <h3 className="mt-1 text-xl">{v.nombre}</h3>
                <ul className="mt-4 flex flex-col gap-2 text-sm">
                  {v.puntos.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <IconCheck size={16} className="shrink-0 text-accent" strokeWidth={2.6} /> {p}
                    </li>
                  ))}
                </ul>
                <ExternalButton href={whatsappLink(whatsappMessages.moto(v.nombre))} variant="outline" size="sm" className="mt-5">
                  <IconWhatsApp size={16} className="text-whatsapp" /> Consultar precio
                </ExternalButton>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {mostrar.length > 0 && (
        <section className="border-t border-line-soft bg-surface-2 py-16 md:py-20">
          <div className="container">
            <SectionHeading eyebrow="Disponibles con crédito" title={bajaj.length ? "Torito Bajaj en catálogo" : "Trimóviles en catálogo"}>
              Precio al contado y cuota desde el plan publicado.
            </SectionHeading>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mostrar.map((p) => (
                <VehiculoCard key={p.id} producto={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
