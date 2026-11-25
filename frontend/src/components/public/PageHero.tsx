import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Cabecera de las páginas internas con foto de fondo y degradado de marca encima.
 * La foto ocupa todo el ancho en móvil y la mitad derecha en escritorio.
 */
export function PageHero({
  eyebrow,
  title,
  children,
  imagen,
  alt,
  aside,
  posicion = "center",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  imagen: string;
  alt: string;
  /** Contenido a la derecha (sobre la foto) en escritorio. */
  aside?: ReactNode;
  posicion?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-brand-ink text-white", className)}>
      <Image src={imagen} alt={alt} fill priority sizes="100vw" className="-z-10 object-cover opacity-55 md:left-[35%] md:w-[65%] md:opacity-100" style={{ objectPosition: posicion }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#071d45_0%,#071d45_38%,rgba(7,29,69,0.75)_60%,rgba(7,29,69,0.15)_100%)] max-md:bg-[linear-gradient(180deg,rgba(7,29,69,0.55)_0%,#071d45_100%)]" />
      <div className="container grid items-center gap-8 py-14 md:min-h-[380px] md:grid-cols-[1.2fr_1fr] md:py-20">
        <div>
          <span className="eyebrow text-[#7ff0c4]">{eyebrow}</span>
          <h1 className="mt-3 text-[2.2rem] leading-[1.1] text-white md:text-[3rem]">{title}</h1>
          {children && <div className="mt-4 max-w-xl text-lg text-white/80">{children}</div>}
        </div>
        {aside && <div className="md:justify-self-end">{aside}</div>}
      </div>
    </section>
  );
}
