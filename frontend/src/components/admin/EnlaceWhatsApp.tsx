"use client";
import { useSyncExternalStore, type ComponentProps } from "react";
import { enlaceWhatsAppNormal, plataformaDe } from "@/lib/whatsapp";

const sinSuscripcion = () => () => {};

/**
 * Hook: a partir de un enlace wa.me devuelve el que abre el WhatsApp normal (no el Business) en este dispositivo.
 * En el servidor y en el primer render se usa el wa.me original (evita diferencias de hidratación).
 */
export function useWhatsAppNormal(href: string | null): { href: string | null; nuevaPestana: boolean } {
  const plataforma = useSyncExternalStore(
    sinSuscripcion,
    () => plataformaDe(navigator.userAgent),
    () => "escritorio" as const,
  );
  if (!href) return { href: null, nuevaPestana: true };
  // En el celular la app se abre directamente; en la computadora, WhatsApp Web en otra pestaña.
  return { href: enlaceWhatsAppNormal(href, plataforma), nuevaPestana: plataforma === "escritorio" };
}

/** <a> hacia WhatsApp que, en celulares con WhatsApp y WhatsApp Business, abre siempre el normal. */
export function EnlaceWhatsApp({ href, ...props }: { href: string } & Omit<ComponentProps<"a">, "href" | "target">) {
  const w = useWhatsAppNormal(href);
  return <a href={w.href ?? href} {...(w.nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...props} />;
}
