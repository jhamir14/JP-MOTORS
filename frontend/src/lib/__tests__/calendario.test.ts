import { describe, expect, it } from "vitest";
import {
  domingoDePascua,
  esDiaHabil,
  fechasCronograma,
  feriadosNacionales,
  parsearFeriados,
  siguienteDiaHabil,
  sumarMeses,
} from "@/lib/calendario";

const feriados2026 = new Set(feriadosNacionales(2026).map((f) => f.fecha));

describe("feriados nacionales", () => {
  it("calcula Semana Santa", () => {
    expect(domingoDePascua(2026)).toBe("2026-04-05");
    expect(domingoDePascua(2027)).toBe("2027-03-28");
    expect(feriados2026.has("2026-04-02")).toBe(true); // Jueves Santo
    expect(feriados2026.has("2026-04-03")).toBe(true); // Viernes Santo
  });
  it("incluye los 16 feriados del año", () => {
    expect(feriadosNacionales(2026)).toHaveLength(16);
    expect(feriados2026.has("2026-12-09")).toBe(true);
  });
});

describe("días hábiles", () => {
  it("domingos y feriados no son hábiles", () => {
    expect(esDiaHabil("2026-11-29", feriados2026)).toBe(false); // domingo
    expect(esDiaHabil("2026-12-08", feriados2026)).toBe(false); // feriado
    expect(esDiaHabil("2026-11-28", feriados2026)).toBe(true); // sábado
  });
  it("pasa al siguiente día hábil (encadena feriado + feriado)", () => {
    expect(siguienteDiaHabil("2026-12-08", feriados2026)).toBe("2026-12-10");
    expect(siguienteDiaHabil("2026-07-28", feriados2026)).toBe("2026-07-30");
  });
  it("suma meses respetando fin de mes", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2026-01-15", 12)).toBe("2027-01-15");
  });
});

describe("fechasCronograma", () => {
  it("diario: lunes a sábado sin feriados", () => {
    // 2026-12-05 sábado → lun 7, (8 feriado), (9 feriado), jue 10, vie 11
    expect(fechasCronograma("2026-12-05", 5, "DIARIO", feriados2026)).toEqual([
      "2026-12-05", "2026-12-07", "2026-12-10", "2026-12-11", "2026-12-12",
    ]);
  });
  it("semanal: la cuota que cae en feriado pasa al día hábil siguiente sin correr las demás", () => {
    expect(fechasCronograma("2026-11-24", 4, "SEMANAL", feriados2026)).toEqual([
      "2026-11-24", "2026-12-01", "2026-12-10", "2026-12-15",
    ]);
  });
  it("mensual: mismo día de cada mes; si es domingo, el lunes", () => {
    expect(fechasCronograma("2026-10-28", 3, "MENSUAL", feriados2026)).toEqual(["2026-10-28", "2026-11-28", "2026-12-28"]);
    expect(fechasCronograma("2026-06-28", 2, "MENSUAL", feriados2026)).toEqual(["2026-06-30", "2026-07-30"]); // 28-jun domingo y 29 feriado; 28-jul y 29-jul feriados
  });
  it("ninguna fecha cae en domingo o feriado y son crecientes", () => {
    for (const frecuencia of ["DIARIO", "SEMANAL", "QUINCENAL", "MENSUAL"] as const) {
      const fechas = fechasCronograma("2026-01-01", 60, frecuencia, feriados2026);
      expect(fechas.every((f) => esDiaHabil(f, feriados2026) || f > "2026-12-31")).toBe(true);
      expect(fechas.every((f, i) => i === 0 || f > fechas[i - 1])).toBe(true);
    }
  });
});

describe("parsearFeriados", () => {
  it("acepta fecha con o sin nombre, ordena y quita duplicados", () => {
    expect(parsearFeriados("2026-12-25 Navidad\n\n2026-01-01\n2026-12-25")).toEqual({ fechas: ["2026-01-01", "2026-12-25"] });
  });
  it("rechaza fechas inválidas", () => {
    expect(parsearFeriados("2026-02-30")).toHaveProperty("error");
    expect(parsearFeriados("25/12/2026")).toHaveProperty("error");
  });
});
