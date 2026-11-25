"use client";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import type { EstadoAccion } from "@/lib/admin/accion";
import { cn } from "@/lib/cn";
import { comprimir } from "./SubirDocumento";

/** Sube el contrato, pagaré o acta firmados (foto o PDF; las fotos grandes se reducen en el celular). */
export function SubirDocumentoCredito({
  action,
  creditoId,
  tipos,
}: {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  creditoId: string;
  tipos: { value: string; label: string }[];
}) {
  const [estado, dispatch, pendiente] = useActionState(action, null);
  const [preparando, setPreparando] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

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
    <form ref={ref} onSubmit={onSubmit} aria-busy={ocupado} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
      <input type="hidden" name="creditoId" value={creditoId} />
      <div>
        <label htmlFor="doc-credito-tipo" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Documento firmado</label>
        <select id="doc-credito-tipo" name="tipo" className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="doc-credito-archivo" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">Foto o PDF (máx. 10 MB)</label>
        <input
          id="doc-credito-archivo"
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
        <p role={estado.ok ? "status" : "alert"} className={cn("rounded-lg px-3 py-2 text-xs font-medium sm:col-span-3", estado.ok ? "bg-accent-soft text-accent" : "bg-danger/10 text-danger")}>
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
