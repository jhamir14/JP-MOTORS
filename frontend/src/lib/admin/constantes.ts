/** Valores de los enums de la base de datos que usa el panel (deben coincidir con las migraciones). */

export const ESTADOS_SOLICITUD = ["NUEVA", "CONTACTADA", "EVALUADA", "CONVERTIDA", "DESCARTADA"] as const;
export const ESTADOS_RECLAMO = ["PENDIENTE", "EN_ATENCION", "RESPONDIDO"] as const;

export const ESTADOS_UNIDAD = ["EN_STOCK", "RESERVADO", "VENDIDO_CREDITO", "VENDIDO_CONTADO", "INCAUTADO_MORA", "DADO_DE_BAJA"] as const;
/** Estados que se pueden poner a mano desde el inventario (las ventas los asigna el módulo de créditos). */
export const ESTADOS_UNIDAD_MANUALES = ["EN_STOCK", "RESERVADO", "VENDIDO_CONTADO", "DADO_DE_BAJA"] as const;
export const CONDICIONES_UNIDAD = ["NUEVO", "SEMINUEVO", "USADO"] as const;
export const TIPOS_VEHICULO = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"] as const;
export const ESTADOS_GPS = ["SIN_GPS", "HABILITADO", "CORTADO_POR_MORA", "RETIRADO"] as const;
export const PLATAFORMAS_BLOQUEO = ["NINGUNA", "PAYJOY", "KNOX_GUARD", "TRUSTONIC", "MDM_PROPIO", "ICLOUD"] as const;
export const SISTEMAS_OPERATIVOS = ["ANDROID", "IOS", "OTRO"] as const;

export const SERVICIOS_CREDITO = ["CREDITO_VEHICULAR", "CREDITO_CELULAR", "PRESTAMO_EFECTIVO"] as const;
/** Lo que la empresa financia hoy. PRESTAMO_EFECTIVO solo existe en créditos migrados del sistema anterior. */
export const SERVICIOS_FINANCIAMIENTO = ["CREDITO_VEHICULAR", "CREDITO_CELULAR"] as const;
export const ETIQUETA_SERVICIO: Record<(typeof SERVICIOS_CREDITO)[number], string> = {
  CREDITO_VEHICULAR: "Crédito vehicular",
  CREDITO_CELULAR: "Crédito celular",
  PRESTAMO_EFECTIVO: "Préstamo de dinero",
};

export const legible = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
export const opcionesLegibles = (vals: readonly string[]) => vals.map((v) => ({ value: v, label: legible(v) }));
