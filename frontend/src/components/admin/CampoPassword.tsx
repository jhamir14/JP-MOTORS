"use client";
import { useId, useState, type ComponentProps } from "react";
import { inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ErrorCampo } from "./AdminForm";

/** Fuerza orientativa de una contraseña (0–4). La regla que se exige está en src/lib/server/password.ts. */
export function fuerzaPassword(v: string): number {
  if (!v) return 0;
  let p = 0;
  if (v.length >= 10) p++;
  if (v.length >= 14) p++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) p++;
  if (/\d/.test(v) && /[^a-zA-Z\d]/.test(v)) p++;
  if (v.length < 10 || !/[a-zA-Z]/.test(v) || !/\d/.test(v)) p = Math.min(p, 1);
  return Math.max(1, Math.min(p, 4));
}

const NIVELES = [
  { texto: "", color: "" },
  { texto: "Débil", color: "bg-danger" },
  { texto: "Aceptable", color: "bg-gold" },
  { texto: "Buena", color: "bg-brand" },
  { texto: "Muy segura", color: "bg-accent" },
];

/** Campo de contraseña con botón para mostrarla y, opcionalmente, medidor de fuerza. */
export function CampoPassword({
  label,
  name,
  hint,
  medidor = false,
  className,
  ...props
}: { label: string; name: string; hint?: string; medidor?: boolean; className?: string } & Omit<ComponentProps<"input">, "type" | "name">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [valor, setValor] = useState("");
  const fuerza = medidor ? fuerzaPassword(valor) : 0;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          aria-describedby={`${name}-error`}
          onChange={(e) => setValor(e.target.value)}
          className={cn(inputClasses(), "py-2.5 pr-12 text-sm")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-muted transition-colors hover:text-brand"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {visible ? (
              <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
            ) : (
              <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>
            )}
          </svg>
        </button>
      </div>
      {medidor && (
        <div className="mt-2" aria-live="polite">
          <div className="grid grid-cols-4 gap-1" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={cn("h-1 rounded-full transition-colors duration-300", n <= fuerza ? NIVELES[fuerza].color : "bg-line-soft")} />
            ))}
          </div>
          <p className="mt-1 flex justify-between text-xs text-muted">
            <span>{hint}</span>
            {fuerza > 0 && <span className="font-semibold text-fg">{NIVELES[fuerza].texto}</span>}
          </p>
        </div>
      )}
      {!medidor && hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ErrorCampo name={name} />
    </div>
  );
}
