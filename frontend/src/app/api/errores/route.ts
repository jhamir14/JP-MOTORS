import { NextResponse } from "next/server";
import { z } from "zod";
import { ipDe, permitirIntentoCompartido } from "@/lib/server/limite";
import { registrarError } from "@/lib/server/errores";

/**
 * Errores del navegador (pantallas de error del panel y de la web). Público pero limitado:
 * 20 reportes por IP cada 10 minutos; los textos se sanitizan antes de guardarse.
 */
const schema = z.object({
  origen: z.enum(["panel", "web"]),
  mensaje: z.string().max(2000),
  ruta: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  if (!(await permitirIntentoCompartido(`error_cliente:${ipDe(request.headers)}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await registrarError({ ...parsed.data, tipoRuta: "cliente" });
  return NextResponse.json({ ok: true });
}
