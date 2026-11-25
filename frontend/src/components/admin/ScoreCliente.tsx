import { ETIQUETA_ESTADO_CLIENTE } from "@/lib/clientes";
import { cn } from "@/lib/cn";
import { estrellas, explicarScore } from "@/lib/scoring";
import type { PerfilScore } from "@/lib/server/scoring";

const fechaHora = (d: Date) =>
  new Date(d).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ICONO = { bueno: "▲", malo: "▼", neutro: "•" } as const;
const COLOR = { bueno: "text-accent", malo: "text-danger", neutro: "text-muted" } as const;

/** Puntaje, por qué lo tiene y cómo ha cambiado. */
export function ScoreCliente({ perfil, bloqueado, historial = 8 }: { perfil: PerfilScore; bloqueado?: boolean; historial?: number }) {
  const factores = perfil.metricas ? explicarScore(perfil.metricas) : [];
  const cambios = perfil.historial.slice(0, historial);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {perfil.puntaje != null ? (
          <>
            <span className="text-3xl font-bold tabular">{perfil.puntaje}<span className="text-base text-muted">/5</span></span>
            <span className="text-xl text-gold" aria-hidden>{estrellas(perfil.puntaje)}</span>
          </>
        ) : (
          <span className="text-lg font-semibold text-muted">Sin historial</span>
        )}
        {perfil.calculadoAt && <span className="text-xs text-muted">Calculado {fechaHora(perfil.calculadoAt)}</span>}
      </div>
      {bloqueado && <p className="text-xs font-semibold text-danger">Cliente con bloqueo legal: el score no se recalcula mientras dure el bloqueo.</p>}

      {factores.length > 0 ? (
        <ul className="grid gap-1.5 text-sm" aria-label="Por qué tiene este puntaje">
          {factores.map((f) => (
            <li key={f.texto} className="flex gap-2">
              <span className={cn("w-3 shrink-0 text-xs leading-5", COLOR[f.tono])} aria-hidden>{ICONO[f.tono]}</span>
              <span>{f.texto}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aún no se calcula: se calcula al registrar pagos o créditos y cada noche.</p>
      )}

      {cambios.length > 0 && (
        <details className="rounded-xl border border-line-soft">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand">Historial del score ({perfil.historial.length}{perfil.historial.length >= 20 ? "+" : ""})</summary>
          <ol className="divide-y divide-line-soft text-sm">
            {cambios.map((h, i) => (
              <li key={i} className="grid gap-0.5 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2">
                  <strong className="tabular">
                    {h.puntajeAnterior != null || h.estadoAnterior ? `${h.puntajeAnterior ?? "—"} → ` : ""}{h.puntaje ?? "—"}
                  </strong>
                  {h.estadoAnterior && h.estadoAnterior !== h.estado && (
                    <span className="text-xs text-muted">{ETIQUETA_ESTADO_CLIENTE[h.estadoAnterior]} → {ETIQUETA_ESTADO_CLIENTE[h.estado]}</span>
                  )}
                  <span className="ml-auto text-xs text-muted">{fechaHora(h.fecha)}{h.usuario ? ` · ${h.usuario}` : ""}</span>
                </div>
                <div className="text-xs text-muted">{h.motivo}</div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
