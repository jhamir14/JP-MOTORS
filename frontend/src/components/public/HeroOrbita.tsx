"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconArrowRight } from "@/components/icons";
import { cn } from "@/lib/cn";

const escenas = [
  { id: "motos", titulo: "Motos", detalle: "Urbanas, de trabajo y deportivas", src: "/motos/cb190r.webp", alt: "Moto deportiva roja", escala: "scale-[1.18]" },
  { id: "mototaxis", titulo: "Mototaxis", detalle: "De pasajeros y de carga", src: "/motos/nl150.webp", alt: "Mototaxi roja de pasajeros", escala: "scale-[1.12]" },
  { id: "celulares", titulo: "Celulares", detalle: "iPhone, Samsung, Xiaomi y más", src: "/escenas/celulares-estudio.webp", alt: "Tres celulares de última generación", escala: "scale-100" },
] as const;

const DURACION = 5500;

const CONSULTA_MOVIMIENTO = "(prefers-reduced-motion: reduce)";
const suscribirMovimiento = (avisar: () => void) => {
  const mq = window.matchMedia(CONSULTA_MOVIMIENTO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
};

/**
 * Pieza central del inicio: el anillo dorado del logotipo encierra un "lente" que va mostrando
 * cada línea del catálogo. Avanza solo (salvo con movimiento reducido) y se puede elegir la línea.
 */
export function HeroOrbita() {
  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false);
  const reducido = useSyncExternalStore(
    suscribirMovimiento,
    () => window.matchMedia(CONSULTA_MOVIMIENTO).matches,
    () => true, // En el servidor no se avanza solo.
  );

  useEffect(() => {
    if (pausa || reducido) return;
    const t = window.setTimeout(() => setActiva((i) => (i + 1) % escenas.length), DURACION);
    return () => window.clearTimeout(t);
  }, [activa, pausa, reducido]);

  const escena = escenas[activa];

  return (
    <div
      className="relative mx-auto w-full max-w-[560px]"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
    >
      <div className="relative aspect-square">
        {/* Halo */}
        <div aria-hidden className="absolute inset-[8%] rounded-full bg-electrico/30 blur-[70px]" />

        {/* Órbita punteada con satélite */}
        <div aria-hidden className="girar-lento absolute inset-0">
          <svg viewBox="0 0 100 100" className="size-full">
            <circle cx="50" cy="50" r="49.3" fill="none" stroke="rgba(246,213,138,0.28)" strokeWidth="0.25" strokeDasharray="0.6 1.6" />
          </svg>
          <span className="absolute top-[0.7%] left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-oro-claro shadow-[0_0_18px_4px_rgba(246,213,138,0.6)]" />
        </div>

        {/* Lente con la línea activa */}
        <div className="placa absolute inset-[7.5%] overflow-hidden rounded-full ring-1 ring-white/10">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_80%,rgba(28,107,255,0.35),transparent_70%)]" />
          {escenas.map((e, i) => (
            <div
              key={e.id}
              aria-hidden={i !== activa}
              className={cn(
                "absolute inset-[6%] mix-blend-lighten transition-opacity duration-700",
                i === activa ? "opacity-100 motion-safe:animate-[lente-entrada_1.1s_cubic-bezier(0.2,0.8,0.2,1)_both]" : "opacity-0",
              )}
            >
              <Image
                src={e.src}
                alt={e.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 80vw, 480px"
                className={cn("object-contain mix-blend-lighten", e.escala)}
              />
            </div>
          ))}
          {/* Brillo inferior que asienta el producto */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-noche/80 to-transparent" />
        </div>

        {/* Anillo dorado que se dibuja al cargar */}
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-[4.5%] size-[91%] -rotate-90">
          <defs>
            <linearGradient id="oro-anillo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f6d58a" />
              <stop offset="35%" stopColor="#c48a2a" />
              <stop offset="60%" stopColor="#f6d58a" />
              <stop offset="100%" stopColor="#a8761c" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="48.6"
            fill="none"
            stroke="url(#oro-anillo)"
            strokeWidth="1.5"
            pathLength={1000}
            className="trazo"
            style={{ "--largo": 1000 } as React.CSSProperties}
          />
        </svg>

        {/* Flecha de crecimiento del logotipo, cruzando el anillo */}
        <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <path
            d="M6 74 C 30 86, 62 74, 92 30"
            fill="none"
            stroke="url(#oro-anillo)"
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength={1000}
            className="trazo"
            style={{ "--largo": 1000, "--retraso": "900ms" } as React.CSSProperties}
          />
          <path
            d="M84.5 29.5 L93.5 28 L91.5 37"
            fill="none"
            stroke="#f6d58a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="motion-safe:animate-[aparecer_0.4s_ease-out_2.4s_both]"
          />
        </svg>

        {/* Pie del lente */}
        <Link
          href={`/catalogo?linea=${escena.id}`}
          className="group absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-noche/70 py-2 pr-2 pl-5 text-left whitespace-nowrap backdrop-blur-md transition-colors hover:border-oro/60"
        >
          <span key={escena.id} className="motion-safe:animate-[aparecer_0.6s_ease-out_both]">
            <span className="block text-[0.95rem] font-bold text-white">{escena.titulo}</span>
            <span className="block text-[0.72rem] text-white/60">{escena.detalle}</span>
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-oro text-noche transition-transform duration-300 group-hover:translate-x-0.5">
            <IconArrowRight size={16} />
            <span className="sr-only">Ver {escena.titulo.toLowerCase()} en el catálogo</span>
          </span>
        </Link>
      </div>

      {/* Selector de línea con barra de progreso */}
      <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="Elegir línea">
        {escenas.map((e, i) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={i === activa}
            onClick={() => setActiva(i)}
            className={cn(
              "group relative overflow-hidden rounded-full py-2.5 text-sm font-semibold transition-colors duration-300",
              i === activa ? "text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            <span className="absolute inset-x-3 bottom-0 h-px bg-white/15" />
            {i === activa && (
              <span
                key={`${e.id}-${activa}`}
                className="absolute inset-x-3 bottom-0 h-px origin-left bg-oro motion-safe:animate-[progreso_linear_both]"
                style={{ animationDuration: `${DURACION}ms`, animationPlayState: pausa ? "paused" : "running" }}
              />
            )}
            {e.titulo}
          </button>
        ))}
      </div>
    </div>
  );
}
