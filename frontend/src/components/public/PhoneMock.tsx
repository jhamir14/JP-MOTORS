import { cn } from "@/lib/cn";

const acabados: Record<string, string> = {
  Apple: "from-[#4a4f5c] to-[#16191f]",
  Samsung: "from-[#2b5bd6] to-[#0c2466]",
  Xiaomi: "from-[#3b3f4a] to-[#121419]",
  Honor: "from-[#2a8f9a] to-[#0b4a52]",
  Motorola: "from-[#5b6cff] to-[#26307a]",
};

/**
 * Ilustración de un celular para los modelos que aún no tienen foto.
 * En cuanto se sube una foto desde el panel (/admin/catalogo) se muestra la foto.
 */
export function PhoneMock({ marca, modelo, className }: { marca: string; modelo: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[9/19] w-[34%] min-w-[84px] max-w-[132px]", className)} aria-hidden>
      <div className={cn("absolute inset-0 rounded-[20%/9.5%] bg-gradient-to-br p-[5%] shadow-[0_30px_50px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/15", acabados[marca] ?? "from-[#4b5563] to-[#111827]")}>
        <div className="relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[17%/8%] bg-[radial-gradient(120%_80%_at_20%_0%,#1c6bff_0%,#0a1f4d_45%,#050e24_100%)] px-2 text-center">
          <span className="absolute top-[3.5%] h-[3%] w-[28%] rounded-full bg-black/80" />
          <span className="absolute -right-1/3 -bottom-1/4 size-[90%] rounded-full border border-oro/40" />
          <span className="text-[0.55rem] font-semibold text-white/60">{marca}</span>
          <span className="text-[0.78rem] leading-tight font-bold text-white">{modelo}</span>
        </div>
      </div>
    </div>
  );
}
