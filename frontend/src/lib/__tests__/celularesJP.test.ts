import { describe, expect, it } from "vitest";
import { CELULARES_JP } from "@/data/celularesJP";
import { CUOTA_MAXIMA_SEMANAL, cotizarCelularJP, gamaCelular, plazosCelular } from "@/lib/celularesJP";
import { CELULARES_JP as LISTA } from "@/data/celularesJP";
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
    // Arranca en el plazo sugerido de su gama (20 semanas) y ofrece de 12 a 28, de 4 en 4.
    expect(reglas.tasas[0].plazos).toEqual([12, 16, 20, 24, 28]);
    expect(sel).toEqual({ frecuencia: "SEMANAL", numeroCuotas: 20, inicial: 200 });
    expect(cotizar(producto, reglas, sel)?.cuota).toBe(98);
    expect(cotizar(producto, reglas, { ...sel, numeroCuotas: 16 })?.cuota).toBe(116);
    expect(cotizar(producto, reglas, { ...sel, inicial: 100 })).toBeNull();
  });

  it("plazos desde 12 semanas, de 4 en 4, con cuota de S/ 200 o menos en todo el catálogo", () => {
    for (const c of LISTA) {
      const { plazos, sugerido } = plazosCelular(c.precio, c.inicial);
      expect(plazos[0] >= 12 && plazos.every((s) => s % 4 === 0)).toBe(true);
      expect(plazos).toContain(sugerido);
      for (const s of plazos) expect(cotizarCelularJP(c.precio, c.inicial, s).cuota).toBeLessThanOrEqual(CUOTA_MAXIMA_SEMANAL);
    }
    expect(plazosCelular(2000, 200).sugerido).toBe(20);
    expect(plazosCelular(4200, 500).sugerido).toBe(28);
    expect(plazosCelular(6400, 500)).toEqual({ plazos: [48], sugerido: 48 });
    expect(plazosCelular(4950, 300).plazos).toEqual([36, 40, 44, 48]);
  });
});
