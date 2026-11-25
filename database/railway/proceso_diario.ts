/**
 * Inversiones JP · Job diario (Railway Function con cron, runtime Bun).
 *
 * Ejecuta public.proceso_diario(): mora del día (penalidad diaria × días de atraso que pasan la gracia),
 * cuotas vencidas → EN_MORA, estado de cada crédito y perfil/score de cada cliente. Corre una sola vez por día
 * (hora de Lima): si el panel ya lo disparó ese día, no hace nada.
 *
 * Despliegue: Railway Function en el proyecto de la base, con
 *   DATABASE_URL = ${{Postgres.DATABASE_URL}}   (red privada; nunca un valor escrito a mano)
 *   cron: 15 5 * * *                            (05:15 UTC = 00:15 en Lima)
 * Los logs solo muestran conteos: ningún dato personal.
 */
import { SQL } from "bun";

const url = Bun.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");
const db = new SQL(url);

try {
  const [r] = await db`select public.proceso_diario() as corrio, public.hoy_lima()::text as hoy`;
  const [c] = await db`
    select (select count(*) from public.credito where estado = 'EN_MORA')::int as creditos_en_mora,
           (select count(*) from public.cuota where estado = 'EN_MORA')::int as cuotas_en_mora,
           (select coalesce(sum(mora), 0) from public.cuota where estado <> 'PAGADA')::float8 as mora_pendiente`;
  console.log(`proceso diario ${r.hoy}: ${r.corrio ? "ejecutado" : "ya se había ejecutado hoy"}`, c);
} finally {
  await db.close();
}
