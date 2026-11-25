import "server-only";
import type postgres from "postgres";
import type { CuotaCobro } from "@/lib/pagos";
import { sql } from "./db";

type Db = postgres.Sql | postgres.TransactionSql;

/** Cuotas del crédito con lo cobrado por concepto (solo pagos no anulados), en orden de vencimiento. */
export async function cuotasCobro(db: Db, creditoId: string): Promise<CuotaCobro[]> {
  return db<CuotaCobro[]>`
    select cu.id, cu.numero, to_char(cu.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
           cu.interes::float8, cu.capital::float8, cu.mora::float8,
           coalesce(a.mora, 0)::float8 as "moraPagada", coalesce(a.interes, 0)::float8 as "interesPagado",
           coalesce(a.capital, 0)::float8 as "capitalPagado", (cu.estado = 'PAGADA') as pagada
    from public.cuota cu
    left join lateral (
      select sum(ap.mora) as mora, sum(ap.interes) as interes, sum(ap.capital) as capital
      from public.aplicacion_pago ap join public.pago p on p.id = ap.pago_id
      where ap.cuota_id = cu.id and not p.anulado
    ) a on true
    where cu.credito_id = ${creditoId}
    order by cu.fecha_vencimiento, cu.numero`;
}

/**
 * Cálculo diario de mora y estados (una vez por día, hora de Lima). Lo dispara el panel al abrirse:
 * así la mora está al día aunque el job programado no haya corrido. Nunca interrumpe la página.
 */
export async function asegurarProcesoDiario(): Promise<void> {
  try {
    await sql()`select public.proceso_diario()`;
  } catch (e) {
    console.error("[pagos] No se pudo ejecutar el proceso diario:", e);
  }
}
