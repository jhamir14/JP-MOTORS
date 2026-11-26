"use client";
import { useState, type ReactNode } from "react";
import type { EstadoAccion } from "@/lib/admin/accion";
import { AdminForm, BotonEnviar, ErrorCampo } from "./AdminForm";

/**
 * Zona de peligro: botón «Eliminar…» que despliega la advertencia y pide escribir ELIMINAR.
 * El borrado es definitivo; la acción del servidor vuelve a verificar el rol y la confirmación.
 */
export function ConfirmarEliminar({ action, id, titulo, children }: {
  action: (prev: EstadoAccion, fd: FormData) => Promise<EstadoAccion>;
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-danger/40 px-3.5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
        </svg>
        {titulo}
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={titulo} className="rounded-2xl border border-danger/40 bg-danger/5 p-4">
      <p className="mb-1 font-semibold text-danger">{titulo}</p>
      <div className="mb-3 text-sm text-fg">{children}</div>
      <AdminForm action={action} className="flex flex-wrap items-start gap-2">
        <input type="hidden" name="id" value={id} />
        <div className="min-w-0 flex-1 basis-48">
          <label htmlFor={`confirmar-${id}`} className="sr-only">Escribe ELIMINAR para confirmar</label>
          <input
            id={`confirmar-${id}`}
            name="confirmacion"
            autoComplete="off"
            placeholder="Escribe ELIMINAR"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm uppercase outline-none focus:border-danger"
          />
          <ErrorCampo name="confirmacion" />
        </div>
        <BotonEnviar size="sm" className="bg-danger shadow-none hover:bg-danger/90" pendiente="Eliminando…">Eliminar definitivamente</BotonEnviar>
        <button type="button" onClick={() => setAbierto(false)} className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-fg">
          Cancelar
        </button>
      </AdminForm>
    </div>
  );
}
