/**
 * Reglas de clientes y garantes (KYC) compartidas por el panel, el servidor y los tests.
 * Sin dependencias de servidor: se puede importar desde componentes cliente.
 */

// -----------------------------------------------------------------------------
// Glosario (mismos valores que los enums de la base de datos)
// -----------------------------------------------------------------------------
export const TIPOS_DOCUMENTO = ["DNI", "CARNET_EXTRANJERIA", "PASAPORTE", "RUC"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  DNI: "DNI",
  CARNET_EXTRANJERIA: "Carné de extranjería",
  PASAPORTE: "Pasaporte",
  RUC: "RUC",
};

export const SEXOS = ["MASCULINO", "FEMENINO", "OTRO"] as const;
export const ESTADOS_CIVILES = ["SOLTERO", "CASADO", "CONVIVIENTE", "DIVORCIADO", "VIUDO"] as const;
export const TIPOS_VIVIENDA = ["PROPIA", "ALQUILADA", "FAMILIAR"] as const;
export const PARENTESCOS = ["CONYUGE", "FAMILIAR", "AMIGO", "COMPANERO_PARADERO", "OTRO"] as const;
export const ETIQUETA_PARENTESCO: Record<(typeof PARENTESCOS)[number], string> = {
  CONYUGE: "Cónyuge",
  FAMILIAR: "Familiar",
  AMIGO: "Amigo(a)",
  COMPANERO_PARADERO: "Compañero de paradero",
  OTRO: "Otro",
};

export const ESTADOS_CLIENTE = ["NUEVO", "ACTIVO_AL_DIA", "ACTIVO_EN_MORA", "EXCELENTE_PAGADOR", "BLOQUEADO_LEGAL"] as const;
export type EstadoCliente = (typeof ESTADOS_CLIENTE)[number];
export const ETIQUETA_ESTADO_CLIENTE: Record<EstadoCliente, string> = {
  NUEVO: "Nuevo",
  ACTIVO_AL_DIA: "Al día",
  ACTIVO_EN_MORA: "En mora",
  EXCELENTE_PAGADOR: "Excelente pagador",
  BLOQUEADO_LEGAL: "Bloqueado (legal)",
};
export const TONO_ESTADO_CLIENTE: Record<EstadoCliente, "brand" | "accent" | "gold" | "outline"> = {
  NUEVO: "brand",
  ACTIVO_AL_DIA: "accent",
  ACTIVO_EN_MORA: "gold",
  EXCELENTE_PAGADOR: "accent",
  BLOQUEADO_LEGAL: "outline",
};

export const TIPOS_DOCUMENTO_KYC = ["DNI_ANVERSO", "DNI_REVERSO", "RECIBO_SERVICIO", "FACHADA", "OTRO"] as const;
export type TipoDocumentoKyc = (typeof TIPOS_DOCUMENTO_KYC)[number];
export const ETIQUETA_DOCUMENTO_KYC: Record<TipoDocumentoKyc, string> = {
  DNI_ANVERSO: "DNI (anverso)",
  DNI_REVERSO: "DNI (reverso)",
  RECIBO_SERVICIO: "Recibo de luz o agua",
  FACHADA: "Fachada del domicilio",
  OTRO: "Otro documento",
};
/** Documentos que se piden a un garante. */
export const DOCUMENTOS_GARANTE = ["DNI_ANVERSO", "DNI_REVERSO", "OTRO"] as const satisfies readonly TipoDocumentoKyc[];

// -----------------------------------------------------------------------------
// Documentos de identidad
// -----------------------------------------------------------------------------

/** Quita espacios, puntos y guiones y pasa a mayúsculas: «12.345.678» → «12345678». */
export const normalizarDocumento = (numero: string) => numero.toUpperCase().replace(/[\s.\-_/]/g, "");

/** Dígito verificador del RUC (módulo 11 de SUNAT) para los 10 primeros dígitos. */
export function digitoVerificadorRuc(base10: string): number {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(base10[i]), 0);
  const r = 11 - (suma % 11);
  return r === 10 ? 0 : r === 11 ? 1 : r;
}

export function esRucValido(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false;
  return digitoVerificadorRuc(ruc.slice(0, 10)) === Number(ruc[10]);
}

/** Devuelve el mensaje de error del número de documento, o null si es válido. Espera el número ya normalizado. */
export function errorDocumento(tipo: TipoDocumento, numero: string): string | null {
  switch (tipo) {
    case "DNI":
      return /^\d{8}$/.test(numero) ? null : "El DNI tiene 8 dígitos";
    case "CARNET_EXTRANJERIA":
      return /^\d{9}$/.test(numero) ? null : "El carné de extranjería tiene 9 dígitos";
    case "PASAPORTE":
      return /^[A-Z0-9]{6,12}$/.test(numero) ? null : "El pasaporte tiene entre 6 y 12 letras o números";
    case "RUC":
      if (!/^\d{11}$/.test(numero)) return "El RUC tiene 11 dígitos";
      return esRucValido(numero) ? null : "RUC no válido (revisa el dígito verificador)";
  }
}

/** Documento de relleno de la migración del sistema anterior (ej. «SIN-DOC-12»). */
export const esDocumentoProvisional = (numero: string) => /^SIN-?DOC-?\d+$/i.test(numero) || /^OLD-?/i.test(numero);

/** Número de documento para mostrar: los clientes sin DNI (documento provisional) se muestran como «sin DNI». */
export const documentoVisible = (numero: string | null | undefined) => (!numero || esDocumentoProvisional(numero) ? "sin DNI" : numero);

/** «DNI 12345678» (o el tipo indicado), o «Sin DNI» si el cliente no tiene documento. */
export const textoDocumento = (numero: string | null | undefined, tipo = "DNI") =>
  !numero || esDocumentoProvisional(numero) ? "Sin DNI" : `${tipo === "CARNET_EXTRANJERIA" ? "CE" : tipo} ${numero}`;

/**
 * Documentos que identifican a la MISMA persona. Sirve para detectar duplicados:
 * el RUC de persona natural es «10» + DNI + dígito verificador.
 */
export function documentosEquivalentes(tipo: TipoDocumento, numero: string): { tipo: TipoDocumento; numero: string }[] {
  const n = normalizarDocumento(numero);
  const out = [{ tipo, numero: n }];
  if (tipo === "DNI" && /^\d{8}$/.test(n)) {
    const base = `10${n}`;
    out.push({ tipo: "RUC", numero: `${base}${digitoVerificadorRuc(base)}` });
  }
  if (tipo === "RUC" && /^10\d{9}$/.test(n)) out.push({ tipo: "DNI", numero: n.slice(2, 10) });
  return out;
}

/** Busca en una lista un registro que sea la misma persona (mismo documento o equivalente). */
export function buscarDuplicado<T extends { id: string; tipo_documento: string; numero_documento: string }>(
  existentes: readonly T[],
  tipo: TipoDocumento,
  numero: string,
  excluirId?: string,
): T | undefined {
  const claves = new Set(documentosEquivalentes(tipo, numero).map((d) => `${d.tipo}:${d.numero}`));
  return existentes.find(
    (e) => e.id !== excluirId && claves.has(`${e.tipo_documento}:${normalizarDocumento(e.numero_documento)}`),
  );
}

// -----------------------------------------------------------------------------
// Celular
// -----------------------------------------------------------------------------
/** Celular peruano normalizado (9 dígitos que empiezan en 9) o null. Acepta +51, espacios y guiones. */
export function normalizarCelular(valor: string): string | null {
  const v = valor.replace(/[\s()-]/g, "").replace(/^\+?51(?=9\d{8}$)/, "");
  return /^9\d{8}$/.test(v) ? v : null;
}

// -----------------------------------------------------------------------------
// Completitud del KYC
// -----------------------------------------------------------------------------
export interface DatosKyc {
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: unknown;
  sexo: string | null;
  estado_civil: string | null;
  telefono: string | null;
  email?: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  referencia: string | null;
  tipo_vivienda: string | null;
  latitud: number | string | null;
  longitud: number | string | null;
  ocupacion: string | null;
  ingreso_mensual: number | string | null;
}

/**
 * Lo que falta para que el expediente del cliente esté completo (vacío = completo).
 * Se usa para destacar pendientes en la ficha y para mantener `cliente.datos_incompletos`.
 */
export function faltantesCliente(c: DatosKyc, _documentos: readonly string[] = []): string[] {
  // Ficha simple: nombre, apellido, sexo, celular y correo. DNI, domicilio, trabajo, GPS y fotos son opcionales
  // (si se registra un DNI, debe ser válido).
  const falta: string[] = [];
  const vacio = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
  const tipo = c.tipo_documento as TipoDocumento;
  if (!esDocumentoProvisional(c.numero_documento) && TIPOS_DOCUMENTO.includes(tipo) && errorDocumento(tipo, c.numero_documento))
    falta.push("Número de DNI válido");
  if (vacio(c.sexo)) falta.push("Sexo");
  if (vacio(c.telefono) || !normalizarCelular(String(c.telefono))) falta.push("Celular");
  if (vacio(c.email)) falta.push("Correo");
  return falta;
}

// -----------------------------------------------------------------------------
// Permisos por rol (las políticas RLS de la base aplican lo mismo)
// -----------------------------------------------------------------------------
export const ROLES_EDITAN_KYC = ["SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS"] as const;
export type RolPanel = "SUPERADMIN" | "ADMIN_CREDITOS" | "ASESOR_VENTAS" | "COBRADOR";

/** Crear/editar clientes y garantes, subir documentos y registrar la ubicación. El COBRADOR solo consulta. */
export const puedeEditarKyc = (rol: RolPanel) => (ROLES_EDITAN_KYC as readonly string[]).includes(rol);

/** Bloqueo legal del cliente: solo administración. */
export const puedeBloquearCliente = (rol: RolPanel) => rol === "SUPERADMIN" || rol === "ADMIN_CREDITOS";

/** El COBRADOR solo ve la foto de la fachada (para ubicar el domicilio); el DNI y los recibos, no. */
export const puedeVerDocumento = (rol: RolPanel, tipo: TipoDocumentoKyc) => rol !== "COBRADOR" || tipo === "FACHADA";

// -----------------------------------------------------------------------------
// Ubicación y conversión de solicitudes
// -----------------------------------------------------------------------------
export const enlaceMapa = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const enlaceRuta = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Coordenadas dentro del Perú (aprox.): evita guardar 0,0 o coordenadas invertidas. */
export const coordenadasEnPeru = (lat: number, lng: number) => lat >= -18.5 && lat <= 0.1 && lng >= -81.5 && lng <= -68.5;

/** Estado civil del formulario web («Casado(a)») → enum de la BD. */
export function estadoCivilDesdeWeb(valor: string | null | undefined): (typeof ESTADOS_CIVILES)[number] | null {
  const v = (valor ?? "").toUpperCase();
  return ESTADOS_CIVILES.find((e) => v.startsWith(e)) ?? null;
}
