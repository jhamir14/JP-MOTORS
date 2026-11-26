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

  it("la tasa diaria reproduce el ejemplo del negocio: S/ 8,800 en 400 días ⇒ S/ 33 diarios", () => {
    const motokar = { ...moto, precio: 9800 }; // S/ 1,000 de inicial ⇒ S/ 8,800 financiados
    const reglas = reglasCotizacion(motokar, tasasRespaldo);
    const r = cotizar(motokar, reglas, { frecuencia: "DIARIO", numeroCuotas: 400, inicial: 1000 })!;
    expect(r.financiado).toBe(8800);
    expect(r.cuota).toBe(33);
  });

  it("celulares: sin inicial obligatoria, tasas semanal y quincenal", () => {
    const r = reglasCotizacion(celular, tasasRespaldo);
    expect(r.inicialMin).toBe(0);
    expect(r.tasas.map((t) => t.frecuencia).sort()).toEqual(["QUINCENAL", "SEMANAL"]);
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
    const esperado = calcularCredito({ monto: moto.precio, cuotaInicial: sel.inicial, numeroCuotas: 400, frecuencia: "DIARIO", tipoCalculo: "FRANCES", tasaPorcentaje: 0.218 });
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
