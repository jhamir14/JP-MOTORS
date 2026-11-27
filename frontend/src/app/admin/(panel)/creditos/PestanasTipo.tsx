import Link from "next/link";
import type { TipoCredito } from "@/lib/areas";
import { cn } from "@/lib/cn";

/** Las tres vistas del módulo de créditos: motos, celulares y préstamos de dinero. */
export const VISTAS = [
  { id: "motos", tipo: "CREDITO_VEHICULAR", label: "🏍 Motos", extra: ", motokar y toritos" },
  { id: "celulares", tipo: "CREDITO_CELULAR", label: "📱 Celulares", extra: "" },
  { id: "prestamo", tipo: "PRESTAMO_EFECTIVO", label: "💵 Préstamos", extra: " de dinero" },
] as const satisfies readonly { id: string; tipo: TipoCredito; label: string; extra: string }[];
export type Vista = (typeof VISTAS)[number]["id"];

/** Vista pedida en la URL (?tipo=motos|celulares|prestamo; también acepta los nombres de la base). */
export function vistaDeParam(tipo: string | undefined): Vista | null {
  const v = VISTAS.find((x) => x.id === tipo || x.tipo === tipo);
  return v?.id ?? null;
}
export const tipoDeVista = (v: Vista): TipoCredito => VISTAS.find((x) => x.id === v)!.tipo;
export const vistaDeTipo = (t: TipoCredito): Vista => VISTAS.find((x) => x.tipo === t)!.id;

export function PestanasTipo({ activo, base, q, cliente, conteos, visibles }: {
  activo: Vista;
  base: string;
  q?: string;
  cliente?: string;
  conteos?: Partial<Record<Vista, number>>;
  /** Pestañas que puede abrir quien está en sesión (cada administrador de área, solo la suya). */
  visibles?: readonly TipoCredito[];
}) {
  const tabs = VISTAS.filter((t) => !visibles || visibles.includes(t.tipo));
  if (tabs.length < 2) return null;
  const href = (vista: Vista) => {
    const p = new URLSearchParams({ tipo: vista });
    if (q) p.set("q", q);
    if (cliente) p.set("cliente", cliente);
    return `${base}?${p}`;
  };
  return (
    <nav aria-label="Tipo" className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <Link key={t.id} href={href(t.id)} aria-current={activo === t.id ? "page" : undefined}
          className={cn("flex-1 rounded-xl px-3 py-2.5 sm:px-4 text-center text-sm font-semibold whitespace-nowrap transition-colors",
            activo === t.id ? "bg-surface text-brand shadow-card" : "text-muted hover:text-fg")}>
          {t.label}<span className="hidden lg:inline">{t.extra}</span>
          {conteos && <span className="ml-1.5 text-xs font-medium text-muted">({conteos[t.id] ?? 0})</span>}
        </Link>
      ))}
    </nav>
  );
}
