"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Banner de cookies y carga condicionada de Google Analytics (Ley 29733: consentimiento previo para cookies no esenciales).
 * GA no se descarga ni escribe cookies hasta que el visitante pulsa «Aceptar». La decisión se guarda en este navegador
 * y se puede cambiar desde «Configurar cookies» en el pie (evento EVENTO_CONFIGURAR).
 */
const CLAVE = "jp-consentimiento-cookies";
export const EVENTO_CONFIGURAR = "jp:configurar-cookies";
const EVENTO_CAMBIO = "jp:cookies-cambio";

type Decision = "aceptadas" | "rechazadas";

function leer(): Decision | null {
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === "aceptadas" || v === "rechazadas" ? v : memoria;
  } catch {
    return memoria;
  }
}

function guardar(d: Decision) {
  try {
    window.localStorage.setItem(CLAVE, d);
  } catch {
    /* navegador sin almacenamiento: la decisión vale solo para esta visita */
    memoria = d;
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/** Respaldo cuando el navegador no deja usar localStorage (modo privado estricto). */
let memoria: Decision | null = null;

function suscribir(aviso: () => void) {
  window.addEventListener(EVENTO_CAMBIO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

/** Borra las cookies de Google Analytics (_ga, _ga_XXXX, _gid) del dominio actual y de su dominio padre. */
function borrarCookiesAnalitica() {
  const host = window.location.hostname;
  const dominios = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const c of document.cookie.split(";")) {
    const nombre = c.split("=")[0]?.trim();
    if (!nombre || !/^_ga|^_gid|^_gat/.test(nombre)) continue;
    for (const d of dominios) {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

export function ConsentimientoCookies({ gaId }: { gaId?: string }) {
  // En el servidor (y en el primer render) no hay decisión que leer: «pendiente» no muestra el banner ni carga GA.
  const decision = useSyncExternalStore<Decision | null | "pendiente">(suscribir, leer, () => "pendiente");
  const [reabierto, setReabierto] = useState(false);
  const visible = decision === null || reabierto;

  useEffect(() => {
    const abrir = () => setReabierto(true);
    window.addEventListener(EVENTO_CONFIGURAR, abrir);
    return () => window.removeEventListener(EVENTO_CONFIGURAR, abrir);
  }, []);

  const elegir = (d: Decision) => {
    const antes = decision;
    guardar(d);
    setReabierto(false);
    if (d === "rechazadas" && antes === "aceptadas") {
      // GA ya estaba cargado en esta página: se borran sus cookies y se recarga para descargarlo.
      borrarCookiesAnalitica();
      window.location.reload();
    }
  };

  return (
    <>
      {gaId && decision === "aceptadas" && (
        <>
          <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Uso de cookies"
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[1001] mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-5 text-sm text-tinta shadow-2xl md:bottom-6"
        >
          <p className="font-bold">Usamos cookies</p>
          <p className="mt-1.5 text-muted">
            Con tu permiso usamos cookies de Google Analytics para saber, de forma estadística, cómo se usa la web. Si las rechazas, la
            web funciona igual. Más información en la{" "}
            <Link href="/privacidad#cookies" className="font-semibold text-tinta underline underline-offset-2">política de privacidad</Link>.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => elegir("rechazadas")}
              className="rounded-full border border-black/15 px-5 py-2.5 font-semibold transition-colors hover:bg-black/5"
            >
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => elegir("aceptadas")}
              className="rounded-full bg-[#0b1530] px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Botón del pie para volver a abrir el banner y cambiar la decisión. */
export function BotonConfigurarCookies({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_CONFIGURAR))} className={className}>
      Configurar cookies
    </button>
  );
}
