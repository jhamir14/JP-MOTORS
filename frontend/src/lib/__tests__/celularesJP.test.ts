import { describe, expect, it } from "vitest";
import { CELULARES_JP } from "@/data/celularesJP";
import { cotizarCelularJP, gamaCelular } from "@/lib/celularesJP";
import { cotizar, reglasCotizacion, seleccionInicial } from "@/lib/cotizacion";
import type { Producto } from "@/lib/catalogo";

describe("metodología JP de celulares", () => {
  it.each(CELULARES_JP)("$nombre: tasa de su gama y cuota de la lista oficial", (c) => {
    expect(gamaCelular(c.precio).tasaMensual).toBe(c.tasaMensual);
    const r = cotizarCelularJP(c.precio, c.inicial, c.semanas);
    expect(r.cuota).toBe(c.cuota);
    expect(r.totalPagado).toBe(c.totalPagado);
  });

  it("tramos de la tasa mensual", () => {
    expect(gamaCelular(999).tasaMensual).toBe(15);
    expect(gamaCelular(1000).tasaMensual).toBe(10);
    expect(gamaCelular(1500).tasaMensual).toBe(10);
    expect(gamaCelular(1501).tasaMensual).toBe(8);
    expect(gamaCelular(2000).tasaMensual).toBe(8);
    expect(gamaCelular(2001).tasaMensual).toBe(7.5);
    expect(gamaCelular(3000).tasaMensual).toBe(7.5);
    expect(gamaCelular(3001).tasaMensual).toBe(5);
  });

  it("el cotizador web usa la metodología JP para celulares", () => {
    const producto = {
      id: "x", slug: "samsung-galaxy-a56-5g", categoria: "CELULAR", marca: "Samsung", modelo: "Galaxy A56 5G", nombre: "Samsung Galaxy A56 5G",
      descripcion: null, precio: 1600, specs: {}, etiquetas: [], destacado: false, imagenes: [],
      planes: [{ id: "p", nombre: "Plan JP · 16 semanas", cuotaInicial: 200, numeroCuotas: 16, frecuencia: "SEMANAL", tipoCalculo: "FLAT", tasaPorcentaje: 32, montoCuota: 116 }],
    } as unknown as Producto;
    const reglas = reglasCotizacion(producto, []);
    const sel = seleccionInicial(producto, reglas)!;
    expect(sel).toEqual({ frecuencia: "SEMANAL", numeroCuotas: 16, inicial: 200 });
    expect(cotizar(producto, reglas, sel)?.cuota).toBe(116);
    expect(cotizar(producto, reglas, { ...sel, inicial: 100 })).toBeNull();
  });
});
