import { describe, expect, it } from "vitest";
import { esErrorDeControl, sanitizarMensaje, sanitizarRuta } from "../errores";

describe("sanitizarMensaje", () => {
  it("quita DNI, teléfonos, correos, tokens y cadenas de conexión", () => {
    const m = sanitizarMensaje(
      new Error('duplicate key: Key (numero_documento)=(45678912) ana.perez@gmail.com tel 987 654 321 token ' + "a".repeat(64) + " postgresql://u:p@host:5432/db"),
    );
    expect(m).not.toMatch(/45678912|ana\.perez|987 654 321|aaaa|u:p@host/);
    expect(m).toContain("Error: duplicate key");
    expect(m).toContain("[número]");
    expect(m).toContain("[correo]");
    expect(m).toContain("[token]");
    expect(m).toContain("postgresql://[oculto]");
  });
  it("recorta y tolera valores no texto", () => {
    expect(sanitizarMensaje("x".repeat(5000)).length).toBe(1000);
    expect(sanitizarMensaje(null)).toBe("Error sin mensaje");
    expect(sanitizarMensaje({ toString: () => "raro" })).toBe("raro");
  });
});

describe("sanitizarRuta", () => {
  it("sin query y con ids anonimizados", () => {
    expect(sanitizarRuta("/admin/clientes/0f8fad5b-d9cb-469f-a165-70867728950e?q=45678912#x")).toBe("/admin/clientes/:id");
    expect(sanitizarRuta(`/r/${"ab".repeat(32)}`)).toBe("/r/:token");
    expect(sanitizarRuta("/api/documentos/pago/12345")).toBe("/api/documentos/pago/:n");
    expect(sanitizarRuta(undefined)).toBeNull();
  });
});

describe("esErrorDeControl", () => {
  it("redirect() y notFound() no se registran", () => {
    expect(esErrorDeControl(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/admin/login;307;" }))).toBe(true);
    expect(esErrorDeControl(Object.assign(new Error(""), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }))).toBe(true);
    expect(esErrorDeControl(new Error("boom"))).toBe(false);
    expect(esErrorDeControl("texto")).toBe(false);
  });
});
