import { describe, expect, it } from "vitest";
import { areaDe, categoriasDe, inventariosDe, puedeVerTipo, tiposDe, TIPOS_CREDITO } from "../areas";
import { ROLES, ROLES_ASIGNABLES } from "../roles";

describe("administradores por área", () => {
  it("cada administrador de área tiene un solo tipo de crédito", () => {
    expect(areaDe("ADMIN_CREDITOS")).toBe("PRESTAMO_EFECTIVO");
    expect(areaDe("ADMIN_MOTOS")).toBe("CREDITO_VEHICULAR");
    expect(areaDe("ADMIN_CELULARES")).toBe("CREDITO_CELULAR");
    for (const rol of ["ADMIN_CREDITOS", "ADMIN_MOTOS", "ADMIN_CELULARES"] as const) expect(tiposDe(rol)).toHaveLength(1);
  });

  it("superadmin, cobrador y cuentas antiguas ven todas las áreas", () => {
    for (const rol of ["SUPERADMIN", "COBRADOR", "ASESOR_VENTAS"] as const) {
      expect(areaDe(rol)).toBeNull();
      expect(tiposDe(rol)).toEqual([...TIPOS_CREDITO]);
    }
  });

  it("nadie ve créditos de otra área", () => {
    expect(puedeVerTipo("ADMIN_MOTOS", "CREDITO_CELULAR")).toBe(false);
    expect(puedeVerTipo("ADMIN_MOTOS", "PRESTAMO_EFECTIVO")).toBe(false);
    expect(puedeVerTipo("ADMIN_CELULARES", "CREDITO_VEHICULAR")).toBe(false);
    expect(puedeVerTipo("ADMIN_CREDITOS", "CREDITO_CELULAR")).toBe(false);
    expect(puedeVerTipo("ADMIN_CREDITOS", "PRESTAMO_EFECTIVO")).toBe(true);
  });

  it("inventario y catálogo según el área", () => {
    expect(inventariosDe("ADMIN_MOTOS")).toEqual(["vehiculos"]);
    expect(inventariosDe("ADMIN_CELULARES")).toEqual(["celulares"]);
    expect(inventariosDe("ADMIN_CREDITOS")).toEqual([]);
    expect(categoriasDe("ADMIN_CELULARES")).toEqual(["CELULAR"]);
    expect(categoriasDe("ADMIN_MOTOS")).not.toContain("CELULAR");
    expect(categoriasDe("SUPERADMIN")).toHaveLength(4);
  });

  it("el asesor de ventas ya no se asigna a cuentas nuevas", () => {
    expect(ROLES_ASIGNABLES).not.toContain("ASESOR_VENTAS");
    for (const r of ROLES_ASIGNABLES) expect(ROLES).toContain(r);
  });
});
