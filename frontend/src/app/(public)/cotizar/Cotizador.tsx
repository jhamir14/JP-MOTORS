"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowRight, IconCheck, IconSearch, IconWhatsApp } from "@/components/icons";
import { ProductoImagen, fotoSobreNegro } from "@/components/public/ProductoImagen";
import { LINEAS, hrefLinea, lineaDe, normalizarTexto, type LineaId, type Producto, type TasaPublica } from "@/lib/catalogo";
import { cn } from "@/lib/cn";
import {
  cotizar,
  mensajeWhatsAppCotizacion,
  plazosSugeridos,
  reglasCotizacion,
  seleccionInicial,
  textoPlazo,
  type Seleccion,
} from "@/lib/cotizacion";
import { ETIQUETA_FRECUENCIA } from "@/lib/finance";
import { formatSoles } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

interface Props {
  productos: Producto[];
  tasas: TasaPublica[];
  slugInicial: string | null;
}

type Envio =
  | { estado: "editando" }
  | { estado: "enviando" }
  | { estado: "listo"; mensaje: string; copiaEnviada: boolean; correo: string };

const campo =
  "w-full rounded-2xl border border-tinta/12 bg-white px-4 py-3.5 text-[0.98rem] text-tinta outline-none transition placeholder:text-pizarra/55 focus:border-oro focus:ring-4 focus:ring-oro/20";

export function Cotizador({ productos, tasas, slugInicial }: Props) {
  // Solo se cotizan productos que tienen una tasa pública para su servicio.
  const cotizables = useMemo(() => productos.filter((p) => reglasCotizacion(p, tasas).tasas.length > 0), [productos, tasas]);
  const lineas = useMemo(() => LINEAS.filter((l) => cotizables.some((p) => lineaDe(p).id === l.id)), [cotizables]);

  const primero = cotizables.find((p) => p.slug === slugInicial) ?? cotizables.find((p) => p.destacado) ?? cotizables[0];
  const [slug, setSlug] = useState(primero?.slug ?? "");
  const [linea, setLinea] = useState<LineaId>(primero ? lineaDe(primero).id : "motos");
  const [busqueda, setBusqueda] = useState("");
  const [marca, setMarca] = useState<string | null>(null);
  const producto = cotizables.find((p) => p.slug === slug) ?? primero;
  const reglas = useMemo(() => (producto ? reglasCotizacion(producto, tasas) : null), [producto, tasas]);
  const [sel, setSel] = useState<Seleccion | null>(() => (producto && reglas ? seleccionInicial(producto, reglas) : null));

  // Al cambiar de producto se vuelve a su punto de partida (plan publicado más conveniente).
  const elegir = (p: Producto) => {
    setSlug(p.slug);
    setSel(seleccionInicial(p, reglasCotizacion(p, tasas)));
    setEnvio({ estado: "editando" });
  };

  // El enlace /cotizar?producto=… se mantiene al día para poder compartir la cotización.
  useEffect(() => {
    if (!producto) return;
    const url = new URL(window.location.href);
    url.searchParams.set("producto", producto.slug);
    window.history.replaceState(null, "", url);
  }, [producto]);

  const resultado = producto && reglas && sel ? cotizar(producto, reglas, sel) : null;
  const tasa = reglas?.tasas.find((t) => t.frecuencia === sel?.frecuencia);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const trampa = useRef<HTMLInputElement>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [envio, setEnvio] = useState<Envio>({ estado: "editando" });

  if (!producto || !reglas || !sel || !tasa) {
    return (
      <section className="bg-niebla pb-24">
        <div className="container">
          <div className="-mt-14 rounded-[1.75rem] bg-white p-10 text-center shadow-[0_24px_50px_-30px_rgba(10,22,51,0.55)]">
            <p className="text-pizarra">El cotizador no está disponible en este momento.</p>
            <a href={whatsappLink("Hola, quisiera cotizar un producto de Inversiones JP.")} target="_blank" rel="noopener noreferrer" className="btn-oro mt-6">
              <IconWhatsApp size={18} /> Cotizar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    );
  }

  const set = (cambio: Partial<Seleccion>) => {
    setSel((s) => (s ? { ...s, ...cambio } : s));
    if (envio.estado === "listo") setEnvio({ estado: "editando" });
  };
  const cambiarFrecuencia = (f: Seleccion["frecuencia"]) => {
    const t = reglas.tasas.find((x) => x.frecuencia === f)!;
    const sugeridos = plazosSugeridos(t);
    set({ frecuencia: f, numeroCuotas: sugeridos[Math.floor(sugeridos.length / 2)] });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultado) return;
    setErrores({});
    setErrorGeneral(null);
    const locales: Record<string, string> = {};
    if (nombre.trim().length < 3) locales.nombre = "Escribe tu nombre";
    if (!/^9\d{8}$/.test(celular.replace(/[\s-]/g, "").replace(/^\+?51/, ""))) locales.celular = "Escribe un celular de 9 dígitos que empiece con 9";
    if (correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) locales.correo = "Revisa el correo";
    if (!acepta) locales.aceptaDatos = "Marca la casilla para poder contactarte";
    if (Object.keys(locales).length) {
      setErrores(locales);
      return;
    }
    setEnvio({ estado: "enviando" });
    try {
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoSlug: producto.slug,
          inicial: sel.inicial,
          numeroCuotas: sel.numeroCuotas,
          frecuencia: sel.frecuencia,
          nombre,
          celular,
          correo,
          aceptaDatos: acepta,
          empresa_web: trampa.current?.value ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Record<string, string>; error?: string; mensajeWhatsApp?: string; copiaEnviada?: boolean };
      if (!res.ok || !data.ok) {
        if (data.errors) setErrores(data.errors);
        setErrorGeneral(data.error ?? (data.errors ? "Revisa los datos marcados." : "No pudimos enviar tu cotización. Inténtalo de nuevo o escríbenos por WhatsApp."));
        setEnvio({ estado: "editando" });
        return;
      }
      setEnvio({
        estado: "listo",
        mensaje: data.mensajeWhatsApp ?? mensajeWhatsAppCotizacion(producto.nombre, resultado, nombre.trim()),
        copiaEnviada: Boolean(data.copiaEnviada),
        correo: correo.trim(),
      });
    } catch {
      setErrorGeneral("Sin conexión. Revisa tu internet o escríbenos por WhatsApp.");
      setEnvio({ estado: "editando" });
    }
  };

  // Buscador: con texto busca en todas las líneas (marca, modelo o precio); sin texto, la línea elegida.
  const termino = normalizarTexto(busqueda);
  const marcasLinea = Array.from(new Set(cotizables.filter((p) => lineaDe(p).id === linea).map((p) => p.marca))).sort();
  const enLinea = termino
    ? cotizables.filter((p) => termino.split(/\s+/).every((t) => normalizarTexto(`${p.marca} ${p.nombre} ${p.modelo} ${p.precio}`).includes(t)))
    : cotizables.filter((p) => lineaDe(p).id === linea && (!marca || p.marca === marca));
  const etq = ETIQUETA_FRECUENCIA[sel.frecuencia];
  const pctInicial = Math.round((sel.inicial / producto.precio) * 100);
  const rangoInicial = reglas.inicialMax > reglas.inicialMin;

  return (
    <section className="relative bg-niebla pb-24">
      <div className="container">
        <div className="-mt-20 grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          {/* ───────── Configuración ───────── */}
          <div className="min-w-0 rounded-[1.75rem] bg-white p-5 shadow-[0_24px_50px_-30px_rgba(10,22,51,0.55)] ring-1 ring-tinta/[0.05] md:p-7">
            <Paso n={1} titulo="Elige tu modelo" />
            <div role="tablist" aria-label="Línea de productos" className="mt-4 flex w-max max-w-full gap-1 overflow-x-auto rounded-full bg-niebla p-1 [scrollbar-width:none]">
              {lineas.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={linea === l.id && !termino}
                  onClick={() => {
                    setLinea(l.id);
                    setMarca(null);
                    setBusqueda("");
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                    linea === l.id && !termino ? "bg-noche text-white" : "text-pizarra hover:text-tinta",
                  )}
                >
                  {l.nombre}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="relative block">
                <span className="sr-only">Buscar modelo</span>
                <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-pizarra" />
                <input
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  aria-label="Buscar modelo"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter elige el primer resultado.
                    if (e.key === "Enter" && enLinea[0]) {
                      e.preventDefault();
                      elegir(enLinea[0]);
                      setLinea(lineaDe(enLinea[0]).id);
                      setBusqueda("");
                    }
                  }}
                  placeholder="Busca tu modelo: iPhone 16, Galaxy A56, Honor…"
                  autoComplete="off"
                  className="w-full rounded-full border border-tinta/12 bg-white py-3 pr-10 pl-11 text-[0.95rem] text-tinta outline-none transition placeholder:text-pizarra/60 focus:border-oro focus:ring-4 focus:ring-oro/20"
                />
                {busqueda && (
                  <button type="button" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda"
                    className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-pizarra hover:bg-niebla hover:text-tinta">
                    ✕
                  </button>
                )}
              </label>
              {!termino && marcasLinea.length > 1 && (
                <div aria-label="Filtrar por marca" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                  {[null, ...marcasLinea].map((m) => (
                    <button
                      key={m ?? "todas"}
                      type="button"
                      aria-pressed={marca === m}
                      onClick={() => setMarca(m)}
                      className={cn(
                        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                        marca === m ? "border-oro bg-oro/15 text-tinta" : "border-tinta/10 text-pizarra hover:border-tinta/25 hover:text-tinta",
                      )}
                    >
                      {m ?? "Todas"}
                    </button>
                  ))}
                </div>
              )}
              {termino && (
                <p className="text-xs text-pizarra" aria-live="polite">
                  {enLinea.length ? `${enLinea.length} modelo${enLinea.length === 1 ? "" : "s"} · toca uno o pulsa Enter para elegir el primero` : "Ningún modelo coincide. Prueba con la marca o parte del nombre."}
                </p>
              )}
            </div>

            <ul className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
              {enLinea.map((p) => {
                const activo = p.slug === producto.slug;
                return (
                  <li key={p.slug} className="snap-start">
                    <button
                      type="button"
                      aria-pressed={activo}
                      onClick={() => {
                        elegir(p);
                        if (termino) {
                          setLinea(lineaDe(p).id);
                          setBusqueda("");
                          setMarca(null);
                        }
                      }}
                      className={cn(
                        "flex w-[9.5rem] flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5",
                        activo ? "border-oro shadow-[0_14px_30px_-18px_rgba(231,178,74,0.9)]" : "border-tinta/[0.07] hover:border-tinta/20",
                      )}
                    >
                      <span className="placa relative m-1.5 mb-0 block aspect-square overflow-hidden rounded-xl">
                        <span className={cn("absolute inset-[8%]", fotoSobreNegro(p) && "mix-blend-lighten")}>
                          <ProductoImagen producto={p} sizes="150px" />
                        </span>
                        {activo && (
                          <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-oro text-noche">
                            <IconCheck size={14} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="px-3 pt-2 pb-3">
                        <span className="block truncate text-[0.72rem] text-pizarra">{p.marca}</span>
                        <span className="block truncate text-sm font-bold text-tinta">{p.modelo}</span>
                        <span className="block text-[0.78rem] text-pizarra tabular">{formatSoles(p.precio)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 border-t border-tinta/[0.07] pt-7">
              <Paso n={2} titulo="¿Cuánto darás de inicial?" />
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <span className="text-[2rem] leading-none font-extrabold text-tinta tabular">{sel.inicial > 0 ? formatSoles(sel.inicial) : "S/ 0"}</span>
                  <span className="ml-2 text-sm text-pizarra">{sel.inicial > 0 ? `${pctInicial}% del precio` : "sin inicial"}</span>
                </div>
              </div>
              {rangoInicial && (
                <>
                  <label htmlFor="inicial" className="sr-only">Cuota inicial</label>
                  <input
                    id="inicial"
                    type="range"
                    min={reglas.inicialMin}
                    max={reglas.inicialMax}
                    step={reglas.paso}
                    value={sel.inicial}
                    onChange={(e) => set({ inicial: Number(e.target.value) })}
                    className="mt-4 w-full cursor-pointer accent-[#e7b24a]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-pizarra tabular">
                    <span>{reglas.inicialMin > 0 ? formatSoles(reglas.inicialMin) : "S/ 0"}</span>
                    <span>{formatSoles(reglas.inicialMax)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 border-t border-tinta/[0.07] pt-7">
              <Paso n={3} titulo="Elige el plazo" />
              {reglas.tasas.length > 1 && (
                <div className="mt-4 inline-flex gap-1 rounded-full bg-niebla p-1">
                  {reglas.tasas.map((t) => (
                    <button
                      key={t.frecuencia}
                      type="button"
                      aria-pressed={t.frecuencia === sel.frecuencia}
                      onClick={() => cambiarFrecuencia(t.frecuencia)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors",
                        t.frecuencia === sel.frecuencia ? "bg-noche text-white" : "text-pizarra hover:text-tinta",
                      )}
                    >
                      Pago {ETIQUETA_FRECUENCIA[t.frecuencia].adjetivo}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {plazosSugeridos(tasa).map((n) => {
                  // Celulares: la cuota de cada plazo, para comparar de un vistazo.
                  const cuotaPlazo = tasa.metodoJP && reglas ? cotizar(producto, reglas, { ...sel, numeroCuotas: n })?.cuota : null;
                  return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={n === sel.numeroCuotas}
                    onClick={() => set({ numeroCuotas: n })}
                    className={cn(
                      "min-w-[5.5rem] rounded-2xl border-2 px-4 py-3 text-center transition-colors",
                      n === sel.numeroCuotas ? "border-oro bg-oro/10 text-tinta" : "border-tinta/[0.08] text-pizarra hover:border-tinta/25",
                    )}
                  >
                    <span className="block text-lg leading-tight font-extrabold tabular">{n}</span>
                    <span className="block text-xs">{n === 1 ? etq.singular : etq.plural}</span>
                    {cuotaPlazo ? <span className="mt-1 block text-[0.72rem] font-semibold text-oro-oscuro tabular">{formatSoles(cuotaPlazo)}/sem</span> : null}
                  </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ───────── Resumen y envío ───────── */}
          <div className="grid min-w-0 gap-5 lg:sticky lg:top-24">
            <div className="noche overflow-hidden rounded-[1.75rem] p-5 shadow-[0_30px_60px_-30px_rgba(5,14,36,0.8)] md:p-7">
              <div className="flex items-center gap-4">
                <div className="placa relative size-24 shrink-0 overflow-hidden rounded-2xl md:size-28">
                  <div aria-hidden className="anillo absolute inset-[6%] opacity-50 [--grosor:1.5px]" />
                  <div className={cn("absolute inset-[10%]", fotoSobreNegro(producto) && "mix-blend-lighten")}>
                    <ProductoImagen producto={producto} sizes="112px" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-oro-claro">{producto.marca}</p>
                  <p className="display-sm text-[1.35rem] text-white">{producto.modelo}</p>
                  <p className="text-sm text-white/60 tabular">Precio {formatSoles(producto.precio)}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-sm text-white/60">Tu cuota referencial</p>
                <p aria-live="polite" className="mt-1 flex items-baseline gap-2">
                  <span className="text-[2.8rem] leading-none font-extrabold text-white tabular">{resultado ? formatSoles(resultado.cuota, true) : "—"}</span>
                  <span className="text-white/60">/{etq.singular}</span>
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Dato k="Inicial" v={sel.inicial > 0 ? formatSoles(sel.inicial) : "Sin inicial"} />
                  <Dato k="Plazo" v={textoPlazo(sel.numeroCuotas, sel.frecuencia)} />
                  <Dato k="A financiar" v={resultado ? formatSoles(resultado.financiado) : "—"} />
                  <Dato k="Pago" v={etq.adjetivo.charAt(0).toUpperCase() + etq.adjetivo.slice(1)} />
                </dl>
                <p className="mt-5 text-xs leading-relaxed text-white/45">
                  Cuota referencial con las tasas vigentes. El monto final se confirma tras la evaluación; no es una aprobación del crédito.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_24px_50px_-30px_rgba(10,22,51,0.55)] ring-1 ring-tinta/[0.05] md:p-7">
              {envio.estado === "listo" ? (
                <div className="text-center" role="status">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-oro/15 text-oro-oscuro">
                    <IconCheck size={28} strokeWidth={2.6} />
                  </span>
                  <h2 className="display-sm mt-4 text-[1.5rem] text-tinta">¡Listo, recibimos tu cotización!</h2>
                  <p className="mx-auto mt-2 max-w-sm text-[0.95rem] text-pizarra">
                    Un asesor te escribirá por WhatsApp.
                    {envio.copiaEnviada ? ` También te enviamos una copia a ${envio.correo}.` : ""} Si quieres avanzar ahora, escríbenos:
                  </p>
                  <a href={whatsappLink(envio.mensaje)} target="_blank" rel="noopener noreferrer" className="btn-oro mt-6 w-full sm:w-auto">
                    <IconWhatsApp size={18} /> Continuar por WhatsApp
                  </a>
                  <div className="mt-4 flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center sm:gap-5">
                    <button type="button" onClick={() => setEnvio({ estado: "editando" })} className="font-semibold text-tinta underline-offset-4 hover:underline">
                      Hacer otra cotización
                    </button>
                    <Link href={hrefLinea(lineaDe(producto).id)} className="font-semibold text-pizarra underline-offset-4 hover:underline">Ver más modelos</Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={enviar} noValidate>
                  <Paso n={4} titulo="Recibe tu cotización" />
                  <p className="mt-2 text-sm text-pizarra">Déjanos tus datos y un asesor te contacta. Sin compromiso.</p>

                  <div className="mt-5 grid gap-4">
                    <Campo id="c-nombre" label="Nombre" error={errores.nombre}>
                      <input id="c-nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez" className={campo} aria-invalid={!!errores.nombre} />
                    </Campo>
                    <Campo id="c-cel" label="Celular (WhatsApp)" error={errores.celular}>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-pizarra">+51</span>
                        <input
                          id="c-cel"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          maxLength={11}
                          value={celular}
                          onChange={(e) => setCelular(e.target.value)}
                          placeholder="912 345 678"
                          className={cn(campo, "pl-14")}
                          aria-invalid={!!errores.celular}
                        />
                      </div>
                    </Campo>
                    <Campo id="c-correo" label="Correo" opcional error={errores.correo}>
                      <input id="c-correo" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Para enviarte una copia" className={campo} aria-invalid={!!errores.correo} />
                    </Campo>

                    {/* Honeypot anti-spam (oculto para las personas) */}
                    <input ref={trampa} name="empresa_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                    <div>
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-pizarra">
                        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#0b1530]" aria-invalid={!!errores.aceptaDatos} />
                        <span>
                          Acepto que Inversiones JP use mis datos para contactarme sobre esta cotización, según la{" "}
                          <Link href="/privacidad" target="_blank" className="font-semibold text-tinta underline underline-offset-2">política de privacidad</Link>.
                        </span>
                      </label>
                      {errores.aceptaDatos && <p className="mt-1.5 text-sm font-medium text-red-600">{errores.aceptaDatos}</p>}
                    </div>
                  </div>

                  {errorGeneral && (
                    <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorGeneral}</p>
                  )}

                  <button type="submit" disabled={envio.estado === "enviando" || !resultado} className="btn-oro mt-6 w-full disabled:opacity-60">
                    {envio.estado === "enviando" ? "Enviando…" : (
                      <>
                        Enviar mi cotización <IconArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-pizarra">
                    ¿Prefieres hablar ya?{" "}
                    <a
                      href={resultado ? whatsappLink(mensajeWhatsAppCotizacion(producto.nombre, resultado)) : whatsappLink("Hola")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-tinta underline underline-offset-2"
                    >
                      Escríbenos por WhatsApp
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Paso({ n, titulo }: { n: number; titulo: string }) {
  return (
    <h2 className="flex items-center gap-3 text-[1.08rem] font-bold text-tinta">
      <span className="flex size-7 items-center justify-center rounded-full bg-noche text-[0.8rem] font-bold text-oro-claro tabular">{n}</span>
      {titulo}
    </h2>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-white/50">{k}</dt>
      <dd className="font-semibold text-white tabular">{v}</dd>
    </div>
  );
}

function Campo({ id, label, opcional, error, children }: { id: string; label: string; opcional?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-tinta">
        {label} {opcional && <span className="font-normal text-pizarra">(opcional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
