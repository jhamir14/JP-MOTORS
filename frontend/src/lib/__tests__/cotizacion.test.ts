import { describe, expect, it } from "vitest";
import { catalogoRespaldo, tasasRespaldo } from "@/data/catalogoRespaldo";
import { cotizacionSchema, cotizar, mensajeWhatsAppCotizacion, plazosSugeridos, reglasCotizacion, seleccionInicial } from "@/lib/cotizacion";
import { calcularCredito } from "@/lib/finance";

const moto = catalogoRespaldo.find((p) => p.slug === "honda-cb190r")!;
const celular = catalogoRespaldo.find((p) => p.slug === "apple-iphone-16")!;

describe("reglasCotizacion", () => {
  it("vehículos: inicial entre 10 % y 70 %, solo tasa vehicular mensual", () => {
    const r = reglasCotizacion(moto, tasasRespaldo);
    expect(r.tasas.map((t) => t.frecuencia)).toEqual(["MENSUAL"]);
    expect(r.inicialMin).toBe(1200); // 10 % de 11,966 redondeado hacia arriba a S/ 100
    expect(r.inicialMax).toBe(8300);
  });

  it("celulares: sin inicial obligatoria, tasas semanal y quincenal", () => {
    const r = reglasCotizacion(celular, tasasRespaldo);
    expect(r.inicialMin).toBe(0);
    expect(r.tasas.map((t) => t.frecuencia).sort()).toEqual(["QUINCENAL", "SEMANAL"]);
  });

  it("los plazos sugeridos respetan el rango de la tasa", () => {
    const t = reglasCotizacion(moto, tasasRespaldo).tasas[0];
    expect(plazosSugeridos(t)).toEqual([6, 12, 18, 24, 36]);
  });
});

describe("cotizar", () => {
  it("parte del plan publicado más conveniente y coincide con calcularCredito", () => {
    const reglas = reglasCotizacion(moto, tasasRespaldo);
    const sel = seleccionInicial(moto, reglas)!;
    expect(sel).toMatchObject({ frecuencia: "MENSUAL", numeroCuotas: 24 });
    const r = cotizar(moto, reglas, sel)!;
    const esperado = calcularCredito({ monto: moto.precio, cuotaInicial: sel.inicial, numeroCuotas: 24, frecuencia: "MENSUAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2 });
    expect(r.cuota).toBeGreaterThanOrEqual(esperado.cuota);
    expect(r.cuota - esperado.cuota).toBeLessThan(0.1);
    expect(r.financiado).toBeCloseTo(moto.precio - sel.inicial);
  });

  it("rechaza inicial o plazo fuera de rango (el servidor no confía en el navegador)", () => {
    const reglas = reglasCotizacion(moto, tasasRespaldo);
    expect(cotizar(moto, reglas, { frecuencia: "MENSUAL", numeroCuotas: 24, inicial: 0 })).toBeNull();
    expect(cotizar(moto, reglas, { frecuencia: "MENSUAL", numeroCuotas: 99, inicial: 3000 })).toBeNull();
    expect(cotizar(moto, reglas, { frecuencia: "SEMANAL", numeroCuotas: 16, inicial: 3000 })).toBeNull();
  });

  it("arma el mensaje de WhatsApp con producto, inicial, plazo y cuota", () => {
    const reglas = reglasCotizacion(celular, tasasRespaldo);
    const r = cotizar(celular, reglas, { frecuencia: "SEMANAL", numeroCuotas: 16, inicial: 0 })!;
    const m = mensajeWhatsAppCotizacion(celular.nombre, r, "Ana");
    expect(m).toContain("soy Ana");
    expect(m).toContain("iPhone 16");
    expect(m).toContain("sin inicial");
    expect(m).toContain("16 semanas");
  });
});

describe("cotizacionSchema", () => {
  const base = { productoSlug: "honda-cb190r", inicial: 2400, numeroCuotas: 24, frecuencia: "MENSUAL", nombre: "Juan Pérez", celular: "+51 912 345 678", correo: "", aceptaDatos: true };

  it("acepta datos mínimos y normaliza el celular", () => {
    const r = cotizacionSchema.parse(base);
    expect(r.celular).toBe("912345678");
    expect(r.correo).toBe("");
  });

  it("valida celular, correo opcional y consentimiento", () => {
    const r = cotizacionSchema.safeParse({ ...base, celular: "12345", correo: "no-es-correo", aceptaDatos: false });
    expect(r.success).toBe(false);
    const campos = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["celular", "correo", "aceptaDatos"]));
  });

  it("normaliza el correo", () => {
    expect(cotizacionSchema.parse({ ...base, correo: "  Ana@Correo.PE " }).correo).toBe("ana@correo.pe");
  });
});
