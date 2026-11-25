import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, interactive, ...props }: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card",
        interactive && "transition-all duration-200 hover:-translate-y-1 hover:border-line hover:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}
