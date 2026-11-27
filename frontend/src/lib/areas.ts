/**
 * Áreas del negocio. Cada administrador de área ve y gestiona solo lo suyo:
 *   · Administrador de créditos  → préstamos de dinero (PRESTAMO_EFECTIVO)
 *   · Administrador de motos     → créditos de motos, motokar y toritos (CREDITO_VEHICULAR) y su catálogo/inventario
 *   · Administrador de celulares → créditos de celulares (CREDITO_CELULAR) y su catálogo/inventario
 * El superadministrador y el cobrador ven todas las áreas. La base de datos aplica la misma regla
 * al crear o modificar créditos (migración 20261212000200_administradores_por_area.sql).
 */
import type { Rol } from "@/lib/roles";

export const TIPOS_CREDITO = ["CREDITO_VEHICULAR", "CREDITO_CELULAR", "PRESTAMO_EFECTIVO"] as const;
export type TipoCredito = (typeof TIPOS_CREDITO)[number];

export const CATEGORIAS_VEHICULO = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"] as const;
export type InventarioArea = "vehiculos" | "celulares";

const AREA: Partial<Record<Rol, TipoCredito>> = {
  ADMIN_CREDITOS: "PRESTAMO_EFECTIVO",
  ADMIN_MOTOS: "CREDITO_VEHICULAR",
  ADMIN_CELULARES: "CREDITO_CELULAR",
};

export const ETIQUETA_AREA: Record<TipoCredito, string> = {
  PRESTAMO_EFECTIVO: "Préstamos de dinero",
  CREDITO_VEHICULAR: "Motos, motokar y toritos",
  CREDITO_CELULAR: "Celulares",
};

/** Tipo de crédito del que se encarga el rol, o null si ve todas las áreas. */
export const areaDe = (rol: Rol): TipoCredito | null => AREA[rol] ?? null;

/** Tipos de crédito que el rol puede ver y gestionar. */
export const tiposDe = (rol: Rol): TipoCredito[] => {
  const a = areaDe(rol);
  return a ? [a] : [...TIPOS_CREDITO];
};

export const puedeVerTipo = (rol: Rol, tipo: string) => (tiposDe(rol) as string[]).includes(tipo);

/** Inventarios (y categorías del catálogo) del rol. El de préstamos no tiene productos. */
export function inventariosDe(rol: Rol): InventarioArea[] {
  const a = areaDe(rol);
  if (a === "CREDITO_VEHICULAR") return ["vehiculos"];
  if (a === "CREDITO_CELULAR") return ["celulares"];
  if (a === "PRESTAMO_EFECTIVO") return [];
  return ["vehiculos", "celulares"];
}

/** Categorías del catálogo que el rol puede ver y editar. */
export function categoriasDe(rol: Rol): string[] {
  const inv = inventariosDe(rol);
  return [...(inv.includes("vehiculos") ? CATEGORIAS_VEHICULO : []), ...(inv.includes("celulares") ? ["CELULAR"] : [])];
}

/** Servicio de las solicitudes web que corresponde al rol (null = todas). */
export const servicioSolicitudDe = (rol: Rol): TipoCredito | null => areaDe(rol);
