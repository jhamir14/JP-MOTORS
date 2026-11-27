/** Roles del personal (sin dependencias de servidor: se pueden importar desde lógica pura y tests). */
export const ROLES = ["SUPERADMIN", "ADMIN_CREDITOS", "ADMIN_MOTOS", "ADMIN_CELULARES", "COBRADOR", "ASESOR_VENTAS"] as const;
export type Rol = (typeof ROLES)[number];

/**
 * Roles que se pueden asignar desde «Personal». ASESOR_VENTAS queda solo para cuentas antiguas:
 * su trabajo lo hacen ahora los administradores de cada área (préstamos, motos y celulares).
 */
export const ROLES_ASIGNABLES = ["SUPERADMIN", "ADMIN_CREDITOS", "ADMIN_MOTOS", "ADMIN_CELULARES", "COBRADOR"] as const satisfies readonly Rol[];

export const ETIQUETA_ROL: Record<Rol, string> = {
  SUPERADMIN: "Superadministrador",
  ADMIN_CREDITOS: "Administrador de créditos",
  ADMIN_MOTOS: "Administrador de motos",
  ADMIN_CELULARES: "Administrador de celulares",
  COBRADOR: "Cobrador",
  ASESOR_VENTAS: "Asesor de ventas (antiguo)",
};

/** Administradores de área: cada uno gestiona solo su tipo de crédito (ver src/lib/areas.ts). */
export const ADMINS_AREA = ["ADMIN_CREDITOS", "ADMIN_MOTOS", "ADMIN_CELULARES"] as const satisfies readonly Rol[];
