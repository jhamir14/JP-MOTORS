/**
 * Fase 9 · Matriz de permisos del panel por sección (una sola fuente de verdad).
 * La usan el menú (oculta lo que el rol no puede abrir) y cada página (requerirSeccion), y se documenta en
 * docs/FASE_9_PRODUCCION.md. Las ACCIONES (crear, anular, editar) tienen además sus propios roles
 * (ROLES_CREDITOS, ROLES_ANULAN_PAGOS, ROLES_EDITAN_KYC…) y la base aplica RLS: esto es la primera capa.
 */
import { ADMINS_AREA, ROLES, type Rol } from "@/lib/roles";

export const TODOS: readonly Rol[] = ROLES;
/** Superadmin y los tres administradores de área (cada uno ve solo su área: src/lib/areas.ts). */
const ADMINS: readonly Rol[] = ["SUPERADMIN", ...ADMINS_AREA];
/** Áreas con productos (catálogo e inventario): motos y celulares. ASESOR_VENTAS = cuentas antiguas. */
const PRODUCTOS: readonly Rol[] = ["SUPERADMIN", "ADMIN_MOTOS", "ADMIN_CELULARES", "ASESOR_VENTAS"];
/** Configuración general de la empresa: solo el superadmin (y las cuentas antiguas de ventas). */
const GENERAL: readonly Rol[] = ["SUPERADMIN", "ASESOR_VENTAS"];

export const SECCIONES = {
  inicio: { href: "/admin", label: "Inicio", roles: TODOS },
  reportes: { href: "/admin/reportes", label: "Reportes", roles: ADMINS },
  solicitudes: { href: "/admin/solicitudes", label: "Solicitudes web", roles: ["SUPERADMIN", ...ADMINS_AREA, "ASESOR_VENTAS"] as readonly Rol[] },
  clientes: { href: "/admin/clientes", label: "Clientes", roles: TODOS },
  creditos: { href: "/admin/creditos", label: "Créditos", roles: TODOS },
  cobranzas: { href: "/admin/cobranzas", label: "Cobranzas", roles: TODOS },
  pagos: { href: "/admin/pagos", label: "Pagos", roles: TODOS },
  caja: { href: "/admin/caja", label: "Caja", roles: ["SUPERADMIN", "ASESOR_VENTAS", "COBRADOR"] as readonly Rol[] },
  catalogo: { href: "/admin/catalogo", label: "Catálogo", roles: PRODUCTOS },
  inventario: { href: "/admin/inventario", label: "Inventario", roles: PRODUCTOS },
  tasas: { href: "/admin/tasas", label: "Tasas por servicio", roles: GENERAL },
  reclamos: { href: "/admin/reclamos", label: "Libro de Reclamaciones", roles: GENERAL },
  personal: { href: "/admin/personal", label: "Personal", roles: ["SUPERADMIN"] as readonly Rol[] },
  sistema: { href: "/admin/sistema", label: "Sistema", roles: ["SUPERADMIN"] as readonly Rol[] },
  cuenta: { href: "/admin/cuenta", label: "Mi cuenta", roles: TODOS },
} as const satisfies Record<string, { href: string; label: string; roles: readonly Rol[] }>;

export type Seccion = keyof typeof SECCIONES;

export const puedeVerSeccion = (rol: Rol, s: Seccion) => SECCIONES[s].roles.includes(rol);

/** Secciones visibles para un rol, en el orden del menú. */
export const seccionesDe = (rol: Rol): Seccion[] => (Object.keys(SECCIONES) as Seccion[]).filter((s) => puedeVerSeccion(rol, s));

/** Sección a la que pertenece una ruta del panel (la más específica), o null. */
export function seccionDeRuta(pathname: string): Seccion | null {
  let mejor: Seccion | null = null;
  for (const s of Object.keys(SECCIONES) as Seccion[]) {
    const href = SECCIONES[s].href;
    const coincide = href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname === href || pathname.startsWith(`${href}/`);
    if (coincide && (!mejor || href.length > SECCIONES[mejor].href.length)) mejor = s;
  }
  return mejor;
}
