import { cn } from "@/lib/cn";

/**
 * Logotipo de Inversiones JP: monograma "JP" con una flecha de crecimiento,
 * en SVG para que se vea nítido en cualquier tamaño y en fondo claro u oscuro.
 */
export function Logo({ tone = "dark", className, compact = false }: { tone?: "dark" | "light"; className?: string; compact?: boolean }) {
  const ink = tone === "dark" ? "text-fg" : "text-white";
  const sub = tone === "dark" ? "text-muted" : "text-white/70";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="11" fill="#0b3b8c" />
        <path d="M27 9 L33 9 L33 15" fill="none" stroke="#2fd39b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22.5 17.5 33 9" fill="none" stroke="#2fd39b" strokeWidth="2.6" strokeLinecap="round" />
        <text x="7" y="30" fontFamily="var(--font-jakarta), system-ui, sans-serif" fontSize="17" fontWeight="800" fill="#fff" letterSpacing="-0.5">
          JP
        </text>
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("text-[1.05rem] font-extrabold tracking-tight", ink)}>Inversiones JP</span>
          <span className={cn("mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]", sub)}>Créditos y préstamos</span>
        </span>
      )}
    </span>
  );
}
