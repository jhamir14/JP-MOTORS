import "server-only";
import type postgres from "postgres";
import { categoriasDe, puedeVerTipo } from "@/lib/areas";
import type { Sesion } from "./auth";
import { sql } from "./db";

type Db = postgres.Sql | postgres.TransactionSql;

/** true si el crédito existe y es del área de quien está en sesión (los roles sin área ven todos). */
export async function creditoEnArea(sesion: Pick<Sesion, "rol">, creditoId: string, db: Db = sql()): Promise<boolean> {
  const [cr] = await db<{ tipo: string }[]>`select tipo::text from public.credito where id = ${creditoId}`;
  return !!cr && puedeVerTipo(sesion.rol, cr.tipo);
}

/** Igual que creditoEnArea, partiendo de un pago. */
export async function pagoEnArea(sesion: Pick<Sesion, "rol">, pagoId: string, db: Db = sql()): Promise<boolean> {
  const [cr] = await db<{ tipo: string }[]>`
    select cr.tipo::text from public.pago p join public.credito cr on cr.id = p.credito_id where p.id = ${pagoId}`;
  return !!cr && puedeVerTipo(sesion.rol, cr.tipo);
}

/** true si el producto del catálogo existe y su categoría es del área de quien está en sesión. */
export async function productoEnArea(sesion: Pick<Sesion, "rol">, productoId: string, db: Db = sql()): Promise<boolean> {
  const [p] = await db<{ categoria: string }[]>`select categoria::text from public.producto_catalogo where id = ${productoId}`;
  return !!p && categoriasDe(sesion.rol).includes(p.categoria);
}
