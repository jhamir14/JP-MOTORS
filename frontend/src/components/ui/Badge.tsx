import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "brand" | "accent" | "gold" | "outline" | "dark";

const tones: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-[#8a5d00]",
  outline: "border border-line text-muted bg-surface",
  dark: "bg-white/10 text-white backdrop-blur",
};

export function Badge({ tone = "brand", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
