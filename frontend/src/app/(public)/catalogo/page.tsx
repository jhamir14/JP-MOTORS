import { redirect } from "next/navigation";
import { hrefLinea, LINEAS, type LineaId } from "@/lib/catalogo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** El catálogo general se dividió en /motos y /celulares; se mantiene la ruta para enlaces antiguos. */
export default async function CatalogoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const linea = Array.isArray(sp.linea) ? sp.linea[0] : sp.linea;
  redirect(linea && LINEAS.some((l) => l.id === linea) ? hrefLinea(linea as LineaId) : "/motos");
}
