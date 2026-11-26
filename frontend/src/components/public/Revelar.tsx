"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Hace aparecer su contenido (fundido + desplazamiento corto) la primera vez que entra en pantalla.
 * Los estilos viven en globals.css (`[data-revelar]`) y se desactivan con `prefers-reduced-motion`.
 */
export function Revelar({
  children,
  as: Tag = "div",
  retraso = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          el.dataset.revelar = "visible";
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag ref={ref} data-revelar="" className={className} style={{ "--retraso": `${retraso}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
