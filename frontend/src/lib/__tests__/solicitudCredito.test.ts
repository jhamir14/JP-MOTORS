import { describe, expect, it } from "vitest";
import { erroresPorCampo, solicitudCreditoSchema } from "@/schemas/solicitudCredito";

const valida = {
  nombres: "Juan Carlos",
  apellidos: "Pérez Quispe",
  tipoDocumento: "DNI",
  numeroDocumento: "45678912",
  fechaNacimiento: "1990-05-10",
  estadoCivil: "Casado(a)",
  nivelEducacion: "Secundaria",
  celular: "987 654 321",
  correo: "Juan@Example.com",
  preferenciaContacto: "WhatsApp",
  departamento: "Lima",
  provincia: "Lima",
  distrito: "San Juan de Lurigancho",
  marcaMoto: "Honda",
  modeloMoto: "Navi",
  usoMoto: "Trabajo",
  situacionLaboral: "Independiente",
  ingresoMensual: "1800",
  montoInicial: "500",
  aceptaDatos: true,
};

const errores = (overrides: Record<string, unknown>) => {
  const r = solicitudCreditoSchema.safeParse({ ...valida, ...overrides });
  return r.success ? {} : erroresPorCampo(r.error);
};

describe("solicitudCreditoSchema", () => {
  it("acepta una solicitud válida y normaliza celular y correo", () => {
    const r = solicitudCreditoSchema.parse(valida);
    expect(r.celular).toBe("987654321");
    expect(r.correo).toBe("juan@example.com");
  });

  it("acepta celular con prefijo +51", () => {
    expect(errores({ celular: "+51 987654321" })).toEqual({});
  });

  it.each([
    ["DNI", "1234567", true],
    ["DNI", "123456789", true],
    ["DNI", "1234567A", true],
    ["DNI", "12345678", false],
    ["CE", "001234567", false],
    ["CE", "12345678", true],
    ["Pasaporte", "ab12345", false],
    ["Pasaporte", "AB1", true],
  ])("documento %s '%s' → error: %s", (tipo, numero, debeFallar) => {
    expect(Boolean(errores({ tipoDocumento: tipo, numeroDocumento: numero }).numeroDocumento)).toBe(debeFallar);
  });

  it("rechaza celulares que no son móviles peruanos", () => {
    expect(errores({ celular: "12345678" }).celular).toBeDefined();
    expect(errores({ celular: "812345678" }).celular).toBeDefined();
  });

  it("rechaza menores de edad", () => {
    const hace17 = new Date();
    hace17.setFullYear(hace17.getFullYear() - 17);
    expect(errores({ fechaNacimiento: hace17.toISOString().slice(0, 10) }).fechaNacimiento).toMatch(/18/);
  });

  it("rechaza montos no numéricos o negativos", () => {
    expect(errores({ montoInicial: "-5" }).montoInicial).toBeDefined();
    expect(errores({ ingresoMensual: "mil" }).ingresoMensual).toBeDefined();
    expect(errores({ ingresoMensual: "0" }).ingresoMensual).toBeDefined();
    expect(errores({ montoInicial: "0" })).toEqual({});
  });

  it("exige el consentimiento de datos personales", () => {
    expect(errores({ aceptaDatos: false }).aceptaDatos).toBeDefined();
  });
});
