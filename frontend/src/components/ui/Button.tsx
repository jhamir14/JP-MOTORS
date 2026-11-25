import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "whatsapp" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black shadow-[0_4px_20px_rgba(0,229,255,0.3)] hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(0,229,255,0.5)]",
  secondary: "bg-white/5 text-fg border border-line hover:border-accent hover:text-accent",
  outline: "bg-transparent text-fg border border-white/20 hover:bg-white/5",
  whatsapp: "bg-transparent text-whatsapp border-2 border-whatsapp hover:bg-whatsapp hover:text-white",
  ghost: "bg-transparent text-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-7 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Texto en mayúsculas con tracking (por defecto). */
  caps?: boolean;
}

export const buttonClasses = ({ variant = "primary", size = "md", block, caps = true }: StyleProps = {}, extra?: string) =>
  cn(base, variants[variant], sizes[size], block && "w-full", caps && "uppercase tracking-wide", extra);

export function Button({ variant, size, block, caps, className, ...props }: StyleProps & ComponentProps<"button">) {
  return <button className={buttonClasses({ variant, size, block, caps }, className)} {...props} />;
}

export function ButtonLink({ variant, size, block, caps, className, ...props }: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses({ variant, size, block, caps }, className)} {...props} />;
}

/** Enlace externo (WhatsApp, etc.) que abre en pestaña nueva. */
export function ExternalButton({ variant, size, block, caps, className, ...props }: StyleProps & ComponentProps<"a">) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant, size, block, caps }, className)}
      {...props}
    />
  );
}
