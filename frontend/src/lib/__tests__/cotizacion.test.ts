import { describe, expect, it } from "vitest";
import { catalogoRespaldo, tasasRespaldo } from "@/data/catalogoRespaldo";
import { cotizacionSchema, cotizar, mensajeWhatsAppCotizacion, plazosSugeridos, reglasCotizacion, seleccionInicial } from "@/lib/cotizacion";
import { calcularCredito } from "@/lib/finance";

const moto = catalogoRespaldo.find((p) => p.slug === "honda-cb190r")!;
const celular = catalogoRespaldo.find((p) => p.slug === "apple-iphone-16")!;

describe("reglasCotizacion", () => {
  it("vehículos: inicial desde S/ 1,000 hasta 70 %, solo tasa vehicular diaria", () => {
    const r = reglasCotizacion(moto, tasasRespaldo);
    expect(r.tasas.map((t) => t.frecuencia)).toEqual(["DIARIO"]);
    expect(r.inicialMin).toBe(1000);
    expect(r.inicialMax).toBe(8300);
  });

  it("reproduce el trato de tienda: Motokar GL150 de S/ 8,800, S/ 1,000 de inicial + 400 días de S/ 33", () => {
    const motokar = catalogoRespaldo.find((p) => p.slug === "honda-motokar-gl150")!;
    expect(motokar.precio).toBe(8800);
    const reglas = reglasCotizacion(motokar, tasasRespaldo);
    const sel = seleccionInicial(motokar, reglas)!;
    expect(sel).toMatchObject({ frecuencia: "DIARIO", numeroCuotas: 400, inicial: 1000 });
    const r = cotizar(motokar, reglas, sel)!;
    expect(r.financiado).toBe(7800);
    expect(r.cuota).toBe(33);
  });

  it("celulares: metodología JP (semanal, inicial del plan, plazos de 12 en adelante con cuota de S/ 200 o menos)", () => {
    const r = reglasCotizacion(celular, tasasRespaldo);
    expect(r.inicialMin).toBe(300);
    expect(r.tasas).toHaveLength(1);
    expect(r.tasas[0]).toMatchObject({ frecuencia: "SEMANAL", tasaPorcentaje: 7.5, metodoJP: true, plazos: [20, 24, 28, 32, 36], plazoSugerido: 24 });
  });

  it("los plazos sugeridos respetan el rango de la tasa", () => {
    const t = reglasCotizacion(moto, tasasRespaldo).tasas[0];
    expect(plazosSugeridos(t)).toEqual([120, 180, 200, 300, 400]);
  });
});

describe("cotizar", () => {
  it("parte del plan publicado más conveniente y coincide con calcularCredito", () => {
    const reglas = reglasCotizacion(moto, tasasRespaldo);
    const sel = seleccionInicial(moto, reglas)!;
    expect(sel).toMatchObject({ frecuencia: "DIARIO", numeroCuotas: 400, inicial: 1000 });
    const r = cotizar(moto, reglas, sel)!;
    const esperado = calcularCredito({ monto: moto.precio, cuotaInicial: sel.inicial, numeroCuotas: 400, frecuencia: "DIARIO", tipoCalculo: "FRANCES", tasaPorcentaje: 0.29 });
    expect(r.cuota).toBeGreaterThanOrEqual(esperado.cuota);
    expect(r.cuota - esperado.cuota).toBeLessThan(0.1);
    expect(r.financiado).toBeCloseTo(moto.precio - sel.inicial);
  });

  it("rechaza inicial o plazo fuera de rango (el servidor no confía en el navegador)", () => {
    const reglas = reglasCotizacion(moto, tasasRespaldo);
    expect(cotizar(moto, reglas, { frecuencia: "DIARIO", numeroCuotas: 400, inicial: 900 })).toBeNull();
    expect(cotizar(moto, reglas, { frecuencia: "DIARIO", numeroCuotas: 401, inicial: 3000 })).toBeNull();
    expect(cotizar(moto, reglas, { frecuencia: "MENSUAL", numeroCuotas: 24, inicial: 3000 })).toBeNull();
    expect(cotizar(moto, reglas, { frecuencia: "SEMANAL", numeroCuotas: 16, inicial: 3000 })).toBeNull();
  });

  it("arma el mensaje de WhatsApp con producto, inicial, plazo y cuota", () => {
    const reglas = reglasCotizacion(celular, tasasRespaldo);
    const r = cotizar(celular, reglas, { frecuencia: "SEMANAL", numeroCuotas: 32, inicial: 300 })!;
    expect(r.cuota).toBe(135);
    const m = mensajeWhatsAppCotizacion(celular.nombre, r, "Ana");
    expect(m).toContain("soy Ana");
    expect(m).toContain("iPhone 16");
    expect(m).toMatch(/Inicial: S\/\s300/);
    expect(m).toContain("32 semanas");
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
