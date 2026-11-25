import { dbConfigurada, sql } from "@/lib/server/db";
import { obtenerSesion } from "@/lib/server/auth";

/**
 * Sirve las imágenes del catálogo subidas desde el panel (tabla `archivo`).
 * Público solo si la imagen pertenece a un producto publicado; el personal con sesión ve también las de borradores.
 * El id es inmutable (un archivo nuevo = id nuevo), así que se puede cachear largo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!dbConfigurada || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return new Response("No encontrado", { status: 404 });
  }

  const [archivo] = await sql()<{ tipo_mime: string; datos: Buffer; publico: boolean }[]>`
    select a.tipo_mime, a.datos,
           exists (select 1 from public.imagen_producto i join public.producto_catalogo p on p.id = i.producto_id
                   where i.url = ${`/api/archivos/${id}`} and p.publicado) as publico
    from public.archivo a where a.id = ${id}`;
  if (!archivo) return new Response("No encontrado", { status: 404 });
  if (!archivo.publico && !(await obtenerSesion())) return new Response("No encontrado", { status: 404 });

  return new Response(new Uint8Array(archivo.datos), {
    headers: {
      "Content-Type": archivo.tipo_mime,
      "Content-Length": String(archivo.datos.length),
      "Cache-Control": archivo.publico ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
