"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { buscarClientes, type SugerenciaCliente } from "./buscar";

/**
 * Campo «Cliente» con sugerencias mientras se escribe (DNI, nombre o celular).
 * Al elegir, la página carga sus garantes, score y asesor sin perder lo que ya se escribió en el formulario.
 */
export function BuscadorCliente({ seleccionado }: { seleccionado: { id: string; nombre: string; documento: string; asesor: string | null } | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [sugerencias, setSugerencias] = useState<SugerenciaCliente[]>([]);
  const [activo, setActivo] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [cargando, iniciar] = useTransition();
  const idLista = useId();
  const pedido = useRef(0);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    const n = ++pedido.current;
    const t = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await buscarClientes(q);
        if (n === pedido.current) {
          setSugerencias(r);
          setActivo(0);
        }
      } finally {
        if (n === pedido.current) setBuscando(false);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [texto]);

  const elegir = (id: string | null) => {
    const p = new URLSearchParams(params.toString());
    p.delete("q");
    if (id) p.set("cliente", id);
    else p.delete("cliente");
    setAbierto(false);
    setTexto("");
    iniciar(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };

  if (seleccionado) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {seleccionado.nombre.split(" ").slice(0, 2).map((s) => s.charAt(0)).join("").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{seleccionado.nombre}</div>
          <div className="truncate text-xs text-muted">DNI {seleccionado.documento}{seleccionado.asesor ? ` · registrado por ${seleccionado.asesor}` : ""}</div>
        </div>
        <button type="button" onClick={() => elegir(null)} className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-brand">
          {cargando ? "Cargando…" : "Cambiar cliente"}
        </button>
      </div>
    );
  }

  const q = texto.trim();
  const lista = q.length >= 2 ? sugerencias : [];
  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={abierto && q.length >= 2}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-label="Buscar cliente"
        autoComplete="off"
        autoFocus
        value={texto}
        placeholder="Escribe el DNI, nombre o celular del cliente…"
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(a + 1, lista.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); const s = lista[activo]; if (s && !s.bloqueado) elegir(s.id); }
          else if (e.key === "Escape") setAbierto(false);
        }}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {cargando && <p className="mt-1 text-xs text-muted">Cargando cliente…</p>}
      {abierto && q.length >= 2 && (
        <ul id={idLista} role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lift">
          {buscando && lista.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Buscando…</li>}
          {!buscando && lista.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">
              Sin resultados.{" "}
              <Link href="/admin/clientes/nuevo" className="font-semibold text-brand">Registrar cliente nuevo →</Link>
            </li>
          )}
          {lista.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === activo} aria-disabled={s.bloqueado}>
              <button
                type="button"
                disabled={s.bloqueado}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(s.id)}
                className={cn("flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50",
                  i === activo ? "bg-brand-soft" : "hover:bg-surface-2")}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.nombre}</span>
                  <span className="block truncate text-xs text-muted">DNI {s.documento}{s.telefono ? ` · ${s.telefono}` : ""}{s.asesor ? ` · asesor: ${s.asesor}` : ""}</span>
                </span>
                {s.bloqueado ? <span className="text-xs font-semibold text-danger">Bloqueado</span> : <span className="text-xs font-semibold text-brand">Elegir</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
