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

  it("vence hoy: mensaje corto, sin código ni firma", () => {
    const m = mensajeRecordatorio({ ...base, nombres: "ANTONIO", pendientes: [{ numero: 3, fecha: "2026-11-25", saldo: 300 }] });
    expect(m).toBe(
      "Hola Antonio, te recordamos que hoy vence tu cuota número 3 de S/ 300.00. Puedes pagarla por Yape, Plin, transferencia o en efectivo. Si ya pagaste, envíanos tu comprobante. ¡Gracias!",
    );
    expect(m).not.toContain("JP-CV");
    expect(m).not.toContain("te saluda");
  });

  it("por vencer: fecha en palabras", () => {
    const m = mensajeRecordatorio({ ...base, pendientes: [{ numero: 5, fecha: "2026-11-28", saldo: 300 }] });
    expect(m).toContain("el sábado, 28 de noviembre vence tu cuota número 5 de S/ 300.00");
  });

  it("en mora: suma las cuotas vencidas y menciona la que vence hoy", () => {
    const m = mensajeRecordatorio({
      ...base,
      pendientes: [
        { numero: 2, fecha: "2026-11-11", saldo: 100 },
        { numero: 3, fecha: "2026-11-18", saldo: 300 },
        { numero: 4, fecha: "2026-11-25", saldo: 300 },
      ],
    });
    expect(m).toContain("tienes 2 cuotas vencidas (número 2 y 3) por un total de S/ 400.00");
    expect(m).toContain("hoy vence tu cuota número 4");
    expect(m).toContain("pagarlas");
  });

  it("una sola cuota vencida", () => {
    const m = mensajeRecordatorio({ ...base, producto: null, pendientes: [{ numero: 2, fecha: "2026-11-24", saldo: 80 }] });
    expect(m).toContain("tu cuota número 2 de S/ 80.00 venció el martes, 24 de noviembre");
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

describe("WhatsApp normal (no Business)", () => {
  const wa = "https://wa.me/51987654321?text=Hola%20%C3%B1and%C3%BA";
  it("Android: intent al paquete com.whatsapp con wa.me de respaldo", async () => {
    const { enlaceWhatsAppNormal } = await import("../whatsapp");
    const u = enlaceWhatsAppNormal(wa, "android");
    expect(u.startsWith("intent://send/?phone=51987654321&text=Hola%20%C3%B1and%C3%BA#Intent;scheme=whatsapp;package=com.whatsapp;")).toBe(true);
    expect(u).toContain(`S.browser_fallback_url=${encodeURIComponent(wa)};end`);
  });
  it("iPhone: esquema whatsapp://; computadora: wa.me sin cambios", async () => {
    const { enlaceWhatsAppNormal, plataformaDe } = await import("../whatsapp");
    expect(enlaceWhatsAppNormal(wa, "ios")).toBe("whatsapp://send?phone=51987654321&text=Hola%20%C3%B1and%C3%BA");
    expect(enlaceWhatsAppNormal(wa, "escritorio")).toBe(wa);
    expect(plataformaDe("Mozilla/5.0 (Linux; Android 14; SM-A546E)")).toBe("android");
    expect(plataformaDe("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("ios");
  });
});
