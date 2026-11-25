import { describe, expect, it } from "vitest";
import { esImeiValido, esPlacaValida, esVinValido } from "@/lib/validaciones";

describe("esImeiValido", () => {
  it("acepta IMEI con dígito Luhn correcto", () => {
    expect(esImeiValido("490154203237518")).toBe(true);
    expect(esImeiValido("356938035643809")).toBe(true);
  });
  it("rechaza dígito verificador incorrecto, largo distinto o letras", () => {
    expect(esImeiValido("490154203237519")).toBe(false);
    expect(esImeiValido("49015420323751")).toBe(false);
    expect(esImeiValido("49015420323751A")).toBe(false);
  });
});

describe("esVinValido", () => {
  it("acepta 17 caracteres alfanuméricos sin I, O, Q", () => {
    expect(esVinValido("9C2KC1670LR500123")).toBe(true);
    expect(esVinValido("md2a14az5mwj12345")).toBe(true);
  });
  it("rechaza largo distinto o letras prohibidas", () => {
    expect(esVinValido("9C2KC1670LR50012")).toBe(false);
    expect(esVinValido("9C2KC1670LR50012O")).toBe(false);
  });
});

describe("esPlacaValida", () => {
  it("acepta placas de moto y vacío (en trámite)", () => {
    expect(esPlacaValida("1234-AB")).toBe(true);
    expect(esPlacaValida("ABC-123")).toBe(true);
    expect(esPlacaValida("")).toBe(true);
    expect(esPlacaValida("A")).toBe(false);
  });
});
