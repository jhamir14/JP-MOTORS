import { describe, expect, it } from "vitest";
import { calcularCredito, cronograma, cuotaFrancesa, tasaEfectivaAnual, tasaImplicita } from "@/lib/finance";

describe("cuotaFrancesa", () => {
  it("calcula la cuota fija con la fórmula francesa", () => {
    // 10,000 a 2% mensual en 12 meses → 945.60 (valor de tabla)
    expect(cuotaFrancesa(10_000, 0.02, 12)).toBeCloseTo(945.6, 2);
  });

  it("la suma de cuotas cubre capital + intereses", () => {
    const cuota = cuotaFrancesa(5_000, 0.02, 6);
    let saldo = 5_000;
    for (let i = 0; i < 6; i++) saldo = saldo * 1.02 - cuota;
    expect(saldo).toBeCloseTo(0, 6);
  });

  it("con tasa 0 reparte el capital en partes iguales", () => {
    expect(cuotaFrancesa(1_200, 0, 12)).toBe(100);
  });

  it("devuelve 0 si no hay saldo a financiar o plazo", () => {
    expect(cuotaFrancesa(0, 0.02, 12)).toBe(0);
    expect(cuotaFrancesa(-50, 0.02, 12)).toBe(0);
    expect(cuotaFrancesa(1_000, 0.02, 0)).toBe(0);
  });
});

describe("tasaEfectivaAnual", () => {
  it("2% mensual ≈ 26.82% TEA", () => {
    expect(tasaEfectivaAnual(0.02, 12)).toBeCloseTo(0.26824, 4);
  });
  it("1.2% semanal ≈ 85.9% TEA", () => {
    expect(tasaEfectivaAnual(0.012, 52)).toBeCloseTo(0.8596, 3);
  });
});


describe("tasaImplicita", () => {
  it("recupera la tasa usada para calcular una cuota francesa", () => {
    const cuota = cuotaFrancesa(8_000, 0.02, 24);
    expect(tasaImplicita(8_000, cuota, 24)).toBeCloseTo(0.02, 8);
  });
  it("es 0 si no hay intereses y NaN si la cuota no cubre el capital", () => {
    expect(tasaImplicita(1_200, 100, 12)).toBe(0);
    expect(tasaImplicita(1_200, 90, 12)).toBeNaN();
  });
});

describe("calcularCredito", () => {
  it("FRANCES mensual: cuota, intereses y TEA", () => {
    const r = calcularCredito({ monto: 12_000, cuotaInicial: 2_000, numeroCuotas: 12, frecuencia: "MENSUAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2 });
    expect(r.financiado).toBe(10_000);
    expect(r.cuota).toBeCloseTo(945.6, 2);
    expect(r.totalIntereses).toBeCloseTo(945.6 * 12 - 10_000, 1);
    expect(r.teaPorcentaje).toBeCloseTo(26.82, 2);
  });

  it("FLAT: el interés es un % total del capital y la TEA refleja el costo real", () => {
    // Préstamo en efectivo del sistema anterior: S/ 1,000 al 20 % flat en 4 cuotas semanales
    const r = calcularCredito({ monto: 1_000, numeroCuotas: 4, frecuencia: "SEMANAL", tipoCalculo: "FLAT", tasaPorcentaje: 20 });
    expect(r.cuota).toBe(300);
    expect(r.totalIntereses).toBeCloseTo(200, 6);
    // TIR semanal ≈ 7.71 %  →  TEA muy alta: el sistema debe mostrarla
    expect(r.tasaPeriodo).toBeCloseTo(0.0771, 3);
    expect(r.teaPorcentaje).toBeGreaterThan(4_000);
  });

  it("cuota fija definida por el admin: deduce la tasa equivalente", () => {
    const r = calcularCredito({ monto: 1_300, numeroCuotas: 16, frecuencia: "SEMANAL", tipoCalculo: "FRANCES", montoCuota: 90 });
    expect(r.cuota).toBe(90);
    expect(calcularCredito({ monto: 1_300, numeroCuotas: 16, frecuencia: "SEMANAL", tipoCalculo: "FRANCES", tasaPorcentaje: r.tasaPorcentaje }).cuota).toBeCloseTo(90, 6);
  });

  it("la inicial no puede superar el precio y sin saldo no hay cuota", () => {
    const r = calcularCredito({ monto: 500, cuotaInicial: 800, numeroCuotas: 8, frecuencia: "SEMANAL", tipoCalculo: "FRANCES", tasaPorcentaje: 1.2 });
    expect(r.financiado).toBe(0);
    expect(r.cuota).toBe(0);
  });

  it("quincenal usa 24 periodos al año", () => {
    const r = calcularCredito({ monto: 1_000, numeroCuotas: 12, frecuencia: "QUINCENAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2.4 });
    expect(r.teaPorcentaje).toBeCloseTo((Math.pow(1.024, 24) - 1) * 100, 6);
  });
});

describe("cronograma", () => {
  it.each([
    ["FRANCES", 2, "MENSUAL", 24, 9_572.8],
    ["FLAT", 20, "DIARIO", 24, 1_000],
    ["FRANCES", 1.2, "SEMANAL", 26, 1_799.99],
  ] as const)("%s %s%% %s: capital y total cuadran al céntimo", (tipo, tasa, frecuencia, n, monto) => {
    const filas = cronograma({ monto, numeroCuotas: n, frecuencia, tipoCalculo: tipo, tasaPorcentaje: tasa });
    const r = calcularCredito({ monto, numeroCuotas: n, frecuencia, tipoCalculo: tipo, tasaPorcentaje: tasa });
    expect(filas).toHaveLength(n);
    const capital = filas.reduce((s, f) => s + f.capital, 0);
    const total = filas.reduce((s, f) => s + f.cuota, 0);
    expect(capital).toBeCloseTo(monto, 2);
    expect(total).toBeCloseTo(Math.round(r.totalPagar * 100) / 100, 2);
    expect(filas.at(-1)!.saldo).toBe(0);
    filas.forEach((f) => expect(f.capital + f.interes).toBeCloseTo(f.cuota, 2));
  });
});
