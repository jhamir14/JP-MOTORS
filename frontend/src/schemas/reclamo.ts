import { z } from "zod";

/**
 * Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor, Ley 29571,
 * y su reglamento D.S. 011-2011-PCM). Se valida igual en el navegador y en /api/reclamos.
 *   · RECLAMO: disconformidad con el producto o servicio.
 *   · QUEJA:   malestar con la atención, sin relación directa con el producto o servicio.
 */

export const TIPOS_RECLAMO = ["RECLAMO", "QUEJA"] as const;
export const TIPOS_DOC_RECLAMO = ["DNI", "CE", "Pasaporte", "RUC"] as const;
export const TIPO_DOC_BD = { DNI: "DNI", CE: "CARNET_EXTRANJERIA", Pasaporte: "PASAPORTE", RUC: "RUC" } as const;
export const BIENES = ["PRODUCTO", "SERVICIO"] as const;

const texto = (campo: string, min = 2, max = 120) =>
  z.string().trim().min(min, `Ingresa ${campo}`).max(max, `Máximo ${max} caracteres`);

export const reclamoSchema = z
  .object({
    tipo: z.enum(TIPOS_RECLAMO),
    nombres: texto("tus nombres", 2, 60),
    apellidos: texto("tus apellidos", 2, 60),
    tipoDocumento: z.enum(TIPOS_DOC_RECLAMO),
    numeroDocumento: z.string().trim().toUpperCase(),
    domicilio: texto("tu domicilio", 5, 200),
    telefono: z.string().trim().regex(/^9\d{8}$|^0?\d{7,8}$/, "Ingresa un teléfono válido (celular de 9 dígitos)"),
    email: z.string().trim().email("Ingresa un correo válido").max(120),
    menorDeEdad: z.boolean(),
    apoderado: z.string().trim().max(120),
    bienTipo: z.enum(BIENES),
    bienMonto: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 1_000_000), "Usa solo números (ej. 1500.50)"),
    bienDescripcion: texto("qué producto o servicio contrataste", 3, 300),
    detalle: texto("el detalle", 10, 3000),
    pedido: texto("tu pedido", 5, 1500),
    aceptaDatos: z.literal(true, { errorMap: () => ({ message: "Debes autorizar el tratamiento de tus datos para registrar el reclamo" }) }),
  })
  .superRefine((d, ctx) => {
    const reglas: Record<(typeof TIPOS_DOC_RECLAMO)[number], [RegExp, string]> = {
      DNI: [/^\d{8}$/, "El DNI tiene 8 dígitos"],
      CE: [/^[A-Z0-9]{8,12}$/, "Carné de extranjería no válido"],
      Pasaporte: [/^[A-Z0-9]{6,12}$/, "Pasaporte no válido"],
      RUC: [/^(10|20)\d{9}$/, "El RUC tiene 11 dígitos y empieza en 10 o 20"],
    };
    const [re, msg] = reglas[d.tipoDocumento];
    if (!re.test(d.numeroDocumento)) ctx.addIssue({ code: "custom", path: ["numeroDocumento"], message: msg });
    if (d.menorDeEdad && d.apoderado.length < 5)
      ctx.addIssue({ code: "custom", path: ["apoderado"], message: "Si eres menor de edad, indica el nombre de tu padre, madre o apoderado" });
  });

export type Reclamo = z.infer<typeof reclamoSchema>;
