"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useWhatsAppNormal } from "./EnlaceWhatsApp";

/**
 * Abre WhatsApp con el recordatorio de pago ya escrito para el celular del cliente
 * y deja constancia en el panel (quién lo envió y cuándo). En celulares con WhatsApp y WhatsApp Business
 * se abre siempre el WhatsApp normal.
 */
export function BotonRecordatorio({
  href,
  creditoId,
  tipo,
  registrar,
  ultimo,
  className,
}: {
  href: string | null;
  creditoId: string;
  tipo: string;
  registrar: (creditoId: string, tipo: string) => Promise<void>;
  ultimo?: { fecha: string; por: string | null } | null;
  className?: string;
}) {
  const [enviado, setEnviado] = useState(false);
  const wa = useWhatsAppNormal(href);
  const texto = tipo === "MORA" ? "Recordar pago vencido" : tipo === "VENCE_HOY" ? "Recordar cuota de hoy" : "Enviar recordatorio";
  const fecha = ultimo
    ? new Date(ultimo.fecha).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={cn("grid justify-items-start gap-1", className)}>
      {wa.href ? (
        <a
          href={wa.href}
          {...(wa.nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          onClick={() => {
            setEnviado(true);
            void registrar(creditoId, tipo);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white hover:brightness-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9C23.94 5.34 18.6 0 12.05 0Zm0 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.45 4.44-9.88 9.89-9.88 5.45 0 9.88 4.43 9.88 9.88 0 5.46-4.43 9.89-9.88 9.89Z" />
          </svg>
          {texto}
        </a>
      ) : (
        <span className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted" title="Registra un celular de 9 dígitos en la ficha del cliente">
          Sin celular válido
        </span>
      )}
      {(enviado || fecha) && (
        <span className="text-[0.7rem] text-muted">
          {enviado ? "Recordatorio abierto en WhatsApp" : `Último: ${fecha}${ultimo?.por ? ` · ${ultimo.por}` : ""}`}
        </span>
      )}
    </div>
  );
}
