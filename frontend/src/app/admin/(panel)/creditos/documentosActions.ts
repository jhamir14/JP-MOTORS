"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { datosDe, exito, fallo, mensajeErrorBD, type EstadoAccion } from "@/lib/admin/accion";
import { ROLES_CREDITOS } from "@/lib/creditos";
import { ROLES_DOCUMENTOS_LEGALES, TIPOS_DOCUMENTO_FIRMADO } from "@/lib/documentos";
import { detectarTipo } from "@/lib/server/archivos";
import { comoUsuario, requerirSesion } from "@/lib/server/auth";

const MAX_DOC = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Guarda de forma privada un documento firmado del crédito (contrato, pagaré, acta… escaneados o en foto). */
export async function subirDocumentoCredito(_prev: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sesion = await requerirSesion(...ROLES_DOCUMENTOS_LEGALES);
  const p = z.object({ creditoId: z.string().uuid(), tipo: z.enum(TIPOS_DOCUMENTO_FIRMADO) }).safeParse(datosDe(fd));
  if (!p.success) return fallo("Datos del documento no válidos.");
  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return fallo("Elige un archivo o toma una foto.", { archivo: "Elige un archivo" });
  if (archivo.size > MAX_DOC) return fallo("El archivo pesa más de 10 MB.", { archivo: "Máximo 10 MB" });
  const datos = Buffer.from(await archivo.arrayBuffer());
  const tipoMime = detectarTipo(datos);
  if (!tipoMime || !TIPOS_PERMITIDOS.includes(tipoMime))
    return fallo("Solo se aceptan fotos JPG, PNG o WEBP y archivos PDF.", { archivo: "Formato no permitido" });

  try {
    const r = await comoUsuario(sesion, async (tx) => {
      const [cr] = await tx<{ estado: string }[]>`select estado from public.credito where id = ${p.data.creditoId}`;
      if (!cr) return "El crédito no existe.";
      await tx`
        insert into public.documento_credito ${tx({
          credito_id: p.data.creditoId,
          tipo: p.data.tipo,
          nombre: (archivo.name || "documento").slice(0, 120),
          tipo_mime: tipoMime,
          tamano: datos.length,
          sha256: createHash("sha256").update(datos).digest("hex"),
          datos,
          subido_por: sesion.usuarioId,
        })}`;
      return null;
    });
    if (r) return fallo(r);
  } catch (e) {
    return fallo(mensajeErrorBD(e));
  }
  revalidatePath(`/admin/creditos/${p.data.creditoId}`);
  return exito("Documento guardado de forma privada.");
}

/** Elimina un documento subido por error (solo admins; queda en la auditoría). */
export async function eliminarDocumentoCredito(fd: FormData) {
  const sesion = await requerirSesion(...ROLES_CREDITOS);
  const id = z.string().uuid().parse(fd.get("id"));
  const creditoId = await comoUsuario(sesion, async (tx) => {
    const [doc] = await tx<{ credito_id: string }[]>`delete from public.documento_credito where id = ${id} returning credito_id`;
    return doc?.credito_id;
  });
  if (creditoId) revalidatePath(`/admin/creditos/${creditoId}`);
}
