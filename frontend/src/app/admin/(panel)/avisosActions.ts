"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { requerirSesion } from "@/lib/server/auth";
import { enviarAviso, guardarSuscripcion, quitarSuscripcion } from "@/lib/server/push";

const suscripcionSchema = z.object({
  endpoint: z.string().url().max(1000).refine((u) => u.startsWith("https://"), "Endpoint no válido"),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Guarda la suscripción push de este navegador para el usuario conectado. */
export async function suscribirAvisos(datos: unknown): Promise<{ ok: boolean }> {
  const sesion = await requerirSesion();
  const s = suscripcionSchema.safeParse(datos);
  if (!s.success) return { ok: false };
  await guardarSuscripcion(sesion.usuarioId, s.data, (await headers()).get("user-agent"));
  return { ok: true };
}

export async function desuscribirAvisos(endpoint: string): Promise<{ ok: boolean }> {
  const sesion = await requerirSesion();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { ok: false };
  await quitarSuscripcion(sesion.usuarioId, endpoint);
  return { ok: true };
}

/** Envía un aviso de prueba a los dispositivos del usuario conectado. */
export async function probarAviso(): Promise<{ ok: boolean; enviados: number }> {
  const sesion = await requerirSesion();
  const r = await enviarAviso(
    { titulo: "Avisos activados · Inversiones JP", cuerpo: "Así te llegarán los avisos de cobranza, aunque el panel esté cerrado.", url: "/admin/cobranzas", etiqueta: "jp-prueba" },
    sesion.usuarioId,
  );
  return { ok: r.enviados > 0, enviados: r.enviados };
}
