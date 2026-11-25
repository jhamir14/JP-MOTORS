import { cn } from "@/lib/cn";

const acabados: Record<string, string> = {
  Apple: "from-[#3a3f4b] to-[#15181f]",
  Samsung: "from-[#2f5fd0] to-[#0d2a6e]",
  Xiaomi: "from-[#ff8a3d] to-[#c2410c]",
  Honor: "from-[#1fb5a8] to-[#0b5f63]",
  Motorola: "from-[#5b6cff] to-[#26307a]",
};

/**
 * Ilustración de un celular para los modelos que aún no tienen foto.
 * En cuanto se sube una foto desde el panel (/admin/catalogo) se muestra la foto.
 */
export function PhoneMock({ marca, modelo, className }: { marca: string; modelo: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[9/16] w-[38%] min-w-[92px] max-w-[130px]", className)} aria-hidden>
      <div className={cn("absolute inset-0 rounded-[22%/12%] bg-gradient-to-br p-[6%] shadow-[0_20px_40px_rgba(0,0,0,0.35)]", acabados[marca] ?? "from-[#4b5563] to-[#111827]")}>
        <div className="relative flex h-full flex-col items-center justify-between rounded-[18%/10%] bg-[linear-gradient(160deg,#0f2a5c_0%,#071d45_55%,#0c9a6a_140%)] px-2 py-[18%] text-center">
          <span className="absolute top-[4%] h-[3.5%] w-[30%] rounded-full bg-black/70" />
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/60">{marca}</span>
          <span className="text-[0.8rem] leading-tight font-bold text-white">{modelo}</span>
          <span className="h-1 w-1/3 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
