import { describe, expect, it } from "vitest";
import { diasEntre, enlaceRecordatorio, fechaLarga, mensajeRecordatorio, tipoRecordatorio, type DatosRecordatorio } from "@/lib/recordatorios";

const base: DatosRecordatorio = {
  nombres: "JUAN CARLOS",
  codigo: "JP-CV-2026-000123",
  producto: "Honda CB190R",
  numeroCuotas: 12,
  hoy: "2026-11-25",
  pendientes: [],
};

describe("recordatorios de pago", () => {
  it("clasifica la situación del crédito", () => {
    expect(tipoRecordatorio({ ...base, pendientes: [{ numero: 3, fecha: "2026-11-20", saldo: 300 }] })).toBe("MORA");
    expect(tipoRecordatorio({ ...base, pendientes: [{ numero: 3, fecha: "2026-11-25", saldo: 300 }] })).toBe("VENCE_HOY");
    expect(tipoRecordatorio({ ...base, pendientes: [{ numero: 3, fecha: "2026-11-30", saldo: 300 }] })).toBe("POR_VENCER");
    expect(tipoRecordatorio({ ...base, pendientes: [{ numero: 3, fecha: "2026-11-20", saldo: 0 }] })).toBe("AL_DIA");
  });

  it("vence hoy: cuota, total de cuotas, producto y monto", () => {
    const m = mensajeRecordatorio({ ...base, pendientes: [{ numero: 4, fecha: "2026-11-25", saldo: 350.5 }] });
    expect(m).toContain("Hola Juan,");
    expect(m).toContain("hoy vence tu cuota N.° 4 de 12 de tu crédito JP-CV-2026-000123 (Honda CB190R)");
    expect(m).toContain("S/ 350.50");
    expect(m).toContain("Yape");
  });

  it("por vencer: fecha en palabras", () => {
    const m = mensajeRecordatorio({ ...base, pendientes: [{ numero: 5, fecha: "2026-11-28", saldo: 300 }] });
    expect(m).toContain("vence el sábado, 28 de noviembre");
  });

  it("en mora: suma las cuotas vencidas, días de atraso y menciona la que vence hoy", () => {
    const m = mensajeRecordatorio({
      ...base,
      pendientes: [
        { numero: 2, fecha: "2026-11-11", saldo: 100 },
        { numero: 3, fecha: "2026-11-18", saldo: 300 },
        { numero: 4, fecha: "2026-11-25", saldo: 300 },
      ],
    });
    expect(m).toContain("Tienes 2 cuotas vencidas");
    expect(m).toContain("N.° 2, 3");
    expect(m).toContain("S/ 400.00");
    expect(m).toContain("hace 14 días");
    expect(m).toContain("hoy vence tu cuota N.° 4");
  });

  it("una sola cuota vencida", () => {
    const m = mensajeRecordatorio({ ...base, producto: null, pendientes: [{ numero: 2, fecha: "2026-11-24", saldo: 80 }] });
    expect(m).toContain("Tu cuota N.° 2 de tu crédito JP-CV-2026-000123 venció");
    expect(m).toContain("hace 1 día)");
  });

  it("arma el enlace de WhatsApp solo con celulares válidos", () => {
    expect(enlaceRecordatorio("987 654 321", "Hola ñandú")).toBe("https://wa.me/51987654321?text=Hola%20%C3%B1and%C3%BA");
    expect(enlaceRecordatorio("+51987654321", "x")).toBe("https://wa.me/51987654321?text=x");
    expect(enlaceRecordatorio("014567890", "x")).toBeNull();
    expect(enlaceRecordatorio(null, "x")).toBeNull();
  });

  it("utilidades de fechas", () => {
    expect(diasEntre("2026-11-20", "2026-11-25")).toBe(5);
    expect(fechaLarga("2026-12-25")).toMatch(/25 de diciembre/);
  });
});
