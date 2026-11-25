import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ErrorCampo } from "./AdminForm";

/** Piezas de interfaz del panel (servidor). */

export function Encabezado({ titulo, children, acciones }: { titulo: string; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-[1.7rem] md:text-[2rem]">{titulo}</h1>
        {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Panel({ titulo, children, className, acciones }: { titulo?: string; children: ReactNode; className?: string; acciones?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line-soft bg-surface p-5 shadow-card md:p-6", className)}>
      {(titulo || acciones) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-lg">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

const ctlCls = (extra?: string) => cn(inputClasses(), "py-2.5 text-sm", extra);

type CampoBase = { label: string; name: string; hint?: ReactNode; className?: string };

export function CampoTexto({ label, name, hint, className, ...props }: CampoBase & ComponentProps<"input">) {
  return (
    <div className={className}>
      <label htmlFor={props.id ?? name} className="mb-1 block text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <input id={props.id ?? name} name={name} aria-describedby={`${name}-error`} className={ctlCls()} {...props} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ErrorCampo name={name} />
    </div>
  );
}

export function CampoSelect({ label, name, hint, className, opciones, ...props }: CampoBase & ComponentProps<"select"> & { opciones: readonly (string | { value: string; label: string })[] }) {
  return (
    <div className={className}>
      <label htmlFor={props.id ?? name} className="mb-1 block text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <select id={props.id ?? name} name={name} className={ctlCls("cursor-pointer")} {...props}>
        {opciones.map((o) =>
          typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>,
        )}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ErrorCampo name={name} />
    </div>
  );
}

export function CampoArea({ label, name, hint, className, ...props }: CampoBase & ComponentProps<"textarea">) {
  return (
    <div className={className}>
      <label htmlFor={props.id ?? name} className="mb-1 block text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <textarea id={props.id ?? name} name={name} rows={4} className={ctlCls("resize-y")} {...props} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ErrorCampo name={name} />
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Tabla({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line-soft bg-surface shadow-card", className)}>
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_thead]:bg-surface-2 [&_tr]:border-b [&_tr]:border-line-soft [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

const TONOS_ESTADO: Record<string, "brand" | "accent" | "gold" | "outline"> = {
  NUEVA: "gold", PENDIENTE: "gold", CONTACTADA: "brand", EN_ATENCION: "brand", EVALUADA: "brand",
  CONVERTIDA: "accent", RESPONDIDO: "accent", EN_STOCK: "accent", RESERVADO: "gold",
  DESCARTADA: "outline", DADO_DE_BAJA: "outline", VENDIDO_CREDITO: "brand", VENDIDO_CONTADO: "brand", INCAUTADO_MORA: "outline",
  VIGENTE: "brand", APROBADO: "brand", EN_MORA: "gold", REFINANCIADO: "brand", FINALIZADO_LIQUIDADO: "accent", ANULADO: "outline",
  PAGADA: "accent", PAGADA_PARCIAL: "brand",
};

export function Estado({ valor }: { valor: string }) {
  return <Badge tone={TONOS_ESTADO[valor] ?? "outline"}>{valor.replace(/_/g, " ").toLowerCase()}</Badge>;
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-muted">{children}</p>;
}

export const fechaCorta = (d: Date | string) =>
  new Date(d).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
