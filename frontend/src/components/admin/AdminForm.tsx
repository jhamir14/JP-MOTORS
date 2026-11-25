"use client";
import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { EstadoAccion } from "@/lib/admin/accion";

const FormCtx = createContext<{ errores: Record<string, string>; pendiente: boolean }>({ errores: {}, pendiente: false });

/**
 * Formulario del panel conectado a una Server Action con useActionState.
 * Se envía con onSubmit (no con el prop `action`) para que React NO vacíe los campos al terminar:
 * si hay errores de validación, lo escrito se conserva. Con `resetOnSuccess` se limpia solo cuando sale bien.
 */
export function AdminForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  ...props
}: {
  action: (prev: EstadoAccion, data: FormData) => Promise<EstadoAccion>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
} & Omit<ComponentProps<"form">, "action" | "children" | "onSubmit">) {
  const [estado, dispatch, pendiente] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok && resetOnSuccess) ref.current?.reset();
  }, [estado, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };

  return (
    <FormCtx.Provider value={{ errores: estado?.errores ?? {}, pendiente }}>
      <form ref={ref} onSubmit={onSubmit} aria-busy={pendiente} className={className} {...props}>
        {estado?.mensaje && (
          <p
            role={estado.ok ? "status" : "alert"}
            className={cn(
              "col-span-full rounded-xl px-4 py-3 text-sm font-medium",
              estado.ok ? "bg-accent-soft text-accent" : "bg-danger/10 text-danger",
            )}
          >
            {estado.mensaje}
          </p>
        )}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

export function ErrorCampo({ name }: { name: string }) {
  const error = useContext(FormCtx).errores[name];
  return error ? (
    <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-danger">
      {error}
    </p>
  ) : null;
}

export function BotonEnviar({ children, pendiente: textoPendiente = "Guardando…", ...props }: ComponentProps<typeof Button> & { pendiente?: string }) {
  const { pendiente } = useContext(FormCtx);
  return (
    <Button type="submit" disabled={pendiente || props.disabled} {...props}>
      {pendiente ? textoPendiente : children}
    </Button>
  );
}
