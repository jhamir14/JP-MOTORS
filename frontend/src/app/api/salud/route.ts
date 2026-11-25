import { NextResponse } from "next/server";
import { dbConfigurada, sql } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Estado del servicio para monitoreo: comprueba que la base de datos responda. No expone datos. */
export async function GET() {
  if (!dbConfigurada) return NextResponse.json({ ok: false, baseDeDatos: "sin configurar" }, { status: 503 });
  const inicio = Date.now();
  try {
    await sql()`select 1`;
    return NextResponse.json({ ok: true, baseDeDatos: "ok", latenciaMs: Date.now() - inicio });
  } catch (e) {
    console.error("[salud] La base de datos no responde:", e);
    return NextResponse.json({ ok: false, baseDeDatos: "error" }, { status: 503 });
  }
}
