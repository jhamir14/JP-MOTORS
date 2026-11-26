import { NextResponse, type NextRequest } from "next/server";
import { dbConfigurada } from "@/lib/server/db";
import { enviarAvisoCobranza, type Tramo } from "@/lib/server/push";

export const dynamic = "force-dynamic";

/**
 * Tarea programada (Vercel Cron, ver vercel.json): avisa por notificación push al personal cuántas cuotas
 * vencen hoy y cuántas están en mora. Mañana (8:00 Lima) y tarde (15:00 Lima).
 * Con CRON_SECRET definida, solo responde a quien envía «Authorization: Bearer <CRON_SECRET>» (Vercel lo hace solo).
 * Aunque se llame varias veces, cada tramo se envía una sola vez por día.
 */
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!dbConfigurada) return NextResponse.json({ ok: false, error: "sin base de datos" }, { status: 503 });
  const t = request.nextUrl.searchParams.get("tramo");
  const tramo: Tramo | undefined = t === "manana" || t === "tarde" ? t : undefined;
  try {
    const r = await enviarAvisoCobranza(tramo);
    console.log("[cron] avisos de cobranza:", r);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[cron] No se pudieron enviar los avisos:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
