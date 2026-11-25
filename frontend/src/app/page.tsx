import Image from "next/image";
import { ButtonLink } from "@/components/ui";
import { IconCheck, IconChevronRight } from "@/components/icons";
import { HeroSearch } from "@/components/public/HeroSearch";
import { MotoCard } from "@/components/public/MotoCard";
import { PRECIO_MAXIMO_CATALOGO, getCategoriasConStock, getMotosDestacadas } from "@/data/motos";
import Link from "next/link";

const beneficios = ["Fácil y rápido", "100% seguro", "Asesoría personalizada"];

const accesosMovil = [
  { href: "/motos", label: "Ver catálogo de motos", variant: "primary" as const },
  { href: "/repuestos", label: "Tienda de repuestos", variant: "secondary" as const },
  { href: "/financiamiento", label: "Quiero un crédito", variant: "secondary" as const },
];

export default function Home() {
  const destacadas = getMotosDestacadas();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-10 md:pt-40 md:pb-30">
        <Image
          src="/hero_bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(15,17,21,0.4)_0%,rgba(15,17,21,0.7)_60%,rgba(15,17,21,1)_100%)]" />

        <div className="container relative">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-[3rem] font-black uppercase tracking-[1px] [text-shadow:0_4px_12px_rgba(0,0,0,0.8)]">
              La moto que buscas, la tenemos
            </h1>
            <p className="text-[1.3rem] [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">Conócela, cómprala o finánciala aquí.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-bold uppercase text-white">
              {beneficios.map((b) => (
                <span key={b} className="flex items-center gap-2">
                  <IconCheck size={18} strokeWidth={3} /> {b}
                </span>
              ))}
            </div>
          </div>

          <HeroSearch categorias={getCategoriasConStock()} precioMaximo={PRECIO_MAXIMO_CATALOGO} />
        </div>
      </section>

      {/* Accesos rápidos (solo móvil) */}
      <section className="flex flex-col gap-4 px-5 pb-10 md:hidden">
        {accesosMovil.map((a) => (
          <ButtonLink key={a.href} href={a.href} variant={a.variant} size="lg" block caps={false} className="justify-between rounded-xl">
            {a.label} <IconChevronRight />
          </ButtonLink>
        ))}
      </section>

      {/* Motos destacadas */}
      <section className="bg-bg py-20">
        <div className="container">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="mb-0">Recién llegadas</h2>
            <Link href="/motos" className="font-semibold text-accent">Ver todas →</Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {destacadas.map((moto) => (
              <div key={moto.id} className="max-w-[380px] flex-[1_1_300px]">
                <MotoCard moto={moto} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA de financiamiento */}
      <section className="py-20 md:py-30">
        <div className="container grid grid-cols-[repeat(auto-fit,minmax(min(100%,450px),1fr))] items-center gap-16">
          <div className="relative flex w-full justify-center">
            <Image
              src="/financing_worker.webp"
              alt="Cliente feliz con las llaves de su moto financiada"
              width={600}
              height={600}
              sizes="(max-width: 768px) 90vw, 560px"
              className="max-h-[600px] w-auto object-contain mix-blend-screen [filter:contrast(1.1)_brightness(1.2)]"
            />
          </div>

          <div className="flex flex-col gap-12">
            <h2 className="mb-0 text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] font-black tracking-[-1px] uppercase">
              Tu próxima moto está
              <br />
              <span className="text-accent">al alcance de tu mano</span>
            </h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10">
              <div>
                <h3 className="mb-4 text-xl leading-snug font-bold">El financiamiento que te entiende</h3>
                <p className="text-[0.95rem]">
                  Entendemos que la moto es tu principal herramienta de progreso. Evaluamos tu perfil rápidamente y te
                  brindamos créditos accesibles, con la flexibilidad que requieres.
                </p>
              </div>
              <div className="flex flex-col items-start">
                <h3 className="mb-4 text-xl leading-snug font-bold">Proyecta tus pagos hoy</h3>
                <p className="mb-8 text-[0.95rem]">
                  Descubre cuál sería tu cuota mensual y la inicial que mejor encaja en tu economía con nuestro
                  simulador. Te acompañamos paso a paso de forma transparente.
                </p>
                <ButtonLink href="/motos" block className="font-extrabold">
                  Calcular mis cuotas
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marcas */}
      <section className="pt-15 pb-25 text-center">
        <div className="container">
          <h2 className="mb-12 font-extrabold uppercase">
            Busca tu moto por <span className="text-accent">marca</span>
          </h2>
          <Link href="/motos" className="mx-auto flex w-full max-w-[180px] flex-col items-center">
            <div className="card flex h-[140px] w-full items-center justify-center p-6">
              <Image src="/brands/HONDA_wing.webp" alt="Honda" width={130} height={90} className="object-contain mix-blend-screen" />
            </div>
            <span className="mt-4 text-[0.9rem] font-bold uppercase text-muted">Honda</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
