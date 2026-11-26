import Image from "next/image";
import type { Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { PhoneMock } from "./PhoneMock";

/**
 * Fotos recortadas sobre negro: se funden con la placa oscura usando `mix-blend-lighten`.
 * Si un contenedor de la foto se transforma o anima, ese contenedor también debe llevar `mix-blend-lighten`
 * (un `transform` o `filter` aísla la composición y el negro volvería a verse).
 */
export const sobreNegro = (url: string) => url.startsWith("/motos/") || url.startsWith("/repuestos/") || url.startsWith("/escenas/celulares-estudio");

/**
 * Foto principal del producto sobre la placa oscura. Las fotos subidas desde el panel se muestran tal cual.
 */
export const fotoSobreNegro = (p: Producto) => Boolean(p.imagenes[0] && sobreNegro(p.imagenes[0].url));

export function ProductoImagen({
  producto,
  sizes,
  priority,
  className,
  imagen = producto.imagenes[0],
}: {
  producto: Producto;
  sizes: string;
  priority?: boolean;
  className?: string;
  imagen?: Producto["imagenes"][number];
}) {
  if (!imagen) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", className)}>
        <PhoneMock marca={producto.marca} modelo={producto.modelo} />
      </div>
    );
  }
  return (
    <Image
      src={imagen.url}
      alt={imagen.alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn(sobreNegro(imagen.url) ? "object-contain mix-blend-lighten" : "object-contain", className)}
    />
  );
}
