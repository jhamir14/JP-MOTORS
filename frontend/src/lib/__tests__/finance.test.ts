import { describe, expect, it } from "vitest";
import { cuotaFrancesa, tasaEfectivaAnual } from "@/lib/finance";

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
