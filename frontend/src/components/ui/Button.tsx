import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "brand" | "secondary" | "outline" | "whatsapp" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_6px_16px_rgba(12,154,106,0.25)] hover:bg-accent-hover hover:-translate-y-px",
  brand: "bg-brand text-white shadow-[0_6px_16px_rgba(11,59,140,0.25)] hover:bg-brand-hover hover:-translate-y-px",
  secondary: "bg-brand-soft text-brand hover:bg-[#d9e5fa]",
  outline: "bg-surface text-fg border border-line hover:border-brand hover:text-brand",
  whatsapp: "bg-whatsapp text-white hover:brightness-95",
  ghost: "bg-transparent text-muted hover:text-fg",
  light: "bg-white text-brand-ink hover:bg-white/90",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-6 py-3 text-[0.95rem]",
  lg: "px-7 py-4 text-base",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const buttonClasses = ({ variant = "primary", size = "md", block }: StyleProps = {}, extra?: string) =>
  cn(base, variants[variant], sizes[size], block && "w-full", extra);

export function Button({ variant, size, block, className, ...props }: StyleProps & ComponentProps<"button">) {
  return <button className={buttonClasses({ variant, size, block }, className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses({ variant, size, block }, className)} {...props} />;
}

/** Enlace externo (WhatsApp, etc.) que abre en pestaña nueva. */
export function ExternalButton({ variant, size, block, className, ...props }: StyleProps & ComponentProps<"a">) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant, size, block }, className)} {...props} />
  );
}
