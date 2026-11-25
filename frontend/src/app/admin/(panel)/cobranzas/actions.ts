"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const schema = z.object({
  creditoId: z.string().uuid(),
  tipo: z.enum(["MORA", "VENCE_HOY", "POR_VENCER", "AL_DIA"]),
});

/** Deja constancia de que alguien del personal abrió WhatsApp para enviar un recordatorio de pago. */
export async function registrarRecordatorio(creditoId: string, tipo: string): Promise<void> {
  const sesion = await requerirSesion();
  const parsed = schema.safeParse({ creditoId, tipo });
  if (!parsed.success) return;
  try {
    await comoUsuario(sesion, (tx) => tx`
      insert into public.recordatorio_pago (credito_id, tipo, enviado_por)
      values (${parsed.data.creditoId}, ${parsed.data.tipo}, ${sesion.usuarioId})`);
  } catch (e) {
    console.error("[cobranzas] No se pudo registrar el recordatorio:", e);
    return;
  }
  revalidatePath("/admin/cobranzas");
  revalidatePath("/admin/clientes", "layout");
}
