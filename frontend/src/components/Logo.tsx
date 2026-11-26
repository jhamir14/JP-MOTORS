import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Logotipo oficial de Inversiones JP (insignia circular con anillo dorado).
 * `tone` define el color del texto que acompaña a la insignia; `compact` muestra solo la insignia.
 */
export function Logo({
  tone = "dark",
  className,
  compact = false,
  size = 44,
  priority = false,
}: {
  tone?: "dark" | "light";
  className?: string;
  compact?: boolean;
  size?: number;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/marca/logo-inversiones-jp.webp"
        alt={compact ? "Inversiones JP" : ""}
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 rounded-full shadow-[0_6px_18px_-6px_rgba(5,14,36,0.6)]"
        style={{ width: size, height: size }}
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn("text-[1.02rem] font-extrabold tracking-tight", tone === "dark" ? "text-tinta" : "text-white")}
            style={{ fontVariationSettings: '"wdth" 118' }}
          >
            Inversiones JP
          </span>
          <span className={cn("mt-1 text-[0.72rem] font-medium", tone === "dark" ? "text-pizarra" : "text-oro-claro/80")}>
            Financiamiento directo
          </span>
        </span>
      )}
    </span>
  );
}
