import { describe, expect, it } from "vitest";
import {
  calcularMora,
  deudaTotal,
  diferenciaCaja,
  distribuirPago,
  errorMotivoAnulacionPago,
  resumenCaja,
  resumenDeuda,
  saldoCuota,
  tramoMora,
  validarPago,
  type CuotaCobro,
} from "../pagos";

const cuota = (numero: number, fecha: string, o: Partial<CuotaCobro> = {}): CuotaCobro => ({
  id: `c${numero}`,
  numero,
  fechaVencimiento: fecha,
  interes: 20,
  capital: 80,
  mora: 0,
  moraPagada: 0,
  interesPagado: 0,
  capitalPagado: 0,
  ...o,
});

const cronograma = () => [cuota(1, "2026-11-02"), cuota(2, "2026-11-09"), cuota(3, "2026-11-16")];

describe("distribuirPago", () => {
  it("paga una cuota exacta: interés y luego capital", () => {
    const d = distribuirPago(cronograma(), 100);
    expect(d.aplicaciones).toEqual([{ cuotaId: "c1", numero: 1, mora: 0, interes: 20, capital: 80, total: 100, cancela: true }]);
    expect(d.sobrante).toBe(0);
    expect(d.cuotasCanceladas).toEqual([1]);
  });

  it("pago parcial: cubre primero la mora, luego el interés y deja capital pendiente", () => {
    const cuotas = [cuota(1, "2026-11-02", { mora: 15 }), cuota(2, "2026-11-09")];
    const d = distribuirPago(cuotas, 50);
    expect(d.aplicaciones).toEqual([{ cuotaId: "c1", numero: 1, mora: 15, interes: 20, capital: 15, total: 50, cancela: false }]);
    expect(d.cuotasCanceladas).toEqual([]);
  });

  it("pago menor que la mora: todo va a mora", () => {
    const d = distribuirPago([cuota(1, "2026-11-02", { mora: 15 })], 10);
    expect(d.aplicaciones[0]).toMatchObject({ mora: 10, interes: 0, capital: 0, total: 10 });
  });

  it("pago adelantado: lo que sobra pasa a las cuotas siguientes en orden", () => {
    const d = distribuirPago(cronograma(), 250);
    expect(d.aplicaciones.map((a) => [a.numero, a.interes, a.capital, a.cancela])).toEqual([
      [1, 20, 80, true],
      [2, 20, 80, true],
      [3, 20, 30, false],
    ]);
    expect(d.sobrante).toBe(0);
  });

  it("respeta lo ya pagado de una cuota parcial", () => {
    const cuotas = [cuota(1, "2026-11-02", { mora: 5, moraPagada: 5, interesPagado: 20, capitalPagado: 30 }), cuota(2, "2026-11-09")];
    const d = distribuirPago(cuotas, 70);
    expect(d.aplicaciones).toEqual([
      { cuotaId: "c1", numero: 1, mora: 0, interes: 0, capital: 50, total: 50, cancela: true },
      { cuotaId: "c2", numero: 2, mora: 0, interes: 20, capital: 0, total: 20, cancela: false },
    ]);
  });

  it("salta cuotas ya pagadas (incluidas las migradas marcadas como pagadas)", () => {
    const cuotas = [
      cuota(1, "2026-11-02", { interesPagado: 20, capitalPagado: 80 }),
      cuota(2, "2026-11-09", { pagada: true, capitalPagado: 50 }),
      cuota(3, "2026-11-16"),
    ];
    expect(distribuirPago(cuotas, 30).aplicaciones.map((a) => a.numero)).toEqual([3]);
  });

  it("ordena por fecha de vencimiento aunque las cuotas lleguen desordenadas", () => {
    const d = distribuirPago([cuota(3, "2026-11-16"), cuota(1, "2026-11-02"), cuota(2, "2026-11-09")], 150);
    expect(d.aplicaciones.map((a) => a.numero)).toEqual([1, 2]);
  });

  it("sobrepago: devuelve el sobrante (la validación lo rechaza)", () => {
    const d = distribuirPago(cronograma(), 350);
    expect(d.sobrante).toBe(50);
    expect(d.aplicaciones.reduce((s, a) => s + a.total, 0)).toBe(300);
  });

  it("redondeo: céntimos exactos sin errores de coma flotante", () => {
    const cuotas = [cuota(1, "2026-11-02", { interes: 10.1, capital: 20.2, mora: 0.3 }), cuota(2, "2026-11-03", { interes: 0.1, capital: 0.2 })];
    const d = distribuirPago(cuotas, 30.9);
    expect(d.aplicaciones).toEqual([
      { cuotaId: "c1", numero: 1, mora: 0.3, interes: 10.1, capital: 20.2, total: 30.6, cancela: true },
      { cuotaId: "c2", numero: 2, mora: 0, interes: 0.1, capital: 0.2, total: 0.3, cancela: true },
    ]);
    for (const a of d.aplicaciones) expect(Math.round(a.total * 100)).toBe(Math.round((a.mora + a.interes + a.capital) * 100));
  });

  it("la suma de lo aplicado siempre es igual al monto (montos al azar)", () => {
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const cuotas = Array.from({ length: 1 + Math.floor(azar() * 8) }, (_, k) =>
        cuota(k + 1, `2026-11-${String(k + 1).padStart(2, "0")}`, {
          interes: Math.round(azar() * 5000) / 100,
          capital: Math.round(azar() * 20000) / 100,
          mora: Math.round(azar() * 1000) / 100,
        }),
      );
      const deuda = deudaTotal(cuotas);
      const monto = Math.round(azar() * deuda * 100) / 100;
      const d = distribuirPago(cuotas, monto);
      const aplicado = d.aplicaciones.reduce((s, a) => s + Math.round(a.total * 100), 0);
      expect(aplicado).toBe(Math.round(monto * 100));
      expect(d.sobrante).toBe(0);
      for (const a of d.aplicaciones) {
        const c = cuotas.find((x) => x.id === a.cuotaId)!;
        expect(a.mora).toBeLessThanOrEqual(c.mora);
        expect(a.interes).toBeLessThanOrEqual(c.interes);
        expect(a.capital).toBeLessThanOrEqual(c.capital);
        // Nunca se toca el capital mientras quede mora o interés de la misma cuota.
        if (a.capital > 0) expect(Math.round((a.mora - c.mora) * 100) === 0 && Math.round((a.interes - c.interes) * 100) === 0).toBe(true);
      }
    }
  });
});

describe("resumenDeuda", () => {
  it("separa vencido, cuota de hoy y próxima", () => {
    const cuotas = [
      cuota(1, "2026-11-20", { mora: 4 }),
      cuota(2, "2026-11-22", { interesPagado: 20 }),
      cuota(3, "2026-11-25"),
      cuota(4, "2026-11-30"),
    ];
    const r = resumenDeuda(cuotas, "2026-11-25");
    expect(r).toEqual({
      vencido: 184,
      cuotasVencidas: 2,
      mora: 4,
      hoy: 100,
      exigible: 284,
      total: 384,
      proxima: { numero: 4, fecha: "2026-11-30", saldo: 100 },
      diasAtraso: 5,
    });
  });

  it("crédito al día", () => {
    const r = resumenDeuda(cronograma(), "2026-11-01");
    expect(r.vencido).toBe(0);
    expect(r.diasAtraso).toBe(0);
    expect(r.proxima?.numero).toBe(1);
    expect(saldoCuota(cronograma()[0])).toBe(100);
  });
});

describe("calcularMora", () => {
  it("cobra solo los días que pasan la gracia", () => {
    expect(calcularMora({ penalidadDiaria: 5, vencimiento: "2026-11-10", hoy: "2026-11-13", diasGracia: 3 })).toBe(0);
    expect(calcularMora({ penalidadDiaria: 5, vencimiento: "2026-11-10", hoy: "2026-11-14", diasGracia: 3 })).toBe(5);
    expect(calcularMora({ penalidadDiaria: 2.5, vencimiento: "2026-11-10", hoy: "2026-11-20", diasGracia: 0 })).toBe(25);
  });
  it("no hay mora antes del vencimiento y aplica el tope", () => {
    expect(calcularMora({ penalidadDiaria: 5, vencimiento: "2026-11-10", hoy: "2026-11-01", diasGracia: 0 })).toBe(0);
    expect(calcularMora({ penalidadDiaria: 5, vencimiento: "2026-10-01", hoy: "2026-11-30", diasGracia: 3, montoCuota: 100, topePorcentaje: 50 })).toBe(50);
  });
});

describe("validarPago", () => {
  it("acepta un pago válido", () => {
    expect(validarPago({ monto: 100, metodo: "EFECTIVO" }, 300)).toEqual({});
    expect(validarPago({ monto: 300, metodo: "YAPE", numeroOperacion: "123456" }, 300)).toEqual({});
  });
  it("rechaza sobrepago, montos inválidos y falta de n.º de operación", () => {
    expect(validarPago({ monto: 300.01, metodo: "EFECTIVO" }, 300).monto).toMatch(/supera/);
    expect(validarPago({ monto: 0, metodo: "EFECTIVO" }, 300).monto).toBeTruthy();
    expect(validarPago({ monto: 10.555, metodo: "EFECTIVO" }, 300).monto).toMatch(/decimales/);
    expect(validarPago({ monto: 10, metodo: "PLIN", numeroOperacion: " " }, 300).numeroOperacion).toBeTruthy();
    expect(validarPago({ monto: 10, metodo: "EFECTIVO" }, 0).monto).toMatch(/no tiene deuda/);
  });
});

describe("caja y utilidades", () => {
  it("resumen de caja sin pagos anulados", () => {
    const r = resumenCaja([
      { monto: 10.1, metodo: "EFECTIVO" },
      { monto: 20.2, metodo: "EFECTIVO" },
      { monto: 50, metodo: "YAPE" },
      { monto: 99, metodo: "EFECTIVO", anulado: true },
    ]);
    expect(r).toEqual({ efectivo: 30.3, digital: 50, total: 80.3, cantidad: 3, porMetodo: { EFECTIVO: 30.3, YAPE: 50 } });
    expect(diferenciaCaja(30, 30.3)).toBe(-0.3);
  });
  it("tramos de mora", () => {
    expect([1, 7, 8, 15, 16, 30, 31].map(tramoMora)).toEqual(["1-7", "1-7", "8-15", "8-15", "16-30", "16-30", "30+"]);
  });
  it("motivo de anulación", () => {
    expect(errorMotivoAnulacionPago("corto")).toBeTruthy();
    expect(errorMotivoAnulacionPago("Pago registrado dos veces")).toBeNull();
  });
});
