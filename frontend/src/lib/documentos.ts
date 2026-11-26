/**
 * Documentos del crédito (Fase 6): contratos, pagaré, cronograma y recibo de pago.
 *
 * Funciones PURAS: a partir de los datos congelados del crédito arman un modelo de documento
 * (bloques de texto, tablas y firmas) que luego `lib/pdf/render.ts` dibuja en PDF.
 * Así los tests verifican qué datos se vuelcan en cada documento sin tener que leer un PDF.
 *
 * Los textos legales son un MODELO REFERENCIAL hasta que un abogado los valide
 * (`configuracion.documentos_validados`); mientras tanto cada documento lo indica.
 */
import { ETIQUETA_FRECUENCIA, type Frecuencia } from "./finance";

// -----------------------------------------------------------------------------
// Modelo de documento
// -----------------------------------------------------------------------------
export type Alineacion = "izq" | "der" | "centro";

export type Bloque =
  | { t: "titulo"; texto: string }
  | { t: "subtitulo"; texto: string }
  /** Texto con **negritas** marcadas entre dobles asteriscos. */
  | { t: "parrafo"; texto: string; tamano?: number; alinear?: Alineacion }
  | { t: "clausula"; titulo: string; texto: string }
  | { t: "datos"; filas: [string, string][]; columnas?: 1 | 2 }
  | { t: "tabla"; columnas: { titulo: string; ancho: number; alinear?: Alineacion }[]; filas: string[][]; total?: string[] }
  | { t: "firmas"; firmas: Firma[] }
  | { t: "aviso"; texto: string }
  | { t: "destacado"; etiqueta: string; valor: string; detalle?: string }
  | { t: "espacio"; alto?: number }
  | { t: "salto" };

export interface Firma {
  rol: string;
  nombre: string;
  documento: string;
  huella?: boolean;
}

export interface Documento {
  /** Nombre del archivo (sin extensión). */
  archivo: string;
  titulo: string;
  /** Código que se imprime en la cabecera de cada página (crédito o recibo). */
  referencia: string;
  bloques: Bloque[];
  pie: string;
  marcaAgua?: string;
}

// -----------------------------------------------------------------------------
// Datos de entrada
// -----------------------------------------------------------------------------
export interface DatosEmpresa {
  nombre: string;
  razonSocial: string;
  ruc: string;
  representante: string | null;
  representanteDocumento: string | null;
  domicilio: string | null;
  ciudad: string;
  telefono: string;
  /** true cuando un abogado validó los textos legales. */
  validados: boolean;
}

export interface Persona {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  estadoCivil?: string | null;
  parentesco?: string | null;
}

export interface Vehiculo {
  tipoVehiculo: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  cilindradaCc: number | null;
  condicion: string;
  numeroMotor: string;
  numeroChasis: string;
  placa: string | null;
  proveedorGps: string | null;
  imeiGps: string | null;
}

export interface Celular {
  marca: string;
  modelo: string;
  almacenamiento: string | null;
  memoriaRam: string | null;
  color: string | null;
  condicion: string;
  imei1: string;
  imei2: string | null;
  numeroSerie: string | null;
  plataformaBloqueo: string;
}

export interface CuotaDoc {
  numero: number;
  /** AAAA-MM-DD */
  fecha: string;
  cuota: number;
  capital: number;
  interes: number;
  saldoCapital: number | null;
  mora?: number;
  pagado?: number;
  estado?: string;
}

export type TipoCredito = "CREDITO_VEHICULAR" | "CREDITO_CELULAR" | "PRESTAMO_EFECTIVO";

export interface DatosCredito {
  codigo: string;
  tipo: TipoCredito;
  estado: string;
  cliente: Persona;
  garante: Persona | null;
  vehiculo: Vehiculo | null;
  celular: Celular | null;
  montoTotal: number;
  cuotaInicial: number;
  montoFinanciado: number;
  tasaPorcentaje: number;
  tipoCalculo: "FLAT" | "FRANCES";
  totalIntereses: number;
  montoTotalPagar: number;
  frecuencia: Frecuencia;
  numeroCuotas: number;
  valorCuota: number;
  penalidadDiaria: number;
  teaPorcentaje: number | null;
  /** AAAA-MM-DD */
  fechaDesembolso: string;
  fechaPrimerVencimiento: string;
  diasGracia: number;
  /** % del valor de la cuota; null = sin tope. */
  moraTopePorcentaje: number | null;
  cuotas: CuotaDoc[];
}

export interface DatosRecibo {
  numeroRecibo: string;
  /** AAAA-MM-DD */
  fechaPago: string;
  /** Fecha y hora del registro (para mostrar la hora). */
  registradoEl: Date;
  registradoPor: string | null;
  monto: number;
  metodo: string;
  numeroOperacion: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  codigoCredito: string;
  producto: string | null;
  cliente: Pick<Persona, "nombres" | "apellidos" | "tipoDocumento" | "numeroDocumento">;
  aplicaciones: { numero: number; vence: string; mora: number; interes: number; capital: number; total: number }[];
  saldoCredito: number;
  cuotasPagadas: number;
  numeroCuotas: number;
  /** true en el enlace compartido por WhatsApp: el documento del cliente va enmascarado. */
  publico?: boolean;
}

// -----------------------------------------------------------------------------
// Utilidades de formato
// -----------------------------------------------------------------------------
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
  "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE",
  "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function menorDeMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let resto = "";
  if (r < 30) resto = UNIDADES[r];
  else resto = DECENAS[Math.floor(r / 10)] + (r % 10 ? ` Y ${UNIDADES[r % 10]}` : "");
  return [CENTENAS[c], resto].filter(Boolean).join(" ");
}

/** «UNO» → «UN» delante de «MIL», «MILLONES» o del sustantivo («VEINTIÚN SOLES»). */
const apocopar = (s: string) => s.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");

/** Entero en letras (0 a 999 999 999), en mayúsculas: 1521 → «MIL QUINIENTOS VEINTIUNO». */
export function numeroEnLetras(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "CERO";
  if (n > 999_999_999) throw new Error("Número demasiado grande");
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${apocopar(menorDeMil(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${apocopar(menorDeMil(miles))} MIL`);
  if (resto) partes.push(menorDeMil(resto));
  return partes.join(" ");
}

/** Monto en letras como se escribe en pagarés y contratos: 1500.5 → «MIL QUINIENTOS CON 50/100 SOLES». */
export function montoEnLetras(monto: number): string {
  const centimos = Math.round(Math.abs(monto) * 100);
  const entero = Math.floor(centimos / 100);
  const cts = String(centimos % 100).padStart(2, "0");
  return `${apocopar(numeroEnLetras(entero))} CON ${cts}/100 SOLES`;
}

/** S/ 1,234.50 (siempre con dos decimales). */
export const soles = (n: number) =>
  `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «25 de noviembre de 2026» a partir de AAAA-MM-DD. */
export function fechaEnLetras(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** 25/11/2026 a partir de AAAA-MM-DD. */
export const fechaCorta = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Deja visibles solo los 4 últimos caracteres del documento: 47926921 → «••••6921». */
export function enmascararDocumento(numero: string): string {
  const v = numero.trim();
  if (v.length <= 4) return "•".repeat(v.length);
  return "•".repeat(v.length - 4) + v.slice(-4);
}

const ETIQUETA_DOCUMENTO: Record<string, string> = {
  DNI: "DNI",
  CARNET_EXTRANJERIA: "C.E.",
  PASAPORTE: "Pasaporte",
  RUC: "RUC",
};
export const documentoDe = (p: Pick<Persona, "tipoDocumento" | "numeroDocumento">) =>
  `${ETIQUETA_DOCUMENTO[p.tipoDocumento] ?? p.tipoDocumento} N.° ${p.numeroDocumento}`;

export const nombreCompleto = (p: Pick<Persona, "nombres" | "apellidos">) => `${p.nombres} ${p.apellidos}`.replace(/\s+/g, " ").trim().toUpperCase();

/** Línea para completar a mano cuando falta un dato (ej. el representante legal). */
const RAYA = "________________________";
const o = (v: string | null | undefined, faltante = RAYA) => (v && v.trim() ? v.trim() : faltante);

export function domicilioDe(p: Persona): string {
  const ubic = [p.distrito, p.provincia, p.departamento].filter((x) => x && x.trim()).join(", ");
  return [p.direccion?.trim(), ubic].filter(Boolean).join(", ") || RAYA;
}

const legible = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
const ETIQUETA_VEHICULO: Record<string, string> = {
  MOTO_LINEAL: "motocicleta lineal",
  TRIMOVIL_PASAJEROS: "trimóvil (motokar o torito) de pasajeros",
  TRIMOVIL_CARGA: "trimóvil de carga",
};
const ETIQUETA_PLATAFORMA: Record<string, string> = {
  PAYJOY: "PayJoy",
  KNOX_GUARD: "Samsung Knox Guard",
  TRUSTONIC: "Trustonic",
  MDM_PROPIO: "gestión de dispositivos (MDM) de la empresa",
  ICLOUD: "cuenta iCloud administrada por la empresa",
  NINGUNA: "la plataforma de bloqueo que la empresa designe",
};

export const describirVehiculo = (v: Vehiculo) =>
  `${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""}${v.color ? `, color ${v.color.toLowerCase()}` : ""}`;
export const describirCelular = (c: Celular) =>
  `${c.marca} ${c.modelo}${c.almacenamiento ? ` ${c.almacenamiento}` : ""}${c.color ? `, color ${c.color.toLowerCase()}` : ""}`;

/** «mensuales», «semanales», «diarias»… */
export const cuotasPlural = (f: Frecuencia) => ({ DIARIO: "diarias", SEMANAL: "semanales", QUINCENAL: "quincenales", MENSUAL: "mensuales" })[f];

const tasaTexto = (d: Pick<DatosCredito, "tasaPorcentaje" | "tipoCalculo" | "frecuencia">) => {
  const t = `${d.tasaPorcentaje.toFixed(3).replace(/\.?0+$/, "")} %`;
  return d.tipoCalculo === "FLAT" ? `${t} sobre el monto financiado por todo el plazo (interés flat)` : `${t} por ${ETIQUETA_FRECUENCIA[d.frecuencia].singular} (cuota fija, sistema francés)`;
};

const avisoReferencial = (e: DatosEmpresa): Bloque[] =>
  e.validados
    ? []
    : [{ t: "aviso", texto: "Modelo referencial pendiente de validación legal. Revisar con un abogado antes de su firma." }];

const pieEmpresa = (e: DatosEmpresa) => `${e.razonSocial} · RUC ${e.ruc} · ${e.telefono}`;

function datosEmpresaTexto(e: DatosEmpresa): string {
  const rep = e.representante
    ? `, debidamente representada por **${e.representante.toUpperCase()}**${e.representanteDocumento ? `, identificado con ${e.representanteDocumento}` : ""}`
    : `, debidamente representada por ${RAYA}, identificado con DNI N.° ${RAYA}`;
  return `**${e.razonSocial.toUpperCase()}** («${e.nombre}»), con RUC N.° ${e.ruc}, con domicilio en ${o(e.domicilio)}${rep}`;
}

function personaTexto(p: Persona): string {
  const civil = p.estadoCivil ? `, de estado civil ${p.estadoCivil.toLowerCase()}` : "";
  const tel = p.telefono ? `, celular ${p.telefono}` : "";
  return `**${nombreCompleto(p)}**, identificado(a) con ${documentoDe(p)}${civil}, con domicilio en ${domicilioDe(p)}${tel}`;
}

// -----------------------------------------------------------------------------
// Cláusulas comunes
// -----------------------------------------------------------------------------
const ORDINALES = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA",
  "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA", "DÉCIMA TERCERA", "DÉCIMA CUARTA", "DÉCIMA QUINTA", "DÉCIMA SEXTA", "DÉCIMA SÉPTIMA"];

/** Numera las cláusulas en orden («PRIMERA.— OBJETO»). */
function numerar(clausulas: { titulo: string; texto: string }[]): Bloque[] {
  return clausulas.map((c, i) => ({ t: "clausula", titulo: `${ORDINALES[i] ?? i + 1}.— ${c.titulo.toUpperCase()}`, texto: c.texto }));
}

function textoMora(d: DatosCredito): string {
  if (d.penalidadDiaria <= 0) return "Las partes acuerdan que el atraso en el pago de las cuotas no genera penalidad diaria; sin perjuicio de lo dispuesto en la cláusula de incumplimiento.";
  const gracia = d.diasGracia > 0 ? `a partir del día ${d.diasGracia + 1} siguiente a su vencimiento (los primeros ${d.diasGracia} días son de tolerancia)` : "desde el día siguiente a su vencimiento";
  const tope = d.moraTopePorcentaje ? ` La penalidad acumulada de una cuota no superará el ${d.moraTopePorcentaje} % de su valor.` : "";
  return `Por cada día de atraso en el pago de una cuota, ${gracia}, EL CLIENTE pagará una penalidad de **${soles(d.penalidadDiaria)}** por día, hasta su pago total.${tope} Los pagos se aplican primero a la penalidad, luego a los intereses y finalmente al capital de la cuota más antigua.`;
}

function textoPago(d: DatosCredito): string {
  return `EL CLIENTE pagará el saldo financiado de **${soles(d.montoFinanciado)}** más intereses compensatorios a una tasa de ${tasaTexto(d)}${d.teaPorcentaje != null ? `, equivalente a una Tasa Efectiva Anual (TEA) de **${d.teaPorcentaje.toFixed(2)} %**` : ""}, en **${d.numeroCuotas} cuotas ${cuotasPlural(d.frecuencia)}** de **${soles(d.valorCuota)}** cada una (la última puede ajustarse por redondeo), con un total de intereses de ${soles(d.totalIntereses)} y un total a pagar por el saldo financiado de **${soles(d.montoTotalPagar)}** (${montoEnLetras(d.montoTotalPagar)}). La primera cuota vence el ${fechaEnLetras(d.fechaPrimerVencimiento)} y las demás en las fechas del cronograma del Anexo 1, que forma parte de este contrato. Los domingos y feriados no se cobran: si un vencimiento cae en uno de esos días, pasa al siguiente día hábil.`;
}

const clausulaMedios = (e: DatosEmpresa) => ({
  titulo: "Lugar y medios de pago",
  texto: `Los pagos se realizarán en efectivo en la oficina de LA EMPRESA o con su cobrador autorizado, o mediante Yape, Plin, transferencia o depósito a las cuentas que LA EMPRESA informe por escrito. Todo pago se acredita con el recibo numerado que emite LA EMPRESA. EL CLIENTE puede adelantar cuotas o cancelar el saldo en cualquier momento; en ese caso solo paga el capital pendiente y los intereses devengados hasta la fecha de pago. Consultas al ${e.telefono}.`,
});

const clausulaDatos = {
  titulo: "Datos personales",
  texto: "EL CLIENTE y, de ser el caso, EL FIADOR autorizan a LA EMPRESA a tratar sus datos personales para evaluar, administrar y cobrar este crédito, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y a la política de privacidad publicada en su web. Pueden ejercer sus derechos de acceso, rectificación, cancelación y oposición por los canales de atención de LA EMPRESA.",
};

const clausulaDomicilio = (e: DatosEmpresa) => ({
  titulo: "Domicilio y jurisdicción",
  texto: `Las partes señalan como domicilios los indicados en la introducción, donde se tendrán por válidas todas las comunicaciones. Cualquier cambio deberá comunicarse por escrito. Para toda controversia, las partes se someten a la jurisdicción de los jueces y tribunales de ${e.ciudad}.`,
});

function clausulaFianza(g: Persona | null) {
  if (!g) return null;
  return {
    titulo: "Fianza solidaria",
    texto: `${personaTexto(g)}, interviene como **FIADOR SOLIDARIO** de EL CLIENTE y garantiza el pago total de las cuotas, intereses, penalidades y gastos de cobranza derivados de este contrato, renunciando expresamente al beneficio de excusión (artículos 1868 y 1883 del Código Civil). La fianza se mantiene vigente hasta la cancelación total del crédito.`,
  };
}

function anexoCronograma(d: DatosCredito): Bloque[] {
  return [
    { t: "salto" },
    { t: "subtitulo", texto: `Anexo 1 · Cronograma de pagos del crédito ${d.codigo}` },
    { t: "parrafo", texto: `Cliente: **${nombreCompleto(d.cliente)}** · ${documentoDe(d.cliente)} · ${d.numeroCuotas} cuotas ${cuotasPlural(d.frecuencia)}`, tamano: 9 },
    tablaCronograma(d, false),
    { t: "espacio" },
    { t: "firmas", firmas: [{ rol: "EL CLIENTE", nombre: nombreCompleto(d.cliente), documento: documentoDe(d.cliente) }] },
  ];
}

function tablaCronograma(d: DatosCredito, conEstado: boolean): Bloque {
  const columnas: { titulo: string; ancho: number; alinear?: Alineacion }[] = [
    { titulo: "N.°", ancho: 0.6 },
    { titulo: "Vence", ancho: 1.3 },
    { titulo: "Capital", ancho: 1.2, alinear: "der" },
    { titulo: "Interés", ancho: 1.1, alinear: "der" },
    { titulo: "Cuota", ancho: 1.2, alinear: "der" },
    { titulo: "Saldo capital", ancho: 1.3, alinear: "der" },
  ];
  if (conEstado) columnas.push({ titulo: "Pagado", ancho: 1.1, alinear: "der" }, { titulo: "Estado", ancho: 1.3 });
  const f2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const filas = d.cuotas.map((c) => {
    const fila = [String(c.numero), fechaCorta(c.fecha), f2(c.capital), f2(c.interes), f2(c.cuota), c.saldoCapital != null ? f2(c.saldoCapital) : "—"];
    if (conEstado) fila.push(c.pagado ? f2(c.pagado) : "—", c.estado ? legible(c.estado) : "");
    return fila;
  });
  const suma = (k: "capital" | "interes" | "cuota") => f2(d.cuotas.reduce((s, c) => s + c[k], 0));
  const total = ["", "Total", suma("capital"), suma("interes"), suma("cuota"), ""];
  if (conEstado) total.push(f2(d.cuotas.reduce((s, c) => s + (c.pagado ?? 0), 0)), "");
  return { t: "tabla", columnas, filas, total };
}

function firmasContrato(e: DatosEmpresa, d: DatosCredito, rolCliente = "EL CLIENTE"): Bloque {
  const firmas: Firma[] = [
    { rol: "LA EMPRESA", nombre: e.representante ? e.representante.toUpperCase() : e.razonSocial.toUpperCase(), documento: e.representante ? `p. ${e.razonSocial} · RUC ${e.ruc}` : `RUC ${e.ruc}` },
    { rol: rolCliente, nombre: nombreCompleto(d.cliente), documento: documentoDe(d.cliente), huella: true },
  ];
  if (d.garante) firmas.push({ rol: "EL FIADOR SOLIDARIO", nombre: nombreCompleto(d.garante), documento: documentoDe(d.garante), huella: true });
  return { t: "firmas", firmas };
}

const cierre = (e: DatosEmpresa, d: DatosCredito): Bloque => ({
  t: "parrafo",
  texto: `En señal de conformidad, las partes firman ${d.garante ? "tres" : "dos"} ejemplares de igual tenor en la ciudad de ${e.ciudad}, el ${fechaEnLetras(d.fechaDesembolso)}.`,
});

function resumenCondiciones(d: DatosCredito): Bloque {
  const f = ETIQUETA_FRECUENCIA[d.frecuencia];
  return {
    t: "datos",
    columnas: 2,
    filas: [
      ["Precio de venta", soles(d.montoTotal)],
      ["Cuota inicial", soles(d.cuotaInicial)],
      ["Saldo financiado", soles(d.montoFinanciado)],
      [`Cuota ${f.adjetivo}`, `${soles(d.valorCuota)} × ${d.numeroCuotas}`],
      ["Total de intereses", soles(d.totalIntereses)],
      ["Total a pagar (financiado)", soles(d.montoTotalPagar)],
      ["TEA", d.teaPorcentaje != null ? `${d.teaPorcentaje.toFixed(2)} %` : "—"],
      ["Penalidad por día de atraso", d.penalidadDiaria > 0 ? soles(d.penalidadDiaria) : "No aplica"],
      ["Entrega", fechaCorta(d.fechaDesembolso)],
      ["Primer vencimiento", fechaCorta(d.fechaPrimerVencimiento)],
    ],
  };
}

// -----------------------------------------------------------------------------
// Contrato vehicular: compraventa a plazos con reserva de propiedad
// -----------------------------------------------------------------------------
export function contratoVehicular(e: DatosEmpresa, d: DatosCredito): Documento {
  const v = d.vehiculo;
  if (!v) throw new Error("El crédito no tiene un vehículo asociado");
  const bien = `una ${ETIQUETA_VEHICULO[v.tipoVehiculo] ?? "unidad vehicular"} marca **${v.marca}**, modelo **${v.modelo}**${v.anio ? `, año ${v.anio}` : ""}${v.color ? `, color ${v.color.toLowerCase()}` : ""}${v.cilindradaCc ? `, ${v.cilindradaCc} cc` : ""}, en condición de ${v.condicion.toLowerCase()}, con **N.° de motor ${v.numeroMotor}**, **N.° de chasis/VIN ${v.numeroChasis}** y ${v.placa ? `**placa ${v.placa}**` : "placa en trámite ante SUNARP"}`;
  const clausulas = [
    { titulo: "Partes", texto: `Conste por el presente documento el contrato de compraventa a plazos con reserva de propiedad que celebran, de una parte, ${datosEmpresaTexto(e)}, a quien en adelante se denominará **LA EMPRESA**; y de la otra, ${personaTexto(d.cliente)}, a quien en adelante se denominará **EL CLIENTE**${d.garante ? "; con la intervención del fiador solidario indicado en la cláusula correspondiente" : ""}.` },
    { titulo: "Objeto", texto: `LA EMPRESA vende a EL CLIENTE ${bien} (en adelante, **EL VEHÍCULO**), que EL CLIENTE declara recibir en buen estado de funcionamiento, a su entera satisfacción.` },
    { titulo: "Precio", texto: `El precio de venta de EL VEHÍCULO es de **${soles(d.montoTotal)}** (${montoEnLetras(d.montoTotal)}). EL CLIENTE paga en este acto una cuota inicial de ${soles(d.cuotaInicial)} (${montoEnLetras(d.cuotaInicial)}), de la que LA EMPRESA da recibo, y el saldo de ${soles(d.montoFinanciado)} se pagará a plazos conforme a la cláusula siguiente.` },
    { titulo: "Forma de pago", texto: textoPago(d) },
    clausulaMedios(e),
    { titulo: "Reserva de propiedad", texto: "Conforme a los artículos 1583 y siguientes del Código Civil, LA EMPRESA se reserva la propiedad de EL VEHÍCULO hasta que EL CLIENTE pague la totalidad del precio. EL CLIENTE recibe la posesión y asume desde la entrega el riesgo de pérdida o deterioro. Cancelado el precio, la propiedad se transfiere automáticamente y LA EMPRESA entregará la documentación y firmará lo necesario para su inscripción a nombre de EL CLIENTE en el Registro de Propiedad Vehicular (SUNARP)." },
    { titulo: "Obligaciones de EL CLIENTE", texto: "Mientras exista saldo pendiente, EL CLIENTE se obliga a: (a) usar EL VEHÍCULO con diligencia y mantenerlo en buen estado; (b) no venderlo, alquilarlo, gravarlo, transferirlo ni sacarlo del departamento sin autorización escrita de LA EMPRESA; (c) mantener vigentes el SOAT y los permisos de circulación; (d) asumir multas, papeletas, tributos y daños a terceros derivados de su uso; (e) informar de inmediato cualquier robo, accidente o embargo; y (f) permitir la inspección de EL VEHÍCULO cuando LA EMPRESA lo solicite." },
    { titulo: "GPS y corta-corriente", texto: v.proveedorGps || v.imeiGps
      ? `EL VEHÍCULO lleva instalado un dispositivo GPS${v.proveedorGps ? ` (${v.proveedorGps})` : ""}${v.imeiGps ? `, IMEI ${v.imeiGps}` : ""}, con función de corta-corriente. EL CLIENTE autoriza expresamente a LA EMPRESA a conocer la ubicación de EL VEHÍCULO y a activar el corte de encendido en caso de atraso en los pagos, previa comunicación, nunca con el vehículo en movimiento. Retirar o manipular el dispositivo es causal de resolución.`
      : "EL CLIENTE autoriza a LA EMPRESA a instalar en EL VEHÍCULO un dispositivo GPS con corta-corriente, a conocer su ubicación y a activar el corte de encendido en caso de atraso en los pagos, previa comunicación y nunca con el vehículo en movimiento. Retirar o manipular el dispositivo es causal de resolución." },
    { titulo: "Penalidad por atraso", texto: textoMora(d) },
    { titulo: "Incumplimiento y resolución", texto: "Si EL CLIENTE deja de pagar tres (3) cuotas, sucesivas o no, o incumple las obligaciones de la cláusula séptima, LA EMPRESA podrá dar por vencidos todos los plazos y exigir el pago total del saldo, o resolver el contrato de pleno derecho comunicándolo por escrito (artículos 1430 y 1561 del Código Civil). Resuelto el contrato, EL CLIENTE devolverá EL VEHÍCULO en un plazo de 48 horas; LA EMPRESA restituirá lo pagado descontando una compensación equitativa por el uso, el deterioro del bien, las penalidades y los gastos de recuperación, conforme al artículo 1563 del Código Civil." },
    ...(d.garante ? [clausulaFianza(d.garante)!] : []),
    clausulaDatos,
    clausulaDomicilio(e),
  ];
  return {
    archivo: `contrato-${d.codigo}`,
    titulo: "Contrato de compraventa a plazos con reserva de propiedad",
    referencia: d.codigo,
    pie: pieEmpresa(e),
    bloques: [
      { t: "titulo", texto: "Contrato de compraventa a plazos con reserva de propiedad" },
      { t: "parrafo", texto: `Crédito vehicular **${d.codigo}** · ${fechaEnLetras(d.fechaDesembolso)}`, alinear: "centro", tamano: 9 },
      ...avisoReferencial(e),
      resumenCondiciones(d),
      ...numerar(clausulas),
      cierre(e, d),
      firmasContrato(e, d),
      ...anexoCronograma(d),
    ],
  };
}

// -----------------------------------------------------------------------------
// Contrato de celular: compraventa a plazos con cláusula de bloqueo
// -----------------------------------------------------------------------------
export function contratoCelular(e: DatosEmpresa, d: DatosCredito): Documento {
  const c = d.celular;
  if (!c) throw new Error("El crédito no tiene un celular asociado");
  const plataforma = ETIQUETA_PLATAFORMA[c.plataformaBloqueo] ?? legible(c.plataformaBloqueo);
  const bien = `un teléfono celular marca **${c.marca}**, modelo **${c.modelo}**${c.almacenamiento ? `, ${c.almacenamiento}` : ""}${c.memoriaRam ? ` / ${c.memoriaRam} RAM` : ""}${c.color ? `, color ${c.color.toLowerCase()}` : ""}, en condición de ${c.condicion.toLowerCase()}, con **IMEI ${c.imei1}**${c.imei2 ? ` y **IMEI 2 ${c.imei2}**` : ""}${c.numeroSerie ? `, N.° de serie ${c.numeroSerie}` : ""}`;
  const clausulas = [
    { titulo: "Partes", texto: `Conste por el presente documento el contrato de compraventa a plazos de equipo celular que celebran, de una parte, ${datosEmpresaTexto(e)}, a quien en adelante se denominará **LA EMPRESA**; y de la otra, ${personaTexto(d.cliente)}, a quien en adelante se denominará **EL CLIENTE**${d.garante ? "; con la intervención del fiador solidario indicado en la cláusula correspondiente" : ""}.` },
    { titulo: "Objeto", texto: `LA EMPRESA vende a EL CLIENTE ${bien} (en adelante, **EL EQUIPO**), que EL CLIENTE declara recibir nuevo o en el estado indicado, operativo y a su satisfacción, con su caja y accesorios.` },
    { titulo: "Precio", texto: `El precio de venta de EL EQUIPO es de **${soles(d.montoTotal)}** (${montoEnLetras(d.montoTotal)}). ${d.cuotaInicial > 0 ? `EL CLIENTE paga en este acto una cuota inicial de ${soles(d.cuotaInicial)} (${montoEnLetras(d.cuotaInicial)}) y` : "EL CLIENTE no paga cuota inicial y"} el saldo de ${soles(d.montoFinanciado)} se pagará a plazos conforme a la cláusula siguiente.` },
    { titulo: "Forma de pago", texto: textoPago(d) },
    clausulaMedios(e),
    { titulo: "Reserva de propiedad", texto: "LA EMPRESA se reserva la propiedad de EL EQUIPO hasta el pago total del precio (artículo 1583 del Código Civil). Mientras tanto EL CLIENTE no podrá venderlo, empeñarlo, cederlo ni cambiar sus componentes, y asume el riesgo de pérdida, robo o daño desde la entrega: estos hechos no lo liberan de pagar las cuotas pendientes." },
    { titulo: "Bloqueo del equipo (consentimiento expreso)", texto: `EL CLIENTE declara conocer y **acepta expresamente** que EL EQUIPO está enrolado en ${plataforma}, que permite a LA EMPRESA restringir su uso a distancia. EL CLIENTE autoriza a LA EMPRESA a: (a) **bloquear EL EQUIPO** cuando tenga una o más cuotas vencidas impagas, después de un recordatorio por WhatsApp o llamada; durante el bloqueo, EL EQUIPO solo permitirá llamadas de emergencia y comunicarse con LA EMPRESA; (b) **desbloquearlo** dentro de las 24 horas siguientes a la regularización del pago; y (c) **liberarlo definitivamente** al cancelar el precio. El bloqueo no accede a fotos, mensajes, contactos ni otro contenido personal, y no borra información. EL CLIENTE se obliga a no desinstalar, alterar ni evadir la aplicación o el enrolamiento, ni a restablecer o reparar EL EQUIPO fuera de los canales de LA EMPRESA; hacerlo es causal de resolución.` },
    { titulo: "Penalidad por atraso", texto: textoMora(d) },
    { titulo: "Incumplimiento y resolución", texto: "Si EL CLIENTE deja de pagar tres (3) cuotas, sucesivas o no, o manipula el sistema de bloqueo, LA EMPRESA podrá dar por vencidos todos los plazos y exigir el saldo total, o resolver el contrato comunicándolo por escrito (artículos 1430 y 1561 del Código Civil) y pedir la devolución de EL EQUIPO. LA EMPRESA restituirá lo pagado descontando una compensación equitativa por el uso, el deterioro, las penalidades y los gastos de recuperación (artículo 1563 del Código Civil)." },
    { titulo: "Garantía del fabricante", texto: "La garantía de EL EQUIPO es la del fabricante o importador, según sus condiciones, y se tramita a través de LA EMPRESA. No cubre daños por golpes, humedad, manipulación indebida ni reparaciones de terceros. Una falla del equipo no suspende la obligación de pago." },
    ...(d.garante ? [clausulaFianza(d.garante)!] : []),
    clausulaDatos,
    clausulaDomicilio(e),
  ];
  return {
    archivo: `contrato-${d.codigo}`,
    titulo: "Contrato de compraventa a plazos de equipo celular",
    referencia: d.codigo,
    pie: pieEmpresa(e),
    bloques: [
      { t: "titulo", texto: "Contrato de compraventa a plazos de equipo celular con cláusula de bloqueo" },
      { t: "parrafo", texto: `Crédito celular **${d.codigo}** · ${fechaEnLetras(d.fechaDesembolso)}`, alinear: "centro", tamano: 9 },
      ...avisoReferencial(e),
      resumenCondiciones(d),
      ...numerar(clausulas),
      cierre(e, d),
      { t: "parrafo", texto: `**Declaración de EL CLIENTE:** «He leído la cláusula de bloqueo del equipo, me la han explicado y la acepto expresamente».`, tamano: 9 },
      firmasContrato(e, d),
      ...anexoCronograma(d),
    ],
  };
}

// -----------------------------------------------------------------------------
// Contrato de mutuo (préstamos de dinero)
// -----------------------------------------------------------------------------
export function contratoMutuo(e: DatosEmpresa, d: DatosCredito): Documento {
  const clausulas = [
    { titulo: "Partes", texto: `Conste por el presente documento el contrato de mutuo dinerario que celebran, de una parte, ${datosEmpresaTexto(e)}, a quien en adelante se denominará **LA EMPRESA**; y de la otra, ${personaTexto(d.cliente)}, a quien en adelante se denominará **EL CLIENTE**.` },
    { titulo: "Objeto", texto: `LA EMPRESA entregó en préstamo a EL CLIENTE la suma de **${soles(d.montoFinanciado)}** (${montoEnLetras(d.montoFinanciado)}) el ${fechaEnLetras(d.fechaDesembolso)}, que EL CLIENTE declara haber recibido a su satisfacción y se obliga a devolver conforme a este contrato (artículos 1648 y siguientes del Código Civil).` },
    { titulo: "Devolución e intereses", texto: textoPago(d) },
    clausulaMedios(e),
    { titulo: "Penalidad por atraso", texto: textoMora(d) },
    { titulo: "Incumplimiento", texto: "Si EL CLIENTE deja de pagar tres (3) cuotas, sucesivas o no, LA EMPRESA podrá dar por vencidos todos los plazos y exigir el pago total del saldo, intereses y penalidades, pudiendo completar y ejecutar el pagaré emitido en garantía." },
    ...(d.garante ? [clausulaFianza(d.garante)!] : []),
    clausulaDatos,
    clausulaDomicilio(e),
  ];
  return {
    archivo: `mutuo-${d.codigo}`,
    titulo: "Contrato de mutuo dinerario",
    referencia: d.codigo,
    pie: pieEmpresa(e),
    bloques: [
      { t: "titulo", texto: "Contrato de mutuo dinerario" },
      { t: "parrafo", texto: `Préstamo **${d.codigo}** · ${fechaEnLetras(d.fechaDesembolso)}`, alinear: "centro", tamano: 9 },
      ...avisoReferencial(e),
      ...numerar(clausulas),
      cierre(e, d),
      firmasContrato(e, d),
      ...anexoCronograma(d),
    ],
  };
}

/** El contrato que corresponde al tipo de crédito. */
export function contratoDe(e: DatosEmpresa, d: DatosCredito): Documento {
  if (d.tipo === "CREDITO_VEHICULAR") return contratoVehicular(e, d);
  if (d.tipo === "CREDITO_CELULAR") return contratoCelular(e, d);
  return contratoMutuo(e, d);
}

// -----------------------------------------------------------------------------
// Pagaré (Ley N.° 27287, Ley de Títulos Valores)
// -----------------------------------------------------------------------------
export function pagare(e: DatosEmpresa, d: DatosCredito): Documento {
  const ultima = d.cuotas.at(-1)?.fecha ?? d.fechaPrimerVencimiento;
  const g = d.garante;
  return {
    archivo: `pagare-${d.codigo}`,
    titulo: "Pagaré",
    referencia: d.codigo,
    pie: pieEmpresa(e),
    bloques: [
      { t: "titulo", texto: "Pagaré" },
      ...avisoReferencial(e),
      { t: "datos", columnas: 2, filas: [
        ["N.° de pagaré", d.codigo],
        ["Importe", soles(d.montoTotalPagar)],
        ["Lugar de emisión", e.ciudad],
        ["Fecha de emisión", fechaCorta(d.fechaDesembolso)],
        ["Vencimiento", fechaCorta(ultima)],
        ["Lugar de pago", o(e.domicilio, `Oficina de ${e.nombre}, ${e.ciudad}`)],
      ] },
      { t: "parrafo", texto: `Por este PAGARÉ, me obligo (nos obligamos) a pagar incondicionalmente a la orden de **${e.razonSocial.toUpperCase()}**, con RUC N.° ${e.ruc}, o a quien este título haya sido endosado, en la fecha de vencimiento indicada, la suma de **${soles(d.montoTotalPagar)} (${montoEnLetras(d.montoTotalPagar)})**, importe que corresponde al crédito ${d.codigo} recibido a mi (nuestra) entera satisfacción.` },
      { t: "parrafo", texto: `Desde su vencimiento, el importe impago devengará, sin necesidad de requerimiento, los intereses compensatorios pactados en el contrato del crédito ${d.codigo}${d.penalidadDiaria > 0 ? ` y una penalidad de ${soles(d.penalidadDiaria)} por día de atraso` : ""}, más los gastos de cobranza que se generen.` },
      { t: "parrafo", texto: "Este pagaré **no requiere ser protestado** por falta de pago (artículo 52 de la Ley N.° 27287). Autorizo (autorizamos) al tenedor a prorrogar su vencimiento total o parcialmente, sin que sea necesaria mi (nuestra) intervención, y a que, si se pagan parcialmente las cuotas del cronograma, el importe exigible sea solo el saldo pendiente según la liquidación del crédito. Me (nos) someto (sometemos) a la jurisdicción de los jueces y tribunales de " + e.ciudad + " y señalo (señalamos) como domicilio el indicado abajo." },
      { t: "subtitulo", texto: "Emitente" },
      { t: "datos", filas: [
        ["Nombre", nombreCompleto(d.cliente)],
        ["Documento", documentoDe(d.cliente)],
        ["Domicilio", domicilioDe(d.cliente)],
      ] },
      ...(g ? [
        { t: "subtitulo", texto: "Aval" } as Bloque,
        { t: "parrafo", texto: "Me constituyo en aval solidario del emitente por el importe total de este pagaré, sus intereses y gastos, sin beneficio de excusión, con las mismas prórrogas que el tenedor conceda.", tamano: 9 } as Bloque,
        { t: "datos", filas: [
          ["Nombre", nombreCompleto(g)],
          ["Documento", documentoDe(g)],
          ["Domicilio", domicilioDe(g)],
        ] } as Bloque,
      ] : []),
      { t: "espacio" },
      { t: "firmas", firmas: [
        { rol: "EMITENTE", nombre: nombreCompleto(d.cliente), documento: documentoDe(d.cliente), huella: true },
        ...(g ? [{ rol: "AVAL", nombre: nombreCompleto(g), documento: documentoDe(g), huella: true }] : []),
      ] },
    ],
  };
}

// -----------------------------------------------------------------------------
// Cronograma (con lo pagado al día de hoy)
// -----------------------------------------------------------------------------
export function cronograma(e: DatosEmpresa, d: DatosCredito, hoy: string): Documento {
  const bien = d.vehiculo ? describirVehiculo(d.vehiculo) : d.celular ? describirCelular(d.celular) : "Préstamo en efectivo";
  const saldo = d.cuotas.filter((c) => c.estado !== "PAGADA").reduce((s, c) => s + Math.max(c.cuota + (c.mora ?? 0) - (c.pagado ?? 0), 0), 0);
  return {
    archivo: `cronograma-${d.codigo}`,
    titulo: "Cronograma de pagos",
    referencia: d.codigo,
    pie: `${pieEmpresa(e)} · Emitido el ${fechaCorta(hoy)}`,
    marcaAgua: d.estado === "ANULADO" ? "ANULADO" : undefined,
    bloques: [
      { t: "titulo", texto: "Cronograma de pagos" },
      { t: "datos", columnas: 2, filas: [
        ["Crédito", d.codigo],
        ["Cliente", nombreCompleto(d.cliente)],
        ["Documento", documentoDe(d.cliente)],
        ["Producto", bien],
        ["Saldo financiado", soles(d.montoFinanciado)],
        ["Cuotas", `${d.numeroCuotas} ${cuotasPlural(d.frecuencia)} de ${soles(d.valorCuota)}`],
        ["TEA", d.teaPorcentaje != null ? `${d.teaPorcentaje.toFixed(2)} %` : "—"],
        ["Saldo al " + fechaCorta(hoy), soles(saldo)],
      ] },
      tablaCronograma(d, true),
      { t: "parrafo", tamano: 8, texto: `Domingos y feriados no se cobran. ${d.penalidadDiaria > 0 ? `Penalidad por atraso: ${soles(d.penalidadDiaria)} por día después de ${d.diasGracia} día(s) de tolerancia. ` : ""}Paga siempre con recibo.` },
    ],
  };
}

// -----------------------------------------------------------------------------
// Recibo de pago
// -----------------------------------------------------------------------------
export function recibo(e: DatosEmpresa, r: DatosRecibo): Documento {
  const numero = r.numeroRecibo.padStart(6, "0");
  const doc = r.publico
    ? `${ETIQUETA_DOCUMENTO[r.cliente.tipoDocumento] ?? r.cliente.tipoDocumento} ${enmascararDocumento(r.cliente.numeroDocumento)}`
    : documentoDe(r.cliente);
  const hora = r.registradoEl.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });
  const f2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const suma = (k: "mora" | "interes" | "capital" | "total") => f2(r.aplicaciones.reduce((s, a) => s + a[k], 0));
  return {
    archivo: `recibo-${numero}`,
    titulo: `Recibo de pago N.° ${numero}`,
    referencia: `Recibo ${numero}`,
    pie: `${pieEmpresa(e)} · Constancia de pago: no es un comprobante electrónico SUNAT`,
    marcaAgua: r.anulado ? "ANULADO" : undefined,
    bloques: [
      { t: "titulo", texto: `Recibo de pago N.° ${numero}` },
      ...(r.anulado ? [{ t: "aviso", texto: `Pago ANULADO${r.motivoAnulacion ? `: ${r.motivoAnulacion}` : ""}. Este recibo no tiene validez.` } as Bloque] : []),
      { t: "destacado", etiqueta: "Monto recibido", valor: soles(r.monto), detalle: montoEnLetras(r.monto) },
      { t: "datos", columnas: 2, filas: [
        ["Fecha", `${fechaCorta(r.fechaPago)} · ${hora}`],
        ["Método", r.metodo],
        ["Cliente", nombreCompleto(r.cliente)],
        ["Documento", doc],
        ["Crédito", r.codigoCredito],
        ["Producto", r.producto ?? "—"],
        ...(r.numeroOperacion ? [["N.° de operación", r.numeroOperacion] as [string, string]] : []),
        ["Atendido por", r.registradoPor ?? "Sistema anterior"],
      ] },
      { t: "subtitulo", texto: "Aplicado a" },
      { t: "tabla",
        columnas: [
          { titulo: "Cuota", ancho: 0.9 },
          { titulo: "Vence", ancho: 1.2 },
          { titulo: "Mora", ancho: 1, alinear: "der" },
          { titulo: "Interés", ancho: 1, alinear: "der" },
          { titulo: "Capital", ancho: 1, alinear: "der" },
          { titulo: "Total", ancho: 1.1, alinear: "der" },
        ],
        filas: r.aplicaciones.map((a) => [`N.° ${a.numero}`, fechaCorta(a.vence), f2(a.mora), f2(a.interes), f2(a.capital), f2(a.total)]),
        total: ["Total", "", suma("mora"), suma("interes"), suma("capital"), suma("total")],
      },
      { t: "datos", columnas: 2, filas: [
        ["Cuotas pagadas", `${r.cuotasPagadas} de ${r.numeroCuotas}`],
        ["Saldo del crédito", soles(r.saldoCredito)],
      ] },
      { t: "parrafo", tamano: 8, texto: `Gracias por tu pago. Consultas: ${e.telefono}. Guarda este recibo como constancia.` },
    ],
  };
}

// -----------------------------------------------------------------------------
// Mensaje de WhatsApp con el enlace al recibo
// -----------------------------------------------------------------------------
export function mensajeRecibo(p: {
  nombres: string;
  empresa: string;
  numeroRecibo: string;
  monto: number;
  codigoCredito: string;
  saldo: number;
  enlace: string;
}): string {
  const primer = p.nombres.trim().split(/\s+/)[0] ?? "";
  const nombre = primer.charAt(0).toUpperCase() + primer.slice(1).toLowerCase();
  return [
    `Hola ${nombre}, te saluda ${p.empresa}.`,
    `Registramos tu pago de ${soles(p.monto)} del crédito ${p.codigoCredito}. Recibo N.° ${p.numeroRecibo.padStart(6, "0")}.`,
    p.saldo > 0.004 ? `Saldo pendiente: ${soles(p.saldo)}.` : "¡Tu crédito quedó cancelado! Gracias por tu puntualidad.",
    `Descarga tu recibo aquí: ${p.enlace}`,
  ].join("\n");
}

/** Documentos que se pueden generar para un crédito, según su tipo. */
export const DOCUMENTOS_CREDITO = ["contrato", "pagare", "cronograma"] as const;
export type DocumentoCredito = (typeof DOCUMENTOS_CREDITO)[number];

/** Contrato y pagaré tienen datos personales completos: solo los emiten quienes venden o administran créditos. */
export const ROLES_DOCUMENTOS_LEGALES = ["SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS"] as const;

export const TIPOS_DOCUMENTO_FIRMADO = ["CONTRATO_FIRMADO", "PAGARE_FIRMADO", "CRONOGRAMA_FIRMADO", "ACTA_ENTREGA", "OTRO"] as const;
export const ETIQUETA_DOCUMENTO_FIRMADO: Record<(typeof TIPOS_DOCUMENTO_FIRMADO)[number], string> = {
  CONTRATO_FIRMADO: "Contrato firmado",
  PAGARE_FIRMADO: "Pagaré firmado",
  CRONOGRAMA_FIRMADO: "Cronograma firmado",
  ACTA_ENTREGA: "Acta de entrega",
  OTRO: "Otro documento",
};

// -----------------------------------------------------------------------------
// Lista de cobranza del día (todas las cuotas que vencen hoy y las vencidas)
// -----------------------------------------------------------------------------
export interface FilaCobranza {
  cliente: string;
  telefono: string | null;
  direccion: string | null;
  codigo: string;
  /** Cuota que vence hoy (saldo) o 0. */
  hoy: number;
  /** Total vencido de cuotas anteriores. */
  vencido: number;
  cuotasVencidas: number;
  diasAtraso: number;
}

export function listaCobranza(e: DatosEmpresa, hoy: string, filas: FilaCobranza[]): Documento {
  const f2 = (n: number) => (n > 0.004 ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
  const conHoy = filas.filter((f) => f.hoy > 0.004 && f.vencido <= 0.004);
  const enMora = filas.filter((f) => f.vencido > 0.004).sort((a, b) => b.diasAtraso - a.diasAtraso);
  const totalHoy = filas.reduce((s, f) => s + f.hoy, 0);
  const totalMora = filas.reduce((s, f) => s + f.vencido, 0);
  const contacto = (f: FilaCobranza) => [f.telefono, f.direccion].filter(Boolean).join(" · ") || "—";
  const tabla = (lista: FilaCobranza[], mora: boolean): Bloque => ({
    t: "tabla",
    columnas: [
      { titulo: "N.°", ancho: 0.55 },
      { titulo: "Cliente", ancho: 2.1 },
      { titulo: "Celular / dirección", ancho: mora ? 1.65 : 2.25 },
      { titulo: "Crédito", ancho: 2.1 },
      ...(mora ? [{ titulo: "Atraso", ancho: 0.9, alinear: "der" as const }, { titulo: "Vencido", ancho: 1, alinear: "der" as const }] : []),
      { titulo: "Hoy", ancho: 0.9, alinear: "der" as const },
      { titulo: "Cobrado", ancho: 1.1 },
    ],
    filas: lista.map((f, i) => [
      String(i + 1),
      f.cliente,
      contacto(f),
      f.codigo,
      ...(mora ? [`${f.diasAtraso} d (${f.cuotasVencidas})`, f2(f.vencido)] : []),
      f2(f.hoy),
      "",
    ]),
    total: mora
      ? ["", "Total", "", "", "", f2(lista.reduce((s, f) => s + f.vencido, 0)), f2(lista.reduce((s, f) => s + f.hoy, 0)), ""]
      : ["", "Total", "", "", f2(lista.reduce((s, f) => s + f.hoy, 0)), ""],
  });
  return {
    archivo: `cobranzas-${hoy}`,
    titulo: "Cobranzas pendientes",
    referencia: `Cobranzas ${fechaCorta(hoy)}`,
    pie: `${pieEmpresa(e)} · Uso interno · Emitido el ${fechaCorta(hoy)}`,
    bloques: [
      { t: "titulo", texto: "Cobranzas pendientes" },
      { t: "parrafo", texto: `Al **${fechaCorta(hoy)}** · ${filas.length} cliente${filas.length === 1 ? "" : "s"} por cobrar`, alinear: "centro", tamano: 9 },
      { t: "datos", columnas: 2, filas: [
        ["Vencen hoy", `${filas.filter((f) => f.hoy > 0.004).length} cuotas · S/ ${f2(totalHoy)}`],
        ["En mora", `${enMora.length} créditos · S/ ${f2(totalMora)}`],
      ] },
      { t: "subtitulo", texto: `Vencen hoy (${conHoy.length})` },
      conHoy.length ? tabla(conHoy, false) : { t: "parrafo", texto: "Ninguna cuota vence hoy." },
      { t: "subtitulo", texto: `En mora (${enMora.length})` },
      enMora.length ? tabla(enMora, true) : { t: "parrafo", texto: "No hay créditos en mora." },
    ],
  };
}
