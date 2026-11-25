"use client";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";

const LADO_MAX = 2000; // px
const UMBRAL_BYTES = 1.5 * 1024 * 1024;

/**
 * Reduce en el navegador las fotos grandes tomadas con el celular (JPEG, lado máximo 2000 px) antes de subirlas:
 * menos datos móviles para el asesor y menos espacio en la base. Los PDF se suben tal cual.
 */
export async function comprimir(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= UMBRAL_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // formato que el navegador no decodifica (ej. HEIC): lo valida el servidor
  }
}

export function SubirDocumento({
  action,
  dueño,
  tipos,
  volverA,
}: {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  dueño: { clienteId: string } | { garanteId: string };
  tipos: { value: string; label: string; cargado?: boolean }[];
  volverA?: string;
}) {
  const [estado, dispatch, pendiente] = useActionState(action, null);
  const [preparando, setPreparando] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const idBase = "clienteId" in dueño ? `c-${dueño.clienteId}` : `g-${dueño.garanteId}`;

  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivo = fd.get("archivo");
    if (archivo instanceof File && archivo.size > 0) {
      setPreparando(true);
      fd.set("archivo", await comprimir(archivo));
      setPreparando(false);
    }
    startTransition(() => dispatch(fd));
  };

  const ocupado = pendiente || preparando;
  return (
    <form ref={ref} onSubmit={onSubmit} aria-busy={ocupado} className="grid gap-3">
      {"clienteId" in dueño ? <input type="hidden" name="clienteId" value={dueño.clienteId} /> : <input type="hidden" name="garanteId" value={dueño.garanteId} />}
      {volverA && <input type="hidden" name="volverA" value={volverA} />}
      <div>
        <label htmlFor={`${idBase}-tipo`} className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Documento</label>
        <select id={`${idBase}-tipo`} name="tipo" className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>{t.label}{t.cargado ? " (reemplazar)" : ""}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor={`${idBase}-archivo`} className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Foto o PDF (máx. 8 MB)</label>
        <input
          id={`${idBase}-archivo`}
          name="archivo"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full min-w-0 text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
        />
      </div>
      <Button type="submit" size="sm" variant="brand" disabled={ocupado} className="justify-self-start">
        {preparando ? "Preparando…" : pendiente ? "Subiendo…" : "Subir"}
      </Button>
      {estado?.mensaje && (
        <p role={estado.ok ? "status" : "alert"} className={cn("rounded-lg px-3 py-2 text-xs font-medium", estado.ok ? "bg-accent-soft text-accent" : "bg-danger/10 text-danger")}>
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
