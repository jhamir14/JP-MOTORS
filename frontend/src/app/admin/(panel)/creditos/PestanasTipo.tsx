import Link from "next/link";
import { cn } from "@/lib/cn";

/** Pestañas «Créditos (motos y celulares)» / «Préstamos de dinero» del módulo de créditos. */
export function PestanasTipo({ activo, base, q, cliente, conteos }: {
  activo: "credito" | "prestamo";
  base: string;
  q?: string;
  cliente?: string;
  conteos?: { credito: number; prestamo: number };
}) {
  const href = (tipo: "credito" | "prestamo") => {
    const p = new URLSearchParams();
    if (tipo === "prestamo") p.set("tipo", "prestamo");
    if (q) p.set("q", q);
    if (cliente) p.set("cliente", cliente);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const tabs = [
    { id: "credito" as const, label: "🏍 Créditos", extra: " de motos y celulares" },
    { id: "prestamo" as const, label: "💵 Préstamos", extra: " de dinero" },
  ];
  return (
    <nav aria-label="Tipo" className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <Link key={t.id} href={href(t.id)} aria-current={activo === t.id ? "page" : undefined}
          className={cn("flex-1 rounded-xl px-3 py-2.5 sm:px-4 text-center text-sm font-semibold whitespace-nowrap transition-colors",
            activo === t.id ? "bg-surface text-brand shadow-card" : "text-muted hover:text-fg")}>
          {t.label}<span className="hidden sm:inline">{t.extra}</span>
          {conteos && <span className="ml-1.5 text-xs font-medium text-muted">({conteos[t.id]})</span>}
        </Link>
      ))}
    </nav>
  );
}
