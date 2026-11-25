import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line-soft bg-surface",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-[0_10px_20px_rgba(0,229,255,0.1)]",
        className,
      )}
      {...props}
    />
  );
}
