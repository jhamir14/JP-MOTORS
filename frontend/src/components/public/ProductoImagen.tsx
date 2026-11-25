import Image from "next/image";
import type { Producto } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import { PhoneMock } from "./PhoneMock";

/**
 * Foto principal del producto sobre el panel oscuro. Las fotos de motos vienen recortadas sobre negro
 * (se funden con `mix-blend-lighten`); las subidas desde el panel se muestran tal cual.
 */
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
  const recorteSobreNegro = imagen.url.startsWith("/motos/");
  return (
    <Image
      src={imagen.url}
      alt={imagen.alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn(recorteSobreNegro ? "object-contain mix-blend-lighten" : "object-contain", className)}
    />
  );
}
