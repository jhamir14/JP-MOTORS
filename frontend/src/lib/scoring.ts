/**
 * Scoring de clientes (Fase 7).
 *
 * El puntaje (1–5, null = sin historial) lo calcula la base en `recalcular_estados()` y guarda las métricas
 * en `cliente_score.metricas`. Estas funciones son la versión TypeScript EQUIVALENTE: explican por qué el
 * cliente tiene su puntaje, sugieren los beneficios del siguiente financiamiento y permiten probar las reglas.
 * Si cambias una regla aquí, cámbiala también en la migración (y viceversa).
 *
 * Reglas:
 *   1. Base por puntualidad (% de cuotas pagadas dentro de los días de gracia):
 *      ≥ 95 % → 5 · ≥ 85 % → 4 · ≥ 70 % → 3 · ≥ 50 % → 2 · menos → 1.
 *      Sin cuotas pagadas: sin historial (null), salvo que ya tenga cuotas vencidas → 1.
 *   2. Ajustes: −1 si alguna vez se atrasó más de 30 días · −1 si hubo bloqueo de celular o corte de GPS ·
 *      +1 si canceló 2 o más créditos con un atraso promedio dentro de los días de gracia y sin mora hoy.
 *   3. Topes: con cuotas vencidas hoy el máximo es 2; con más de 30 días de mora hoy, 1.
 */
export interface MetricasScore {
  /** Cuotas totalmente pagadas (créditos no anulados). */
  pagadas: number;
  /** Pagadas a más tardar `diasGracia` días después del vencimiento. */
  aTiempo: number;
  /** Promedio de días de atraso de las cuotas pagadas (0 si pagó antes o el mismo día). */
  atrasoPromedio: number;
  /** Mayor atraso: cuotas pagadas y vencidas impagas a la fecha. */
  atrasoMaximo: number;
  /** Cuotas vencidas e impagas hoy. */
  cuotasMoraHoy: number;
  /** Días de atraso de la cuota vencida más antigua. */
  diasMoraHoy: number;
  creditosActivos: number;
  creditosCancelados: number;
  creditosAnulados: number;
  /** Meses desde el primer crédito. */
  antiguedadMeses: number;
  /** Bloqueos de celular o cortes de GPS registrados. */
  bloqueos: number;
  diasGracia: number;
}

export interface Ajuste {
  codigo: "ATRASO_MAYOR_30" | "BLOQUEO_GPS" | "CREDITOS_CANCELADOS";
  puntos: number;
  texto: string;
}

export interface ResultadoScore {
  puntaje: number | null;
  /** Puntaje por puntualidad antes de ajustes y topes. */
  base: number | null;
  porcentajeATiempo: number | null;
  ajustes: Ajuste[];
  tope: { maximo: number; motivo: string } | null;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function puntajePorPuntualidad(aTiempo: number, pagadas: number): number | null {
  if (!(pagadas > 0)) return null;
  const r = aTiempo / pagadas;
  return r >= 0.95 ? 5 : r >= 0.85 ? 4 : r >= 0.7 ? 3 : r >= 0.5 ? 2 : 1;
}

export function calcularScore(m: MetricasScore): ResultadoScore {
  const porcentajeATiempo = m.pagadas > 0 ? Math.round((m.aTiempo / m.pagadas) * 1000) / 10 : null;
  let base = puntajePorPuntualidad(m.aTiempo, m.pagadas);
  if (base == null && m.cuotasMoraHoy > 0) base = 1;
  if (base == null) return { puntaje: null, base: null, porcentajeATiempo, ajustes: [], tope: null };

  const ajustes: Ajuste[] = [];
  if (m.atrasoMaximo > 30) ajustes.push({ codigo: "ATRASO_MAYOR_30", puntos: -1, texto: `Se atrasó ${m.atrasoMaximo} días en una cuota (más de 30)` });
  if (m.bloqueos > 0)
    ajustes.push({ codigo: "BLOQUEO_GPS", puntos: -1, texto: `${m.bloqueos} bloqueo${m.bloqueos > 1 ? "s" : ""} de celular o corte${m.bloqueos > 1 ? "s" : ""} de GPS` });
  if (m.creditosCancelados >= 2 && m.atrasoPromedio <= m.diasGracia && m.cuotasMoraHoy === 0)
    ajustes.push({ codigo: "CREDITOS_CANCELADOS", puntos: 1, texto: `Canceló ${m.creditosCancelados} créditos pagando a tiempo` });

  let puntaje = clamp(base + ajustes.reduce((s, a) => s + a.puntos, 0), 1, 5);
  let tope: ResultadoScore["tope"] = null;
  if (m.cuotasMoraHoy > 0) {
    tope = m.diasMoraHoy > 30
      ? { maximo: 1, motivo: `Tiene ${m.diasMoraHoy} días de mora hoy (más de 30)` }
      : { maximo: 2, motivo: `Tiene ${m.cuotasMoraHoy} cuota${m.cuotasMoraHoy > 1 ? "s" : ""} vencida${m.cuotasMoraHoy > 1 ? "s" : ""} hoy` };
    if (puntaje > tope.maximo) puntaje = tope.maximo;
    else if (puntaje < tope.maximo) tope = null; // el tope no influyó
  }
  return { puntaje, base, porcentajeATiempo, ajustes, tope };
}

export type TonoFactor = "bueno" | "malo" | "neutro";
export interface Factor { texto: string; tono: TonoFactor }

/** Lista legible de por qué el cliente tiene su puntaje (para la ficha y el alta de crédito). */
export function explicarScore(m: MetricasScore): Factor[] {
  const r = calcularScore(m);
  const f: Factor[] = [];
  if (m.pagadas === 0) {
    f.push({ texto: m.cuotasMoraHoy > 0 ? "No ha pagado ninguna cuota y ya tiene cuotas vencidas" : "Aún no ha pagado cuotas: sin historial", tono: m.cuotasMoraHoy > 0 ? "malo" : "neutro" });
  } else {
    f.push({
      texto: `${r.porcentajeATiempo} % de cuotas pagadas a tiempo (${m.aTiempo} de ${m.pagadas}, con ${m.diasGracia} días de gracia) → base ${r.base}`,
      tono: (r.base ?? 0) >= 4 ? "bueno" : (r.base ?? 0) <= 2 ? "malo" : "neutro",
    });
    f.push({
      texto: `Atraso promedio ${m.atrasoPromedio.toFixed(1)} días · máximo ${m.atrasoMaximo} días`,
      tono: m.atrasoPromedio <= m.diasGracia && m.atrasoMaximo <= 30 ? "bueno" : m.atrasoMaximo > 30 ? "malo" : "neutro",
    });
  }
  for (const a of r.ajustes) f.push({ texto: `${a.texto} (${a.puntos > 0 ? "+" : ""}${a.puntos})`, tono: a.puntos > 0 ? "bueno" : "malo" });
  if (r.tope) f.push({ texto: `${r.tope.motivo}: máximo ${r.tope.maximo}`, tono: "malo" });
  const creditos = [
    m.creditosActivos && `${m.creditosActivos} activo${m.creditosActivos > 1 ? "s" : ""}`,
    m.creditosCancelados && `${m.creditosCancelados} cancelado${m.creditosCancelados > 1 ? "s" : ""}`,
    m.creditosAnulados && `${m.creditosAnulados} anulado${m.creditosAnulados > 1 ? "s" : ""} (no cuenta${m.creditosAnulados > 1 ? "n" : ""})`,
  ].filter(Boolean);
  if (creditos.length) f.push({ texto: `Créditos: ${creditos.join(" · ")}`, tono: "neutro" });
  if (m.antiguedadMeses > 0 || m.creditosActivos + m.creditosCancelados > 0)
    f.push({ texto: `Cliente con crédito desde hace ${m.antiguedadMeses < 1 ? "menos de 1 mes" : `${m.antiguedadMeses} mes${m.antiguedadMeses > 1 ? "es" : ""}`}`, tono: "neutro" });
  return f;
}

// -----------------------------------------------------------------------------
// Métricas a partir del historial (misma lógica que la consulta SQL)
// -----------------------------------------------------------------------------
export interface CuotaHistorial {
  fechaVencimiento: string;
  /** Fecha en que quedó totalmente pagada (null si no se conoce o está pendiente). */
  fechaPago: string | null;
  estado: "PENDIENTE" | "PAGADA" | "PAGADA_PARCIAL" | "EN_MORA";
}
export interface CreditoHistorial {
  estado: "SOLICITUD" | "APROBADO" | "VIGENTE" | "EN_MORA" | "REFINANCIADO" | "FINALIZADO_LIQUIDADO" | "ANULADO";
  fechaDesembolso: string;
  cuotas: CuotaHistorial[];
  bloqueos?: number;
}

const ACTIVOS = new Set(["VIGENTE", "EN_MORA", "APROBADO", "REFINANCIADO"]);
const dias = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
function mesesEntre(desde: string, hasta: string) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

export function metricasDesdeHistorial(creditos: CreditoHistorial[], hoy: string, diasGracia: number): MetricasScore {
  const validos = creditos.filter((c) => c.estado !== "ANULADO");
  let pagadas = 0, aTiempo = 0, sumaAtraso = 0, conFecha = 0, atrasoMaximo = 0, cuotasMoraHoy = 0, diasMoraHoy = 0, bloqueos = 0;
  for (const c of validos) {
    bloqueos += c.bloqueos ?? 0;
    for (const q of c.cuotas) {
      if (q.estado === "PAGADA") {
        pagadas++;
        if (q.fechaPago) {
          const atraso = Math.max(dias(q.fechaVencimiento, q.fechaPago), 0);
          if (atraso <= diasGracia) aTiempo++;
          sumaAtraso += atraso;
          conFecha++;
          atrasoMaximo = Math.max(atrasoMaximo, atraso);
        }
      } else if (q.fechaVencimiento < hoy) {
        const atraso = dias(q.fechaVencimiento, hoy);
        atrasoMaximo = Math.max(atrasoMaximo, atraso);
        if (ACTIVOS.has(c.estado)) {
          cuotasMoraHoy++;
          diasMoraHoy = Math.max(diasMoraHoy, atraso);
        }
      }
    }
  }
  const primera = validos.map((c) => c.fechaDesembolso).sort()[0];
  return {
    pagadas,
    aTiempo,
    atrasoPromedio: conFecha ? Math.round((sumaAtraso / conFecha) * 10) / 10 : 0,
    atrasoMaximo,
    cuotasMoraHoy,
    diasMoraHoy,
    creditosActivos: validos.filter((c) => ACTIVOS.has(c.estado)).length,
    creditosCancelados: validos.filter((c) => c.estado === "FINALIZADO_LIQUIDADO").length,
    creditosAnulados: creditos.length - validos.length,
    antiguedadMeses: primera ? mesesEntre(primera, hoy) : 0,
    bloqueos,
    diasGracia,
  };
}

/** Convierte el jsonb de `cliente_score.metricas` (snake_case) en MetricasScore. */
export function metricasDesdeJson(j: unknown): MetricasScore | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const n = (k: string) => (Number.isFinite(Number(o[k])) ? Number(o[k]) : 0);
  return {
    pagadas: n("pagadas"),
    aTiempo: n("a_tiempo"),
    atrasoPromedio: n("atraso_promedio"),
    atrasoMaximo: n("atraso_maximo"),
    cuotasMoraHoy: n("cuotas_mora_hoy"),
    diasMoraHoy: n("dias_mora_hoy"),
    creditosActivos: n("creditos_activos"),
    creditosCancelados: n("creditos_cancelados"),
    creditosAnulados: n("creditos_anulados"),
    antiguedadMeses: n("antiguedad_meses"),
    bloqueos: n("bloqueos"),
    diasGracia: n("dias_gracia"),
  };
}

export const estrellas = (puntaje: number | null) => (puntaje == null ? "" : "★".repeat(puntaje) + "☆".repeat(5 - puntaje));

// -----------------------------------------------------------------------------
// Beneficios para el siguiente financiamiento
// -----------------------------------------------------------------------------
export interface NivelBeneficio {
  /** Puntaje mínimo para el nivel (5 = excelente, 4 = puntual). */
  scoreMin: number;
  nombre: string;
  /** % de descuento sobre la tasa (10 = la tasa baja un 10 %, p. ej. de 3 % a 2.7 %). */
  descuentoTasaPct: number;
  /** % en que se reduce la inicial sugerida (50 = la mitad). */
  reduccionInicialPct: number;
  /** Cuotas adicionales al máximo de la tasa. */
  cuotasExtra: number;
}

export interface ConfigBeneficios {
  activo: boolean;
  /** Ordenados de mayor a menor scoreMin. */
  niveles: NivelBeneficio[];
  /** Exigir al menos un crédito cancelado para dar beneficios. */
  requiereCreditoCancelado: boolean;
  /** Puntaje desde el cual (hacia abajo) se pide confirmar el riesgo. 0 = sin alerta. */
  alertaScoreMax: number;
  /** No registrar créditos nuevos a clientes con cuotas vencidas. */
  bloquearConMora: boolean;
}

export const BENEFICIOS_POR_DEFECTO: ConfigBeneficios = {
  activo: true,
  niveles: [
    { scoreMin: 5, nombre: "Cliente excelente", descuentoTasaPct: 10, reduccionInicialPct: 50, cuotasExtra: 4 },
    { scoreMin: 4, nombre: "Cliente puntual", descuentoTasaPct: 5, reduccionInicialPct: 25, cuotasExtra: 2 },
  ],
  requiereCreditoCancelado: true,
  alertaScoreMax: 2,
  bloquearConMora: true,
};

const enRango = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? clamp(n, min, max) : def;
};

/** Lee `configuracion.beneficios_score` con valores por defecto y límites seguros. */
export function normalizarBeneficios(j: unknown): ConfigBeneficios {
  const d = BENEFICIOS_POR_DEFECTO;
  if (!j || typeof j !== "object") return d;
  const o = j as Record<string, unknown>;
  const niveles = Array.isArray(o.niveles) ? o.niveles : d.niveles;
  return {
    activo: o.activo !== false,
    niveles: niveles
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x, i) => {
        const def = d.niveles[i] ?? d.niveles[d.niveles.length - 1];
        return {
          scoreMin: Math.round(enRango(x.scoreMin, 1, 5, def.scoreMin)),
          nombre: typeof x.nombre === "string" && x.nombre.trim() ? x.nombre.trim().slice(0, 40) : def.nombre,
          descuentoTasaPct: enRango(x.descuentoTasaPct, 0, 50, def.descuentoTasaPct),
          reduccionInicialPct: enRango(x.reduccionInicialPct, 0, 100, def.reduccionInicialPct),
          cuotasExtra: Math.round(enRango(x.cuotasExtra, 0, 24, def.cuotasExtra)),
        };
      })
      .sort((a, b) => b.scoreMin - a.scoreMin),
    requiereCreditoCancelado: o.requiereCreditoCancelado !== false,
    alertaScoreMax: Math.round(enRango(o.alertaScoreMax, 0, 4, d.alertaScoreMax)),
    bloquearConMora: o.bloquearConMora !== false,
  };
}

export interface PerfilCliente {
  puntaje: number | null;
  cuotasMoraHoy: number;
  creditosCancelados: number;
}

export interface Evaluacion {
  /** Beneficio sugerido (null = no califica). */
  nivel: NivelBeneficio | null;
  /** Por qué no califica (si aplica). */
  motivoSinBeneficio: string | null;
  /** Se debe confirmar el riesgo antes de registrar. */
  alertaRiesgo: string | null;
  /** No se puede registrar el crédito. */
  bloqueo: string | null;
}

export function evaluarCliente(p: PerfilCliente, c: ConfigBeneficios): Evaluacion {
  const bloqueo = c.bloquearConMora && p.cuotasMoraHoy > 0
    ? `Tiene ${p.cuotasMoraHoy} cuota${p.cuotasMoraHoy > 1 ? "s" : ""} vencida${p.cuotasMoraHoy > 1 ? "s" : ""}: debe ponerse al día antes de un nuevo financiamiento.`
    : null;
  const alertaRiesgo = p.puntaje != null && p.puntaje <= c.alertaScoreMax
    ? `Score ${p.puntaje} de 5: historial de pagos con atrasos. Evalúa pedir más inicial, un garante o menos cuotas.`
    : null;
  let nivel: NivelBeneficio | null = null;
  let motivoSinBeneficio: string | null = null;
  if (!c.activo) motivoSinBeneficio = "Los beneficios por score están desactivados";
  else if (p.puntaje == null) motivoSinBeneficio = "Sin historial de pagos todavía";
  else if (p.cuotasMoraHoy > 0) motivoSinBeneficio = "Tiene cuotas vencidas";
  else if (c.requiereCreditoCancelado && p.creditosCancelados === 0) motivoSinBeneficio = "Aún no cancela un crédito";
  else {
    nivel = c.niveles.find((n) => p.puntaje! >= n.scoreMin) ?? null;
    if (!nivel) motivoSinBeneficio = `Los beneficios empiezan con score ${Math.min(...c.niveles.map((n) => n.scoreMin), 5)}`;
  }
  return { nivel, motivoSinBeneficio, alertaRiesgo, bloqueo };
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

/** Condiciones con el beneficio aplicado. La tasa baja en %; la inicial se reduce; el máximo de cuotas sube. */
export function aplicarBeneficio(
  v: { tasaPorcentaje: number | null; cuotaInicial: number; cuotasMax?: number | null },
  n: NivelBeneficio,
): { tasaPorcentaje: number | null; cuotaInicial: number; cuotasMax: number | null } {
  return {
    tasaPorcentaje: v.tasaPorcentaje == null || !Number.isFinite(v.tasaPorcentaje) ? v.tasaPorcentaje : r3(v.tasaPorcentaje * (1 - n.descuentoTasaPct / 100)),
    cuotaInicial: Number.isFinite(v.cuotaInicial) ? r2(Math.max(0, v.cuotaInicial * (1 - n.reduccionInicialPct / 100))) : v.cuotaInicial,
    cuotasMax: v.cuotasMax == null ? null : v.cuotasMax + n.cuotasExtra,
  };
}

export function describirBeneficio(n: NivelBeneficio): string {
  const partes = [
    n.descuentoTasaPct > 0 && `${n.descuentoTasaPct} % menos de tasa`,
    n.reduccionInicialPct > 0 && `${n.reduccionInicialPct} % menos de inicial`,
    n.cuotasExtra > 0 && `hasta ${n.cuotasExtra} cuotas más`,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "sin condiciones especiales";
}

