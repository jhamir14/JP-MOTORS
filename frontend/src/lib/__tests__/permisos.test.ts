import { describe, expect, it } from "vitest";
import { ROLES_CREDITOS } from "../creditos";
import { ROLES_ANULAN_PAGOS } from "../pagos";
import { SECCIONES, TODOS, puedeVerSeccion, seccionDeRuta, seccionesDe } from "../permisos";
import { ROLES_REPORTES } from "../reportes";
import { ROLES } from "../roles";

describe("matriz de permisos del panel", () => {
  it("el superadmin ve todo; todos ven lo básico de cobranza", () => {
    expect(seccionesDe("SUPERADMIN")).toEqual(Object.keys(SECCIONES));
    for (const rol of ROLES) for (const s of ["inicio", "clientes", "creditos", "cobranzas", "pagos", "cuenta"] as const) expect(puedeVerSeccion(rol, s)).toBe(true);
  });

  it("el administrador de créditos (préstamos) no ve caja, tasas, reclamos, catálogo ni inventario", () => {
    for (const s of ["caja", "tasas", "reclamos", "catalogo", "inventario"] as const) expect(puedeVerSeccion("ADMIN_CREDITOS", s)).toBe(false);
    expect(puedeVerSeccion("ADMIN_CREDITOS", "solicitudes")).toBe(true);
  });

  it("los administradores de motos y celulares ven su catálogo e inventario, no la configuración general", () => {
    for (const rol of ["ADMIN_MOTOS", "ADMIN_CELULARES"] as const) {
      for (const s of ["catalogo", "inventario", "reportes", "solicitudes", "caja"] as const) expect(puedeVerSeccion(rol, s)).toBe(true);
      for (const s of ["tasas", "reclamos", "personal", "sistema"] as const) expect(puedeVerSeccion(rol, s)).toBe(false);
    }
  });

  it("el cobrador no ve ventas, configuración, reportes ni administración", () => {
    expect(seccionesDe("COBRADOR")).toEqual(["inicio", "clientes", "creditos", "cobranzas", "pagos", "caja", "cuenta"]);
  });

  it("el asesor no ve reportes financieros, personal ni sistema", () => {
    for (const s of ["reportes", "personal", "sistema"] as const) expect(puedeVerSeccion("ASESOR_VENTAS", s)).toBe(false);
    expect(puedeVerSeccion("ASESOR_VENTAS", "solicitudes")).toBe(true);
  });

  it("solo el superadmin gestiona personal y ve el estado del sistema", () => {
    for (const rol of ROLES) {
      expect(puedeVerSeccion(rol, "personal")).toBe(rol === "SUPERADMIN");
      expect(puedeVerSeccion(rol, "sistema")).toBe(rol === "SUPERADMIN");
    }
  });

  it("la sección de reportes coincide con el rol de exportación y las acciones de admin están dentro de lo visible", () => {
    expect([...SECCIONES.reportes.roles].sort()).toEqual([...ROLES_REPORTES].sort());
    for (const r of [...ROLES_CREDITOS, ...ROLES_ANULAN_PAGOS]) expect(puedeVerSeccion(r, "creditos")).toBe(true);
    expect(TODOS).toEqual(ROLES);
  });

  it("seccionDeRuta elige la sección más específica", () => {
    expect(seccionDeRuta("/admin")).toBe("inicio");
    expect(seccionDeRuta("/admin/reportes")).toBe("reportes");
    expect(seccionDeRuta("/admin/creditos/abc/pagar")).toBe("creditos");
    expect(seccionDeRuta("/admin/cajas")).toBeNull();
    expect(seccionDeRuta("/otra")).toBeNull();
  });

  it("los href son únicos y empiezan en /admin", () => {
    const hrefs = Object.values(SECCIONES).map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of hrefs) expect(h.startsWith("/admin")).toBe(true);
  });
});
