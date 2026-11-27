import { describe, expect, it } from "vitest";
import { whatsappDeArea, whatsappDeServicio, whatsappLink } from "../whatsapp";

describe("WhatsApp por área", () => {
  it("las cotizaciones de celulares van al asesor de celulares y las de motos al de motos", () => {
    expect(whatsappDeArea({ categoria: "CELULAR" })).toBe("51920694641");
    for (const categoria of ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"]) expect(whatsappDeArea({ categoria })).toBe("51902423015");
  });

  it("según el servicio de la solicitud; los préstamos usan el número general", () => {
    expect(whatsappDeServicio("CREDITO_CELULAR")).toBe("51920694641");
    expect(whatsappDeServicio("CREDITO_VEHICULAR")).toBe("51902423015");
    expect(whatsappDeServicio("PRESTAMO_EFECTIVO")).toBe("51902423015");
  });

  it("el enlace lleva el número del área", () => {
    expect(whatsappLink("Hola", whatsappDeArea({ categoria: "CELULAR" }))).toBe("https://wa.me/51920694641?text=Hola");
  });
});
