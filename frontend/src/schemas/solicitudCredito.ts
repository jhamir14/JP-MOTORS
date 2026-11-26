import { z } from "zod";

/**
 * Esquema único de la solicitud de crédito de la web.
 * Se usa en el navegador (mensajes inmediatos) y en el servidor (/api/solicitudes) para no confiar en el cliente.
 */

export const TIPOS_DOCUMENTO = ["DNI", "CE", "Pasaporte"] as const;
export const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a)", "Conviviente", "Divorciado(a)", "Viudo(a)"] as const;
export const NIVELES_EDUCACION = ["Primaria", "Secundaria", "Técnico", "Universitario"] as const;
export const PREFERENCIAS_CONTACTO = ["WhatsApp", "Llamada", "Correo"] as const;
/**
 * Mismos códigos que el enum `servicio_solicitud` de la base de datos.
 * La web solo financia productos (motos, motocar, toritos y celulares): no recibe solicitudes de préstamo en efectivo.
 */
export const SERVICIOS = ["CREDITO_VEHICULAR", "CREDITO_CELULAR"] as const;
export type Servicio = (typeof SERVICIOS)[number];
export const ETIQUETAS_SERVICIO: Record<Servicio, string> = {
  CREDITO_VEHICULAR: "Crédito vehicular (moto, motocar o torito)",
  CREDITO_CELULAR: "Celular a crédito",
};
export const SITUACIONES_LABORALES = ["Independiente", "Comerciante", "Transportista", "Dependiente"] as const;

const texto = (campo: string, max = 60) =>
  z.string().trim().min(2, `Ingresa ${campo}`).max(max, `${campo} es demasiado largo`);

const montoSoles = (campo: string, min: number) =>
  z
    .string()
    .trim()
    .min(1, `Ingresa ${campo}`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Usa solo números (ej. 1500 o 1500.50)")
    .refine((v) => Number(v) >= min, min > 0 ? `Debe ser mayor a S/ ${min - 1}` : "No puede ser negativo")
    .refine((v) => Number(v) <= 1_000_000, "Monto fuera de rango");

/** Monto que puede quedar vacío (se valida solo si se llena). */
const montoOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "Usa solo números (ej. 1500 o 1500.50)")
  .refine((v) => v === "" || Number(v) <= 1_000_000, "Monto fuera de rango");

const edad = (fechaIso: string, hoy = new Date()) => {
  const f = new Date(`${fechaIso}T00:00:00`);
  let años = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) años--;
  return años;
};

export const solicitudCreditoSchema = z
  .object({
    // 1. Personales
    nombres: texto("tus nombres"),
    apellidos: texto("tus apellidos"),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z.string().trim().toUpperCase(),
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa tu fecha de nacimiento")
      .refine((v) => edad(v) >= 18, "Debes ser mayor de 18 años")
      .refine((v) => edad(v) <= 80, "Revisa la fecha de nacimiento"),
    estadoCivil: z.enum(ESTADOS_CIVILES),
    nivelEducacion: z.enum(NIVELES_EDUCACION),
    // 2. Contacto
    celular: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?51/, ""))
      .refine((v) => /^9\d{8}$/.test(v), "Ingresa un celular peruano de 9 dígitos que empiece con 9"),
    correo: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
    preferenciaContacto: z.enum(PREFERENCIAS_CONTACTO),
    departamento: texto("el departamento", 40),
    provincia: texto("la provincia", 40),
    distrito: texto("el distrito", 60),
    // 3. Servicio solicitado
    servicio: z.enum(SERVICIOS),
    productoInteres: z.string().trim().max(80, "Máximo 80 caracteres"),
    montoInicial: montoOpcional,
    // 4. Perfil
    situacionLaboral: z.enum(SITUACIONES_LABORALES),
    ingresoMensual: montoSoles("tu ingreso mensual", 1),
    // Consentimiento (Ley 29733 de Protección de Datos Personales)
    aceptaDatos: z.literal(true, { errorMap: () => ({ message: "Debes autorizar el tratamiento de tus datos" }) }),
  })
  .superRefine((d, ctx) => {
    const reglas: Record<(typeof TIPOS_DOCUMENTO)[number], [RegExp, string]> = {
      DNI: [/^\d{8}$/, "El DNI debe tener 8 dígitos"],
      CE: [/^\d{9}$/, "El carné de extranjería debe tener 9 dígitos"],
      Pasaporte: [/^[A-Z0-9]{6,12}$/, "El pasaporte debe tener entre 6 y 12 letras o números"],
    };
    const [re, msg] = reglas[d.tipoDocumento];
    if (!re.test(d.numeroDocumento)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["numeroDocumento"], message: msg });

    if (d.productoInteres.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productoInteres"],
        message: d.servicio === "CREDITO_VEHICULAR" ? "Indica el modelo de moto, motocar o torito" : "Indica el modelo de celular",
      });
    }
  });

export type SolicitudCreditoInput = z.input<typeof solicitudCreditoSchema>;
export type SolicitudCredito = z.output<typeof solicitudCreditoSchema>;

/** Convierte los errores de Zod en { campo: primer mensaje }. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
