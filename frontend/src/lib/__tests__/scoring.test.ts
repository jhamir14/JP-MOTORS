import { describe, expect, it } from "vitest";
import {
  BENEFICIOS_POR_DEFECTO,
  aplicarBeneficio,
  calcularScore,
  describirBeneficio,
  evaluarCliente,
  explicarScore,
  metricasDesdeHistorial,
  metricasDesdeJson,
  normalizarBeneficios,
  puntajePorPuntualidad,
  type CreditoHistorial,
  type CuotaHistorial,
  type MetricasScore,
} from "../scoring";

const HOY = "2026-11-25";

const metricas = (o: Partial<MetricasScore> = {}): MetricasScore => ({
  pagadas: 20, aTiempo: 20, atrasoPromedio: 0, atrasoMaximo: 0, cuotasMoraHoy: 0, diasMoraHoy: 0,
  creditosActivos: 1, creditosCancelados: 0, creditosAnulados: 0, antiguedadMeses: 6, bloqueos: 0, diasGracia: 3, ...o,
});

/** Cuotas semanales desde `inicio`, pagadas con los atrasos indicados (null = sin pagar). */
function cuotas(inicio: string, atrasos: (number | null)[]): CuotaHistorial[] {
  return atrasos.map((a, i) => {
    const v = new Date(Date.parse(`${inicio}T00:00:00Z`) + i * 7 * 86_400_000).toISOString().slice(0, 10);
    const p = a == null ? null : new Date(Date.parse(`${v}T00:00:00Z`) + a * 86_400_000).toISOString().slice(0, 10);
    return { fechaVencimiento: v, fechaPago: p, estado: a == null ? (v < HOY ? "EN_MORA" : "PENDIENTE") : "PAGADA" };
  });
}
const credito = (estado: CreditoHistorial["estado"], inicio: string, atrasos: (number | null)[], bloqueos = 0): CreditoHistorial => ({
  estado, fechaDesembolso: inicio, cuotas: cuotas(inicio, atrasos), bloqueos,
});

describe("puntajePorPuntualidad", () => {
  it("usa los umbrales 95/85/70/50 %", () => {
    expect(puntajePorPuntualidad(19, 20)).toBe(5);
    expect(puntajePorPuntualidad(18, 20)).toBe(4);
    expect(puntajePorPuntualidad(17, 20)).toBe(4);
    expect(puntajePorPuntualidad(14, 20)).toBe(3);
    expect(puntajePorPuntualidad(10, 20)).toBe(2);
    expect(puntajePorPuntualidad(9, 20)).toBe(1);
    expect(puntajePorPuntualidad(0, 0)).toBeNull();
  });
});

describe("calcularScore", () => {
  it("cliente puntual sin ajustes: 5", () => {
    const r = calcularScore(metricas());
    expect(r).toMatchObject({ puntaje: 5, base: 5, porcentajeATiempo: 100, ajustes: [], tope: null });
  });

  it("sin cuotas pagadas: sin historial, salvo que ya tenga cuotas vencidas", () => {
    expect(calcularScore(metricas({ pagadas: 0, aTiempo: 0 })).puntaje).toBeNull();
    expect(calcularScore(metricas({ pagadas: 0, aTiempo: 0, cuotasMoraHoy: 1, diasMoraHoy: 4 })).puntaje).toBe(1);
  });

  it("resta por atraso de más de 30 días y por bloqueos / cortes de GPS", () => {
    const r = calcularScore(metricas({ atrasoMaximo: 31, bloqueos: 2 }));
    expect(r.puntaje).toBe(3);
    expect(r.ajustes.map((a) => a.codigo)).toEqual(["ATRASO_MAYOR_30", "BLOQUEO_GPS"]);
    expect(calcularScore(metricas({ atrasoMaximo: 30 })).puntaje).toBe(5);
  });

  it("suma por 2+ créditos cancelados pagando a tiempo, sin pasar de 5", () => {
    expect(calcularScore(metricas({ aTiempo: 17, creditosCancelados: 2, atrasoPromedio: 1 })).puntaje).toBe(5);
    expect(calcularScore(metricas({ creditosCancelados: 3 })).puntaje).toBe(5);
    // con atraso promedio por encima de los días de gracia no suma
    expect(calcularScore(metricas({ aTiempo: 17, creditosCancelados: 2, atrasoPromedio: 3.5 })).puntaje).toBe(4);
  });

  it("nunca baja de 1", () => {
    expect(calcularScore(metricas({ aTiempo: 2, atrasoMaximo: 60, bloqueos: 1 })).puntaje).toBe(1);
  });

  it("topes por mora de hoy: 2, o 1 con más de 30 días", () => {
    const r = calcularScore(metricas({ cuotasMoraHoy: 2, diasMoraHoy: 10 }));
    expect(r.puntaje).toBe(2);
    expect(r.tope).toMatchObject({ maximo: 2 });
    expect(calcularScore(metricas({ cuotasMoraHoy: 1, diasMoraHoy: 31, atrasoMaximo: 31 })).puntaje).toBe(1);
    // la mora de hoy anula el bono por créditos cancelados
    expect(calcularScore(metricas({ creditosCancelados: 2, cuotasMoraHoy: 1, diasMoraHoy: 2 })).ajustes).toEqual([]);
  });

  it("no informa un tope que no influyó", () => {
    expect(calcularScore(metricas({ aTiempo: 5, cuotasMoraHoy: 1, diasMoraHoy: 2 })).tope).toBeNull();
  });
});

describe("metricasDesdeHistorial", () => {
  it("cuenta puntualidad con días de gracia, atrasos y mora de hoy", () => {
    const m = metricasDesdeHistorial([credito("EN_MORA", "2026-09-01", [0, 3, 4, 10, null, null])], HOY, 3);
    expect(m).toMatchObject({ pagadas: 4, aTiempo: 2, atrasoPromedio: 4.3, cuotasMoraHoy: 2, creditosActivos: 1, antiguedadMeses: 2 });
    // la cuota 5 vence el 2026-09-29: 57 días al 25-nov
    expect(m.diasMoraHoy).toBe(57);
    expect(m.atrasoMaximo).toBe(57);
    expect(calcularScore(m).puntaje).toBe(1);
  });

  it("ignora los créditos anulados (pero los cuenta)", () => {
    const m = metricasDesdeHistorial(
      [credito("ANULADO", "2026-01-01", [null, null, null]), credito("FINALIZADO_LIQUIDADO", "2026-03-01", [0, 1, 2])],
      HOY, 3);
    expect(m).toMatchObject({ pagadas: 3, aTiempo: 3, cuotasMoraHoy: 0, creditosAnulados: 1, creditosCancelados: 1, antiguedadMeses: 8 });
  });

  it("una cuota pagada sin fecha de pago cuenta como pagada pero no como a tiempo", () => {
    const c = credito("FINALIZADO_LIQUIDADO", "2026-03-01", [0, 0]);
    c.cuotas[1].fechaPago = null;
    const m = metricasDesdeHistorial([c], HOY, 3);
    expect(m).toMatchObject({ pagadas: 2, aTiempo: 1, atrasoPromedio: 0 });
  });

  it("suma bloqueos y considera la mora solo de créditos activos", () => {
    const m = metricasDesdeHistorial([credito("VIGENTE", "2026-10-01", [0, 0], 1), credito("REFINANCIADO", "2026-05-01", [0, null])], HOY, 3);
    expect(m.bloqueos).toBe(1);
    expect(m.cuotasMoraHoy).toBe(1);
  });

  it("historiales de ejemplo", () => {
    const excelente = metricasDesdeHistorial(
      [credito("FINALIZADO_LIQUIDADO", "2025-01-06", Array(20).fill(0)), credito("FINALIZADO_LIQUIDADO", "2025-08-04", Array(12).fill(1))],
      HOY, 3);
    expect(calcularScore(excelente).puntaje).toBe(5);
    expect(calcularScore(excelente).ajustes.map((a) => a.codigo)).toEqual(["CREDITOS_CANCELADOS"]);

    const irregular = metricasDesdeHistorial([credito("FINALIZADO_LIQUIDADO", "2025-01-06", [0, 0, 5, 8, 0, 35, 0, 0, 0, 0])], HOY, 3);
    expect(calcularScore(irregular)).toMatchObject({ base: 3, puntaje: 2 });

    const conGps = metricasDesdeHistorial([credito("VIGENTE", "2026-06-01", Array(10).fill(2), 1)], HOY, 3);
    expect(calcularScore(conGps).puntaje).toBe(4);
  });
});

describe("explicarScore", () => {
  it("explica la base, los atrasos, ajustes y topes", () => {
    const f = explicarScore(metricas({ aTiempo: 17, atrasoMaximo: 40, cuotasMoraHoy: 1, diasMoraHoy: 5, creditosAnulados: 1 }));
    const textos = f.map((x) => x.texto).join("\n");
    expect(textos).toContain("85 % de cuotas pagadas a tiempo (17 de 20, con 3 días de gracia) → base 4");
    expect(textos).toContain("Se atrasó 40 días");
    expect(textos).toContain("máximo 2");
    expect(textos).toContain("1 anulado (no cuenta)");
    expect(f.find((x) => x.texto.includes("Se atrasó"))?.tono).toBe("malo");
  });

  it("sin historial", () => {
    expect(explicarScore(metricas({ pagadas: 0, aTiempo: 0, creditosActivos: 0, antiguedadMeses: 0 }))).toEqual([
      { texto: "Aún no ha pagado cuotas: sin historial", tono: "neutro" },
    ]);
  });
});

describe("metricasDesdeJson", () => {
  it("lee el jsonb de cliente_score (snake_case)", () => {
    expect(metricasDesdeJson({ pagadas: 4, a_tiempo: 3, atraso_promedio: "1.5", cuotas_mora_hoy: 1, dias_gracia: 3 })).toMatchObject({
      pagadas: 4, aTiempo: 3, atrasoPromedio: 1.5, cuotasMoraHoy: 1, bloqueos: 0, diasGracia: 3,
    });
    expect(metricasDesdeJson(null)).toBeNull();
  });
});

describe("beneficios", () => {
  const conf = BENEFICIOS_POR_DEFECTO;

  it("normaliza la configuración con límites y orden", () => {
    expect(normalizarBeneficios(null)).toEqual(conf);
    const n = normalizarBeneficios({
      activo: true,
      niveles: [{ scoreMin: 4, nombre: "B", descuentoTasaPct: 90, reduccionInicialPct: -5, cuotasExtra: 3 }, { scoreMin: 5, nombre: "A" }],
      alertaScoreMax: 9,
      bloquearConMora: false,
    });
    expect(n.niveles.map((x) => x.nombre)).toEqual(["A", "B"]);
    expect(n.niveles[1]).toMatchObject({ descuentoTasaPct: 50, reduccionInicialPct: 0, cuotasExtra: 3 });
    expect(n.alertaScoreMax).toBe(4);
    expect(n.bloquearConMora).toBe(false);
  });

  it("evalúa al cliente: beneficio por nivel, sin beneficio, riesgo y bloqueo", () => {
    expect(evaluarCliente({ puntaje: 5, cuotasMoraHoy: 0, creditosCancelados: 1 }, conf).nivel?.nombre).toBe("Cliente excelente");
    expect(evaluarCliente({ puntaje: 4, cuotasMoraHoy: 0, creditosCancelados: 1 }, conf).nivel?.nombre).toBe("Cliente puntual");
    expect(evaluarCliente({ puntaje: 3, cuotasMoraHoy: 0, creditosCancelados: 1 }, conf)).toMatchObject({ nivel: null, motivoSinBeneficio: "Los beneficios empiezan con score 4" });
    expect(evaluarCliente({ puntaje: 5, cuotasMoraHoy: 0, creditosCancelados: 0 }, conf).motivoSinBeneficio).toBe("Aún no cancela un crédito");
    expect(evaluarCliente({ puntaje: 5, cuotasMoraHoy: 0, creditosCancelados: 0 }, { ...conf, requiereCreditoCancelado: false }).nivel).not.toBeNull();
    expect(evaluarCliente({ puntaje: null, cuotasMoraHoy: 0, creditosCancelados: 0 }, conf)).toMatchObject({ nivel: null, alertaRiesgo: null, bloqueo: null });

    const malo = evaluarCliente({ puntaje: 2, cuotasMoraHoy: 2, creditosCancelados: 3 }, conf);
    expect(malo.nivel).toBeNull();
    expect(malo.alertaRiesgo).toContain("Score 2");
    expect(malo.bloqueo).toContain("2 cuotas vencidas");
    expect(evaluarCliente({ puntaje: 2, cuotasMoraHoy: 2, creditosCancelados: 0 }, { ...conf, bloquearConMora: false }).bloqueo).toBeNull();
    expect(evaluarCliente({ puntaje: 1, cuotasMoraHoy: 0, creditosCancelados: 0 }, { ...conf, alertaScoreMax: 0 }).alertaRiesgo).toBeNull();
    expect(evaluarCliente({ puntaje: 5, cuotasMoraHoy: 0, creditosCancelados: 1 }, { ...conf, activo: false }).nivel).toBeNull();
  });

  it("aplica el beneficio a la tasa, la inicial y el máximo de cuotas", () => {
    const n = conf.niveles[0];
    expect(aplicarBeneficio({ tasaPorcentaje: 3, cuotaInicial: 1500, cuotasMax: 52 }, n)).toEqual({ tasaPorcentaje: 2.7, cuotaInicial: 750, cuotasMax: 56 });
    expect(aplicarBeneficio({ tasaPorcentaje: 2.5, cuotaInicial: 333.33 }, conf.niveles[1])).toEqual({ tasaPorcentaje: 2.375, cuotaInicial: 250, cuotasMax: null });
    expect(aplicarBeneficio({ tasaPorcentaje: null, cuotaInicial: 0 }, n)).toMatchObject({ tasaPorcentaje: null, cuotaInicial: 0 });
  });

  it("describe el beneficio", () => {
    expect(describirBeneficio(conf.niveles[0])).toBe("10 % menos de tasa · 50 % menos de inicial · hasta 4 cuotas más");
    expect(describirBeneficio({ ...conf.niveles[0], descuentoTasaPct: 0, reduccionInicialPct: 0, cuotasExtra: 0 })).toBe("sin condiciones especiales");
  });
});
