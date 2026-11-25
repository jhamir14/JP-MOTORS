import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  contratoCelular,
  contratoDe,
  contratoVehicular,
  cronograma,
  enmascararDocumento,
  fechaEnLetras,
  mensajeRecibo,
  montoEnLetras,
  numeroEnLetras,
  pagare,
  recibo,
  type Bloque,
  type DatosCredito,
  type DatosEmpresa,
  type DatosRecibo,
  type Documento,
} from "../documentos";
import { renderizarPdf, sanear } from "../pdf/render";

const empresa: DatosEmpresa = {
  nombre: "Inversiones JP",
  razonSocial: "Inversiones Multimarca JP",
  ruc: "10479269217",
  representante: "Juan Pérez Quispe",
  representanteDocumento: "DNI N.° 47926921",
  domicilio: "Av. Los Ruiseñores 123, Santa Anita, Lima",
  ciudad: "Lima",
  telefono: "902 423 015",
  validados: false,
};

const cuotas = Array.from({ length: 12 }, (_, i) => ({
  numero: i + 1,
  fecha: `2027-${String(i + 1).padStart(2, "0")}-15`,
  cuota: i === 11 ? 552.37 : 552.38,
  capital: 500,
  interes: i === 11 ? 52.37 : 52.38,
  saldoCapital: 6000 - 500 * (i + 1),
  pagado: i < 2 ? 552.38 : 0,
  estado: i < 2 ? "PAGADA" : "PENDIENTE",
}));

const vehicular: DatosCredito = {
  codigo: "JP-2026-000123",
  tipo: "CREDITO_VEHICULAR",
  estado: "VIGENTE",
  cliente: {
    nombres: "María Elena",
    apellidos: "Huamán Torres",
    tipoDocumento: "DNI",
    numeroDocumento: "41234567",
    direccion: "Jr. Las Flores 456",
    distrito: "Ate",
    provincia: "Lima",
    departamento: "Lima",
    telefono: "987654321",
    estadoCivil: "CASADO",
  },
  garante: { nombres: "Pedro", apellidos: "Huamán Ríos", tipoDocumento: "DNI", numeroDocumento: "09876543", direccion: "Av. Central 1", distrito: "Ate" },
  vehiculo: {
    tipoVehiculo: "TRIMOVIL_PASAJEROS",
    marca: "Bajaj",
    modelo: "RE 4S",
    anio: 2026,
    color: "Verde",
    cilindradaCc: 200,
    condicion: "NUEVO",
    numeroMotor: "AAMBUK12345",
    numeroChasis: "MD2A27AZ5RWA12345",
    placa: null,
    proveedorGps: "TrackPe",
    imeiGps: "356938035643809",
  },
  celular: null,
  montoTotal: 7500,
  cuotaInicial: 1500,
  montoFinanciado: 6000,
  tasaPorcentaje: 10.476,
  tipoCalculo: "FLAT",
  totalIntereses: 628.55,
  montoTotalPagar: 6628.55,
  frecuencia: "MENSUAL",
  numeroCuotas: 12,
  valorCuota: 552.38,
  penalidadDiaria: 5,
  teaPorcentaje: 20.15,
  fechaDesembolso: "2026-12-15",
  fechaPrimerVencimiento: "2027-01-15",
  diasGracia: 3,
  moraTopePorcentaje: null,
  cuotas,
};

const celular: DatosCredito = {
  ...vehicular,
  codigo: "JP-2026-000124",
  tipo: "CREDITO_CELULAR",
  garante: null,
  vehiculo: null,
  celular: {
    marca: "Xiaomi",
    modelo: "Redmi Note 13",
    almacenamiento: "256 GB",
    memoriaRam: "8 GB",
    color: "Negro",
    condicion: "NUEVO",
    imei1: "490154203237518",
    imei2: "490154203237526",
    numeroSerie: "SN12345",
    plataformaBloqueo: "PAYJOY",
  },
  montoTotal: 1200,
  cuotaInicial: 0,
  montoFinanciado: 1200,
  frecuencia: "SEMANAL",
  numeroCuotas: 26,
};

/** Todo el texto que se imprimirá en el documento (sin marcas de negrita). */
function texto(doc: Documento): string {
  const t = (b: Bloque): string[] => {
    switch (b.t) {
      case "titulo": case "subtitulo": case "aviso": return [b.texto];
      case "parrafo": return [b.texto];
      case "clausula": return [b.titulo, b.texto];
      case "datos": return b.filas.flat();
      case "tabla": return [...b.columnas.map((c) => c.titulo), ...b.filas.flat(), ...(b.total ?? [])];
      case "firmas": return b.firmas.flatMap((f) => [f.rol, f.nombre, f.documento]);
      case "destacado": return [b.etiqueta, b.valor, b.detalle ?? ""];
      default: return [];
    }
  };
  return doc.bloques.flatMap(t).join("\n").replace(/\*\*/g, "");
}

describe("montos y fechas en letras", () => {
  it.each([
    [0, "CERO"],
    [1, "UNO"],
    [15, "QUINCE"],
    [21, "VEINTIUNO"],
    [30, "TREINTA"],
    [45, "CUARENTA Y CINCO"],
    [100, "CIEN"],
    [101, "CIENTO UNO"],
    [500, "QUINIENTOS"],
    [999, "NOVECIENTOS NOVENTA Y NUEVE"],
    [1000, "MIL"],
    [1521, "MIL QUINIENTOS VEINTIUNO"],
    [21000, "VEINTIÚN MIL"],
    [31000, "TREINTA Y UN MIL"],
    [100000, "CIEN MIL"],
    [101000, "CIENTO UN MIL"],
    [1_000_000, "UN MILLÓN"],
    [2_500_300, "DOS MILLONES QUINIENTOS MIL TRESCIENTOS"],
  ])("%i → %s", (n, letras) => expect(numeroEnLetras(n)).toBe(letras));

  it("monto con céntimos, como en un pagaré", () => {
    expect(montoEnLetras(6628.55)).toBe("SEIS MIL SEISCIENTOS VEINTIOCHO CON 55/100 SOLES");
    expect(montoEnLetras(1500)).toBe("MIL QUINIENTOS CON 00/100 SOLES");
    expect(montoEnLetras(21)).toBe("VEINTIÚN CON 00/100 SOLES");
    expect(montoEnLetras(1)).toBe("UN CON 00/100 SOLES");
    expect(montoEnLetras(0.1 + 0.2)).toBe("CERO CON 30/100 SOLES");
  });

  it("fecha en letras sin desfase de zona horaria", () => {
    expect(fechaEnLetras("2026-01-01")).toBe("1 de enero de 2026");
    expect(fechaEnLetras("2026-12-31")).toBe("31 de diciembre de 2026");
  });

  it("enmascara el documento dejando 4 dígitos", () => {
    expect(enmascararDocumento("47926921")).toBe("••••6921");
    expect(enmascararDocumento("123")).toBe("•••");
  });
});

describe("contrato vehicular", () => {
  const doc = contratoVehicular(empresa, vehicular);
  const t = texto(doc);

  it("vuelca las partes, el bien y las condiciones congeladas", () => {
    for (const dato of [
      "INVERSIONES MULTIMARCA JP", "10479269217", "JUAN PÉREZ QUISPE", "DNI N.° 47926921", "Av. Los Ruiseñores 123",
      "MARÍA ELENA HUAMÁN TORRES", "DNI N.° 41234567", "Jr. Las Flores 456, Ate, Lima, Lima", "987654321",
      "Bajaj", "RE 4S", "2026", "AAMBUK12345", "MD2A27AZ5RWA12345", "placa en trámite", "356938035643809",
      "S/ 7,500.00", "S/ 1,500.00", "S/ 6,000.00", "S/ 552.38", "S/ 6,628.55", "20.15 %", "S/ 5.00", "12 cuotas mensuales",
      "SIETE MIL QUINIENTOS CON 00/100 SOLES", "15 de enero de 2027", "15 de diciembre de 2026",
    ]) expect(t).toContain(dato);
  });

  it("incluye la reserva de propiedad, el GPS, la fianza y el cronograma anexo", () => {
    expect(t).toMatch(/Reserva de propiedad/i);
    expect(t).toContain("1583");
    expect(t).toMatch(/corta-corriente/);
    expect(t).toContain("FIADOR SOLIDARIO");
    expect(t).toContain("PEDRO HUAMÁN RÍOS");
    expect(t).toContain("Anexo 1");
    const tabla = doc.bloques.find((b) => b.t === "tabla");
    expect(tabla && tabla.t === "tabla" && tabla.filas).toHaveLength(12);
    expect(tabla && tabla.t === "tabla" && tabla.total?.[4]).toBe("6,628.55");
  });

  it("los días de gracia y la penalidad salen en la cláusula de mora", () => {
    expect(t).toContain("a partir del día 4");
    expect(t).toContain("los primeros 3 días son de tolerancia");
  });

  it("numera las cláusulas en orden y la de incumplimiento remite a la de obligaciones", () => {
    const titulos = doc.bloques.filter((b) => b.t === "clausula").map((b) => (b as { titulo: string }).titulo);
    expect(titulos[0]).toBe("PRIMERA.— PARTES");
    expect(titulos[6]).toBe("SÉPTIMA.— OBLIGACIONES DE EL CLIENTE");
    expect(titulos.some((x) => x.includes("FIANZA SOLIDARIA"))).toBe(true);
  });

  it("firmas de la empresa, el cliente y el fiador (con huella)", () => {
    const firmas = doc.bloques.find((b) => b.t === "firmas");
    expect(firmas && firmas.t === "firmas" && firmas.firmas.map((f) => f.rol)).toEqual(["LA EMPRESA", "EL CLIENTE", "EL FIADOR SOLIDARIO"]);
    expect(firmas && firmas.t === "firmas" && firmas.firmas[1].huella).toBe(true);
  });

  it("muestra el aviso de modelo referencial solo mientras no esté validado", () => {
    expect(t).toMatch(/pendiente de validación legal/);
    expect(texto(contratoVehicular({ ...empresa, validados: true }, vehicular))).not.toMatch(/pendiente de validación legal/);
  });

  it("si falta el representante deja una línea para completarlo a mano", () => {
    const sinRep = texto(contratoVehicular({ ...empresa, representante: null, representanteDocumento: null, domicilio: null }, vehicular));
    expect(sinRep).toContain("________________________");
    expect(sinRep).not.toContain("JUAN PÉREZ");
  });

  it("sin garante no hay cláusula de fianza", () => {
    const t2 = texto(contratoVehicular(empresa, { ...vehicular, garante: null }));
    expect(t2).not.toContain("FIADOR SOLIDARIO");
    expect(t2).toContain("dos ejemplares");
  });

  it("exige un vehículo", () => {
    expect(() => contratoVehicular(empresa, { ...vehicular, vehiculo: null })).toThrow();
  });
});

describe("contrato de celular", () => {
  const t = texto(contratoCelular(empresa, celular));

  it("vuelca IMEI, serie y la plataforma de bloqueo con consentimiento expreso", () => {
    for (const dato of ["490154203237518", "490154203237526", "SN12345", "PayJoy", "acepta expresamente", "bloquear EL EQUIPO", "26 cuotas semanales"])
      expect(t).toContain(dato);
    expect(t).toMatch(/no accede a fotos, mensajes, contactos/);
    expect(t).toContain("no paga cuota inicial");
  });

  it("contratoDe elige la plantilla por tipo de crédito", () => {
    expect(contratoDe(empresa, celular).titulo).toMatch(/celular/i);
    expect(contratoDe(empresa, vehicular).titulo).toMatch(/reserva de propiedad/i);
    expect(contratoDe(empresa, { ...vehicular, tipo: "PRESTAMO_EFECTIVO", vehiculo: null }).titulo).toMatch(/mutuo/i);
  });
});

describe("pagaré", () => {
  const t = texto(pagare(empresa, vehicular));
  it("importe en números y letras, vencimiento de la última cuota, sin protesto y aval", () => {
    expect(t).toContain("S/ 6,628.55");
    expect(t).toContain("SEIS MIL SEISCIENTOS VEINTIOCHO CON 55/100 SOLES");
    expect(t).toContain("15/12/2027");
    expect(t).toMatch(/no requiere ser protestado/);
    expect(t).toContain("27287");
    expect(t).toContain("AVAL");
    expect(t).toContain("PEDRO HUAMÁN RÍOS");
  });
});

describe("cronograma", () => {
  it("incluye lo pagado, el saldo a la fecha y marca de agua si está anulado", () => {
    const doc = cronograma(empresa, vehicular, "2027-02-20");
    const t = texto(doc);
    expect(t).toContain("Saldo al 20/02/2027");
    expect(t).toContain(`S/ ${(6628.55 - 2 * 552.38).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    expect(t).toContain("Pagada");
    expect(doc.marcaAgua).toBeUndefined();
    expect(cronograma(empresa, { ...vehicular, estado: "ANULADO" }, "2027-02-20").marcaAgua).toBe("ANULADO");
  });
});

describe("recibo", () => {
  const r: DatosRecibo = {
    numeroRecibo: "42",
    fechaPago: "2027-01-16",
    registradoEl: new Date("2027-01-16T15:30:00Z"),
    registradoPor: "Carlos Cobrador",
    monto: 557.38,
    metodo: "Yape",
    numeroOperacion: "00123456",
    anulado: false,
    motivoAnulacion: null,
    codigoCredito: "JP-2026-000123",
    producto: "Bajaj RE 4S",
    cliente: vehicular.cliente,
    aplicaciones: [{ numero: 1, vence: "2027-01-15", mora: 5, interes: 52.38, capital: 500, total: 557.38 }],
    saldoCredito: 6076.17,
    cuotasPagadas: 1,
    numeroCuotas: 12,
  };

  it("número correlativo, monto en letras, aplicación y saldo", () => {
    const doc = recibo(empresa, r);
    const t = texto(doc);
    expect(doc.titulo).toBe("Recibo de pago N.° 000042");
    for (const dato of ["S/ 557.38", "QUINIENTOS CINCUENTA Y SIETE CON 38/100 SOLES", "16/01/2027 · 10:30", "Yape", "00123456", "DNI N.° 41234567", "1 de 12", "S/ 6,076.17", "Carlos Cobrador"])
      expect(t).toContain(dato);
    expect(doc.pie).toMatch(/no es un comprobante electrónico/);
  });

  it("el recibo público enmascara el documento del cliente", () => {
    const t = texto(recibo(empresa, { ...r, publico: true }));
    expect(t).toContain("DNI ••••4567");
    expect(t).not.toContain("41234567");
  });

  it("un pago anulado lleva marca de agua y aviso", () => {
    const doc = recibo(empresa, { ...r, anulado: true, motivoAnulacion: "Monto equivocado" });
    expect(doc.marcaAgua).toBe("ANULADO");
    expect(texto(doc)).toContain("Monto equivocado");
  });

  it("mensaje de WhatsApp con el enlace y el saldo", () => {
    const m = mensajeRecibo({ nombres: "MARÍA ELENA", empresa: "Inversiones JP", numeroRecibo: "42", monto: 557.38, codigoCredito: "JP-2026-000123", saldo: 6076.17, enlace: "https://x.pe/r/abc" });
    expect(m).toContain("Hola María,");
    expect(m).toContain("Recibo N.° 000042");
    expect(m).toContain("Saldo pendiente: S/ 6,076.17");
    expect(m).toContain("https://x.pe/r/abc");
    expect(mensajeRecibo({ nombres: "Ana", empresa: "JP", numeroRecibo: "1", monto: 10, codigoCredito: "X", saldo: 0, enlace: "u" })).toContain("cancelado");
  });
});

describe("PDF", () => {
  it("sanear reemplaza lo que Helvetica no puede dibujar", () => {
    const permitidos = new Set([..."abc ->=?".split("").map((c) => c.codePointAt(0)!)]);
    expect(sanear("a≥b → c", permitidos)).toBe("a>=b -> c");
    expect(sanear("a😀", permitidos)).toBe("a?");
  });

  it("genera PDFs válidos y de varias páginas para todos los documentos", async () => {
    const enc = { empresa: empresa.nombre, ruc: empresa.ruc };
    const largo = { ...celular, numeroCuotas: 78, cuotas: Array.from({ length: 78 }, (_, i) => ({ ...cuotas[0], numero: i + 1 })) };
    for (const doc of [contratoVehicular(empresa, vehicular), contratoCelular(empresa, largo), pagare(empresa, vehicular), cronograma(empresa, largo, "2027-01-01"),
      recibo(empresa, { numeroRecibo: "1", fechaPago: "2027-01-01", registradoEl: new Date(), registradoPor: null, monto: 10, metodo: "Efectivo", numeroOperacion: null, anulado: true, motivoAnulacion: "😀 emoji", codigoCredito: "X", producto: null, cliente: vehicular.cliente, aplicaciones: [], saldoCredito: 0, cuotasPagadas: 0, numeroCuotas: 1 })]) {
      const bytes = await renderizarPdf(doc, enc);
      expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
      const leido = await PDFDocument.load(bytes);
      expect(leido.getPageCount()).toBeGreaterThan(0);
      expect(leido.getTitle()).toBe(doc.titulo);
    }
    const crono = await PDFDocument.load(await renderizarPdf(cronograma(empresa, largo, "2027-01-01"), enc));
    expect(crono.getPageCount()).toBeGreaterThan(1);
  });
});
