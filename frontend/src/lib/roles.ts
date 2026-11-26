/** Roles del personal (sin dependencias de servidor: se pueden importar desde lógica pura y tests). */
export const ROLES = ["SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS", "COBRADOR"] as const;
export type Rol = (typeof ROLES)[number];
