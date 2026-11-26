import { describe, expect, it } from "vitest";
import { esDiaHabil } from "@/lib/calendario";
import {
  errorMotivoAnulacion,
  feriadosDesdeConfig,
  planCredito,
  primerVencimientoSugerido,
  validarCredito,
  type EntradaCredito,
} from "@/lib/creditos";
import { FRECUENCIAS, TIPOS_CALCULO } from "@/lib/finance";

const FERIADOS = new Set(["2026-12-08", "2026-12-09", "2026-12-25", "2027-01-01", "2027-05-01"]);
const r2 = (n: number) => Math.round(n * 100) / 100;

const base: EntradaCredito = {
  tipo: "CREDITO_VEHICULAR",
  precio: 8990,
  cuotaInicial: 1500,
  numeroCuotas: 12,
  frecuencia: "MENSUAL",
  tipoCalculo: "FRANCES",
  tasaPorcentaje: 2,
  montoCuota: null,
  penalidadDiaria: 5,
  fechaDesembolso: "2026-11-30",
  primerVencimiento: "2026-12-30",
};

/** Las mismas restricciones que la base impone a credito y cuota. */
function cumpleReglasDeLaBase(e: EntradaCredito, feriados = FERIADOS) {
  const p = planCredito(e, feriados);
  expect(p.cuotas).toHaveLength(e.numeroCuotas);
  // credito: monto_total_pagar = monto_total - cuota_inicial + total_intereses
  expect(r2(e.precio - e.cuotaInicial + p.totalIntereses)).toBe(p.totalPagar);
  expect(p.totalIntereses).toBeGreaterThanOrEqual(0);
  expect(p.valorCuota).toBeGreaterThan(0);
  // cuota: capital + interes = monto_cuota; montos ≥ 0 y en céntimos
  for (const c of p.cuotas) {
    expect(r2(c.capital + c.interes)).toBe(c.cuota);
    for (const v of [c.cuota, c.capital, c.interes, c.saldo]) expect(r2(v)).toBe(v);
    expect(c.cuota).toBeGreaterThan(0);
    expect(c.interes).toBeGreaterThanOrEqual(0);
  }
  // Suma de cuotas = total a pagar; suma de capital = financiado; saldo final 0
  expect(r2(p.cuotas.reduce((s, c) => s + c.cuota, 0))).toBe(p.totalPagar);
  expect(r2(p.cuotas.reduce((s, c) => s + c.capital, 0))).toBe(p.financiado);
  expect(p.cuotas.at(-1)!.saldo).toBe(0);
  // Fechas: hábiles, estrictamente crecientes, posteriores a la entrega
  let anterior = e.fechaDesembolso;
  for (const c of p.cuotas) {
    expect(esDiaHabil(c.fecha, feriados)).toBe(true);
    expect(c.fecha > anterior).toBe(true);
    anterior = c.fecha;
  }
  expect(p.ultimoVencimiento).toBe(p.cuotas.at(-1)!.fecha);
  return p;
}

describe("planCredito", () => {
  it("crédito vehicular francés: cuota de tabla, TEA y cronograma cuadrado", () => {
    const p = cumpleReglasDeLaBase(base);
    expect(p.financiado).toBe(7490);
    expect(p.valorCuota).toBe(708.25); // 7490 · 0.02·1.02^12 / (1.02^12 − 1)
    expect(p.teaPorcentaje).toBeCloseTo(26.82, 2);
    expect(p.tasaPorcentaje).toBe(2);
  });

  it("flat: interés total = capital × tasa y todas las cuotas iguales salvo redondeo", () => {
    const p = cumpleReglasDeLaBase({ ...base, tipoCalculo: "FLAT", tasaPorcentaje: 20, numeroCuotas: 10 });
    expect(p.totalIntereses).toBe(1498);
    expect(p.valorCuota).toBe(898.8);
    expect(new Set(p.cuotas.map((c) => c.cuota)).size).toBe(1);
  });

  it("cuota fija pactada: deduce la tasa y respeta la cuota", () => {
    const p = cumpleReglasDeLaBase({ ...base, tasaPorcentaje: null, montoCuota: 720 });
    expect(p.valorCuota).toBe(720);
    expect(p.totalPagar).toBeCloseTo(720 * 12, 0);
    expect(p.tasaPorcentaje).toBeGreaterThan(2);
  });

  it("tasa 0: sin intereses y TEA 0", () => {
    const p = cumpleReglasDeLaBase({ ...base, tasaPorcentaje: 0, numeroCuotas: 7 });
    expect(p.totalIntereses).toBe(0);
    expect(p.teaPorcentaje).toBe(0);
  });

  it("sin inicial y con céntimos: la última cuota absorbe el redondeo", () => {
    const p = cumpleReglasDeLaBase({ ...base, precio: 1000, cuotaInicial: 0, numeroCuotas: 3, tasaPorcentaje: 0 });
    expect(p.cuotas.map((c) => c.cuota)).toEqual([333.33, 333.33, 333.34]);
  });

  it("diario: salta domingos y feriados (8, 9 y 25 de diciembre)", () => {
    const p = cumpleReglasDeLaBase({
      ...base,
      tipo: "CREDITO_CELULAR",
      precio: 1299,
      cuotaInicial: 199,
      frecuencia: "DIARIO",
      tipoCalculo: "FLAT",
      tasaPorcentaje: 25,
      numeroCuotas: 60,
      fechaDesembolso: "2026-12-05",
      primerVencimiento: "2026-12-07",
    });
    const fechas = p.cuotas.map((c) => c.fecha);
    expect(fechas.slice(0, 3)).toEqual(["2026-12-07", "2026-12-10", "2026-12-11"]);
    expect(fechas).not.toContain("2026-12-25");
    expect(fechas).not.toContain("2026-12-13"); // domingo
  });

  it("primer vencimiento en domingo pasa al lunes", () => {
    const p = planCredito({ ...base, primerVencimiento: "2027-01-03" }, FERIADOS);
    expect(p.cuotas[0].fecha).toBe("2027-01-04");
  });

  // Todas las combinaciones de frecuencia × tipo de cálculo × tasa/cuota fija
  for (const frecuencia of FRECUENCIAS)
    for (const tipoCalculo of TIPOS_CALCULO)
      for (const modo of ["tasa", "cuota"] as const)
        for (const n of [1, 2, 7, 24]) {
          it(`${frecuencia} · ${tipoCalculo} · por ${modo} · ${n} cuotas cumple las reglas de la base`, () => {
            const financiado = 5432.1;
            const e: EntradaCredito = {
              ...base,
              precio: 6000,
              cuotaInicial: 567.9,
              numeroCuotas: n,
              frecuencia,
              tipoCalculo,
              tasaPorcentaje: modo === "tasa" ? (tipoCalculo === "FLAT" ? 18.5 : 1.75) : null,
              montoCuota: modo === "cuota" ? Math.ceil((financiado * 1.2 * 100) / n) / 100 : null,
              primerVencimiento: primerVencimientoSugerido(base.fechaDesembolso, frecuencia, FERIADOS),
            };
            cumpleReglasDeLaBase(e);
          });
        }
});

describe("validarCredito", () => {
  it("acepta condiciones válidas", () => {
    expect(validarCredito(base)).toEqual({});
  });

  it("rechaza inicial ≥ precio, precio 0 y decimales de más", () => {
    expect(validarCredito({ ...base, cuotaInicial: 8990 }).cuotaInicial).toBeDefined();
    expect(validarCredito({ ...base, precio: 0 }).precio).toBeDefined();
    expect(validarCredito({ ...base, precio: 100.555 }).precio).toBeDefined();
  });

  it("exige tasa o cuota, y que la cuota cubra el capital", () => {
    expect(validarCredito({ ...base, tasaPorcentaje: null }).tasaPorcentaje).toBeDefined();
    expect(validarCredito({ ...base, tasaPorcentaje: null, montoCuota: 100 }).montoCuota).toMatch(/no alcanzan/);
  });

  it("respeta el rango de cuotas de la tasa y el máximo por frecuencia", () => {
    expect(validarCredito({ ...base, numeroCuotas: 5 }, { cuotasMin: 6, cuotasMax: 36 }).numeroCuotas).toMatch(/Entre 6 y 36/);
    expect(validarCredito({ ...base, numeroCuotas: 49 }).numeroCuotas).toBeDefined();
    expect(validarCredito({ ...base, numeroCuotas: 2.5 }).numeroCuotas).toBeDefined();
  });

  it("el primer vencimiento debe ser posterior a la entrega y dentro de 3 meses", () => {
    expect(validarCredito({ ...base, primerVencimiento: "2026-11-30" }).primerVencimiento).toBeDefined();
    expect(validarCredito({ ...base, primerVencimiento: "2027-03-31" }).primerVencimiento).toBeDefined();
    expect(validarCredito({ ...base, primerVencimiento: "2026-02-30" }).primerVencimiento).toBe("Fecha no válida");
  });

  it("bloquea una TEA por encima del tope configurado", () => {
    expect(validarCredito(base, { topeTea: 20 }).tasaPorcentaje).toMatch(/supera el tope/);
    expect(validarCredito(base, { topeTea: 30 })).toEqual({});
  });

  it("planCredito lanza si las condiciones no son válidas", () => {
    expect(() => planCredito({ ...base, precio: -1 }, FERIADOS)).toThrow();
  });
});

describe("utilidades", () => {
  it("primer vencimiento sugerido: un periodo después y en día hábil", () => {
    expect(primerVencimientoSugerido("2026-11-30", "MENSUAL", FERIADOS)).toBe("2026-12-30");
    expect(primerVencimientoSugerido("2026-12-07", "DIARIO", FERIADOS)).toBe("2026-12-10");
    expect(primerVencimientoSugerido("2026-12-01", "SEMANAL", FERIADOS)).toBe("2026-12-10"); // 8 → feriados 8 y 9
    expect(primerVencimientoSugerido("2026-12-10", "QUINCENAL", FERIADOS)).toBe("2026-12-26");
  });

  it("feriados desde la configuración ignora valores no válidos", () => {
    expect([...feriadosDesdeConfig(["2026-12-25", "x", 3, "2026-02-30"])]).toEqual(["2026-12-25"]);
    expect(feriadosDesdeConfig(null).size).toBe(0);
  });

  it("motivo de anulación obligatorio", () => {
    expect(errorMotivoAnulacion("error")).toBeTruthy();
    expect(errorMotivoAnulacion("Cliente desistió antes de la entrega")).toBeNull();
  });
});

describe("préstamo de dinero", () => {
  const prestamo = {
    tipo: "PRESTAMO_EFECTIVO" as const,
    precio: 1000,
    cuotaInicial: 0,
    numeroCuotas: 4,
    frecuencia: "SEMANAL" as const,
    tipoCalculo: "FLAT" as const,
    tasaPorcentaje: 20,
    montoCuota: null,
    penalidadDiaria: 2,
    fechaDesembolso: "2026-11-26",
    primerVencimiento: "2026-12-03",
  };
  it("S/ 1,000 al 20 % en 4 cuotas semanales: 4 × S/ 300", () => {
    const plan = planCredito(prestamo, new Set());
    expect(plan.cuotas.map((c) => c.cuota)).toEqual([300, 300, 300, 300]);
    expect(plan.totalPagar).toBe(1200);
    expect(plan.totalIntereses).toBe(200);
  });
  it("no lleva inicial", () => {
    expect(validarCredito({ ...prestamo, cuotaInicial: 100 }).cuotaInicial).toMatch(/inicial/);
  });
});
