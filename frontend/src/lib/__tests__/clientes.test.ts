import { describe, expect, it } from "vitest";
import {
  buscarDuplicado,
  coordenadasEnPeru,
  digitoVerificadorRuc,
  documentosEquivalentes,
  errorDocumento,
  esRucValido,
  estadoCivilDesdeWeb,
  faltantesCliente,
  normalizarCelular,
  normalizarDocumento,
  puedeBloquearCliente,
  puedeEditarKyc,
  puedeVerDocumento,
  type DatosKyc,
} from "@/lib/clientes";

describe("errorDocumento", () => {
  it("DNI: 8 dígitos", () => {
    expect(errorDocumento("DNI", "45678912")).toBeNull();
    expect(errorDocumento("DNI", "4567891")).toMatch(/8 dígitos/);
    expect(errorDocumento("DNI", "4567891A")).toMatch(/8 dígitos/);
  });
  it("carné de extranjería: 9 dígitos", () => {
    expect(errorDocumento("CARNET_EXTRANJERIA", "001234567")).toBeNull();
    expect(errorDocumento("CARNET_EXTRANJERIA", "12345678")).not.toBeNull();
  });
  it("pasaporte: 6 a 12 alfanuméricos", () => {
    expect(errorDocumento("PASAPORTE", "AB123456")).toBeNull();
    expect(errorDocumento("PASAPORTE", "AB12")).not.toBeNull();
  });
  it("RUC: 11 dígitos, prefijo válido y dígito verificador", () => {
    expect(errorDocumento("RUC", "20131312955")).toBeNull(); // SUNAT
    expect(errorDocumento("RUC", "20131312954")).toMatch(/verificador/);
    expect(errorDocumento("RUC", "30131312955")).toMatch(/verificador/);
    expect(errorDocumento("RUC", "2013131295")).toMatch(/11 dígitos/);
  });
});

describe("RUC", () => {
  it("calcula el dígito verificador (módulo 11)", () => {
    expect(digitoVerificadorRuc("2013131295")).toBe(5);
    const ruc = `1045678912${digitoVerificadorRuc("1045678912")}`;
    expect(esRucValido(ruc)).toBe(true);
  });
});

describe("normalización", () => {
  it("quita puntos, espacios y guiones del documento", () => {
    expect(normalizarDocumento(" 45.678.912 ")).toBe("45678912");
    expect(normalizarDocumento("ab-123 456")).toBe("AB123456");
  });
  it("normaliza celulares peruanos", () => {
    expect(normalizarCelular("+51 987 654 321")).toBe("987654321");
    expect(normalizarCelular("987-654-321")).toBe("987654321");
    expect(normalizarCelular("01 4567890")).toBeNull();
    expect(normalizarCelular("98765432")).toBeNull();
  });
});

describe("detección de duplicados", () => {
  const existentes = [
    { id: "a", tipo_documento: "DNI", numero_documento: "45678912" },
    { id: "b", tipo_documento: "CARNET_EXTRANJERIA", numero_documento: "001234567" },
    { id: "c", tipo_documento: "RUC", numero_documento: `1071234567${digitoVerificadorRuc("1071234567")}` },
  ];

  it("encuentra el mismo documento aunque se escriba con puntos", () => {
    expect(buscarDuplicado(existentes, "DNI", "45.678.912")?.id).toBe("a");
  });
  it("un DNI coincide con el RUC 10 de la misma persona y viceversa", () => {
    expect(buscarDuplicado(existentes, "DNI", "71234567")?.id).toBe("c");
    const ruc = `1045678912${digitoVerificadorRuc("1045678912")}`;
    expect(buscarDuplicado(existentes, "RUC", ruc)?.id).toBe("a");
    expect(documentosEquivalentes("RUC", ruc)).toContainEqual({ tipo: "DNI", numero: "45678912" });
  });
  it("no confunde tipos distintos con el mismo número ni se detecta a sí mismo", () => {
    expect(buscarDuplicado(existentes, "PASAPORTE", "45678912")).toBeUndefined();
    expect(buscarDuplicado(existentes, "DNI", "45678912", "a")).toBeUndefined();
    expect(buscarDuplicado(existentes, "DNI", "11111111")).toBeUndefined();
  });
});

describe("faltantesCliente", () => {
  const completo: DatosKyc = {
    tipo_documento: "DNI", numero_documento: "45678912", fecha_nacimiento: "1990-04-12", sexo: "FEMENINO",
    estado_civil: "CASADO", telefono: "987654321", direccion: "Av. Los Ruiseñores 123", distrito: "Santa Anita",
    provincia: "Lima", departamento: "Lima", referencia: "Frente al parque", tipo_vivienda: "PROPIA",
    latitud: -12.04, longitud: -76.97, ocupacion: "Mototaxista", ingreso_mensual: 2500,
  };
  const docs = ["DNI_ANVERSO", "DNI_REVERSO", "RECIBO_SERVICIO", "FACHADA"];

  it("expediente completo no tiene pendientes", () => {
    expect(faltantesCliente(completo, docs)).toEqual([]);
  });
  it("cliente migrado: documento provisional, sin domicilio, sin GPS ni fotos", () => {
    const f = faltantesCliente({ ...completo, numero_documento: "SIN-DOC-7", direccion: null, latitud: null, telefono: "" }, []);
    expect(f).toContain("Número de documento válido");
    expect(f).toContain("Dirección del domicilio");
    expect(f).toContain("Ubicación GPS del domicilio");
    expect(f).toContain("Celular");
    expect(f).toContain("Foto: DNI (anverso)");
    expect(f).toContain("Foto: Fachada del domicilio");
  });
});

describe("permisos por rol", () => {
  it("el cobrador no edita KYC ni ve DNI/recibos; sí la fachada", () => {
    expect(puedeEditarKyc("COBRADOR")).toBe(false);
    expect(puedeVerDocumento("COBRADOR", "DNI_ANVERSO")).toBe(false);
    expect(puedeVerDocumento("COBRADOR", "RECIBO_SERVICIO")).toBe(false);
    expect(puedeVerDocumento("COBRADOR", "FACHADA")).toBe(true);
  });
  it("ventas y administración editan KYC; solo administración bloquea", () => {
    for (const rol of ["SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS"] as const) {
      expect(puedeEditarKyc(rol)).toBe(true);
      expect(puedeVerDocumento(rol, "DNI_REVERSO")).toBe(true);
    }
    expect(puedeBloquearCliente("ASESOR_VENTAS")).toBe(false);
    expect(puedeBloquearCliente("ADMIN_CREDITOS")).toBe(true);
  });
});

describe("utilidades", () => {
  it("valida coordenadas dentro del Perú", () => {
    expect(coordenadasEnPeru(-12.0464, -77.0428)).toBe(true); // Lima
    expect(coordenadasEnPeru(-77.0428, -12.0464)).toBe(false); // invertidas
    expect(coordenadasEnPeru(0, 0)).toBe(false);
  });
  it("mapea el estado civil del formulario web", () => {
    expect(estadoCivilDesdeWeb("Casado(a)")).toBe("CASADO");
    expect(estadoCivilDesdeWeb("Conviviente")).toBe("CONVIVIENTE");
    expect(estadoCivilDesdeWeb("")).toBeNull();
  });
});

describe("documentos provisionales de la migración", () => {
  it("se reconocen con o sin guiones", () => {
    const base = { tipo_documento: "DNI", fecha_nacimiento: null, sexo: null, estado_civil: null, telefono: null, direccion: null, distrito: null, provincia: null, departamento: null, referencia: null, tipo_vivienda: null, latitud: null, longitud: null, ocupacion: null, ingreso_mensual: null };
    expect(faltantesCliente({ ...base, numero_documento: "SIN-DOC-7" }, [])).toContain("Número de documento válido");
    expect(faltantesCliente({ ...base, numero_documento: "SINDOC7" }, [])).toContain("Número de documento válido");
  });
});
