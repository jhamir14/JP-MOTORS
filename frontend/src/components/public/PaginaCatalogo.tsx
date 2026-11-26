import Image from "next/image";
import Link from "next/link";
import { CATALOGOS, LINEAS, lineaDe, type CatalogoId } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { obtenerCatalogo } from "@/lib/server/catalogo";
import { CatalogoCliente } from "./CatalogoCliente";

type SearchParams = Record<string, string | string[] | undefined>;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const portada: Record<CatalogoId, { titulo: string; texto: string; src: string; posicion: string }> = {
  vehiculos: {
    titulo: "Motos, motocar y toritos",
    texto: "Motos lineales para trabajar o moverte por la ciudad, y motocar y toritos listos para salir a producir desde el primer día.",
    src: "/hero_bg.webp",
    posicion: "50% 55%",
  },
  celulares: {
    titulo: "Celulares",
    texto: "iPhone, Samsung, Xiaomi y Honor nuevos, con garantía del fabricante y cuotas semanales sin inicial.",
    src: "/celulares/celulares-escena.webp",
    posicion: "70% 50%",
  },
};

/** Página de un catálogo (vehículos o celulares): portada, pestañas para cambiar de catálogo y la grilla filtrable. */
export async function PaginaCatalogo({ catalogo, searchParams }: { catalogo: CatalogoId; searchParams: SearchParams }) {
  const lineas = CATALOGOS[catalogo].lineas as readonly string[];
  const productos = (await obtenerCatalogo()).filter((p) => lineas.includes(lineaDe(p).id));
  const info = portada[catalogo];

  const tipo = primero(searchParams.tipo);
  const tiposValidos = catalogo === "celulares" ? productos.map((p) => p.marca) : LINEAS.map((l) => l.id as string);

  return (
    <main>
      <section className="noche relative isolate overflow-hidden">
        <Image src={info.src} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-50" style={{ objectPosition: info.posicion }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-noche via-noche/80 to-noche/20" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-noche" />
        <div className="container pt-10 pb-28 md:pt-14 md:pb-36">
          {/* Pestañas: cada catálogo en su propia página */}
          <nav aria-label="Catálogos" className="entrada inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1 backdrop-blur-md">
            {(Object.keys(CATALOGOS) as CatalogoId[]).map((id) => (
              <Link
                key={id}
                href={CATALOGOS[id].href}
                aria-current={id === catalogo ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 sm:px-5",
                  id === catalogo ? "bg-oro text-noche" : "text-white/70 hover:text-white",
                )}
              >
                {CATALOGOS[id].nombre}
              </Link>
            ))}
          </nav>
          <h1 className="display entrada mt-8 max-w-3xl text-[2.6rem] text-white md:text-[4.2rem]" style={{ "--retraso": "100ms" } as React.CSSProperties}>
            {info.titulo}
          </h1>
          <p className="entrada mt-5 max-w-xl text-[1.05rem] text-white/75" style={{ "--retraso": "200ms" } as React.CSSProperties}>
            {info.texto}
          </p>
        </div>
      </section>

      <CatalogoCliente
        key={catalogo}
        productos={productos}
        catalogo={catalogo}
        inicial={{
          tipo: tiposValidos.includes(tipo) ? tipo : "todos",
          q: primero(searchParams.q),
          orden: primero(searchParams.orden),
        }}
      />
    </main>
  );
}
