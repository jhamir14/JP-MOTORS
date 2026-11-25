import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClasses = (invalid?: boolean) =>
  cn(
    "w-full rounded-lg border bg-white/[0.03] px-3.5 py-3.5 text-fg outline-none transition-colors placeholder:text-muted/60 focus:border-accent",
    invalid ? "border-red-400" : "border-line",
  );

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Etiqueta + control + mensaje de error/ayuda accesibles. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ invalid, className, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(inputClasses(invalid), className)} {...props} />;
}

export function Select({ invalid, className, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} className={cn(inputClasses(invalid), "cursor-pointer", className)} {...props} />;
}
