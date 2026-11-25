import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "outline";

const tones: Record<Tone, string> = {
  accent: "bg-accent text-black font-extrabold",
  outline: "border border-line text-muted",
};

export function Badge({ tone = "accent", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1 text-xs", tones[tone], className)} {...props} />;
}
