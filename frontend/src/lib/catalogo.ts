/**
 * Tipos y utilidades del catálogo público, compartidos por servidor y cliente.
 * Los datos vienen de PostgreSQL (lib/server/catalogo.ts) o, si no hay base de datos,
 * del respaldo estático (data/catalogoRespaldo.ts).
 */
import { calcularCredito, type Frecuencia, type ResultadoCredito, type TipoCalculo } from "./finance";

/** Categorías que se venden. (El enum de la base aún guarda REPUESTO por historial, pero ya no se usa.) */
export const CATEGORIAS = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA", "CELULAR"] as const;
export type CategoriaProducto = (typeof CATEGORIAS)[number];

export const CATEGORIAS_VEHICULO = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"] as const satisfies readonly CategoriaProducto[];

export const ETIQUETA_CATEGORIA: Record<CategoriaProducto, string> = {
  MOTO_LINEAL: "Moto lineal",
  TRIMOVIL_PASAJEROS: "Mototaxi de pasajeros",
  TRIMOVIL_CARGA: "Trimóvil de carga",
  CELULAR: "Celular",
};

export const GAMAS = ["Gama trabajo", "Gama media", "Premium"] as const;

export interface PlanPublico {
  id: string;
  nombre: string | null;
  cuotaInicial: number;
  numeroCuotas: number;
  frecuencia: Frecuencia;
  tipoCalculo: TipoCalculo;
  tasaPorcentaje: number | null;
  montoCuota: number | null;
}

export interface ImagenPublica {
  url: string;
  alt: string;
}

export interface Producto {
  id: string;
  slug: string;
  categoria: CategoriaProducto;
  marca: string;
  modelo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  specs: Record<string, string>;
  etiquetas: string[];
  destacado: boolean;
  imagenes: ImagenPublica[];
  planes: PlanPublico[];
  /** Unidades EN_STOCK registradas en el inventario (0 = a pedido). */
  stock: number;
}

export interface TasaPublica {
  servicio: "CREDITO_VEHICULAR" | "CREDITO_CELULAR";
  frecuencia: Frecuencia;
  tipoCalculo: TipoCalculo;
  tasaPorcentaje: number;
  cuotasMin: number;
  cuotasMax: number;
}

export const esVehiculo = (p: Pick<Producto, "categoria">) =>
  (CATEGORIAS_VEHICULO as readonly string[]).includes(p.categoria);

/** Ficha pública del producto (todas las líneas viven en /catalogo). */
export function hrefProducto(p: Pick<Producto, "slug">) {
  return `/catalogo/${p.slug}`;
}

/** Líneas que se muestran en la web pública (agrupan categorías del catálogo). */
export const LINEAS = [
  { id: "motos", nombre: "Motos", singular: "Moto", categorias: ["MOTO_LINEAL"] },
  { id: "mototaxis", nombre: "Mototaxis", singular: "Mototaxi", categorias: ["TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"] },
  { id: "celulares", nombre: "Celulares", singular: "Celular", categorias: ["CELULAR"] },
] as const satisfies readonly { id: string; nombre: string; singular: string; categorias: readonly CategoriaProducto[] }[];

export type LineaId = (typeof LINEAS)[number]["id"];

export const lineaDe = (p: Pick<Producto, "categoria">) =>
  LINEAS.find((l) => (l.categorias as readonly string[]).includes(p.categoria)) ?? LINEAS[0];

export const servicioDeProducto = (p: Pick<Producto, "categoria">) =>
  p.categoria === "CELULAR" ? "CREDITO_CELULAR" : "CREDITO_VEHICULAR";

/** Gama del celular según sus etiquetas (para filtros). */
export const gamaCelular = (p: Pick<Producto, "etiquetas">) =>
  p.etiquetas.find((e) => (GAMAS as readonly string[]).includes(e)) ?? "Gama media";

export const cilindrada = (p: Pick<Producto, "specs">) => {
  const n = parseFloat((p.specs["Cilindrada"] ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const resultadoPlan = (p: Pick<Producto, "precio">, plan: PlanPublico): ResultadoCredito =>
  calcularCredito({
    monto: p.precio,
    cuotaInicial: plan.cuotaInicial,
    numeroCuotas: plan.numeroCuotas,
    frecuencia: plan.frecuencia,
    tipoCalculo: plan.tipoCalculo,
    tasaPorcentaje: plan.tasaPorcentaje,
    montoCuota: plan.montoCuota,
  });

/** El plan publicado con la cuota más baja (el "desde" de las tarjetas). */
export function planDestacado(p: Producto): { plan: PlanPublico; resultado: ResultadoCredito } | null {
  let mejor: { plan: PlanPublico; resultado: ResultadoCredito } | null = null;
  for (const plan of p.planes) {
    const resultado = resultadoPlan(p, plan);
    if (resultado.cuota > 0 && (!mejor || resultado.cuota < mejor.resultado.cuota)) mejor = { plan, resultado };
  }
  return mejor;
}

export const normalizarTexto = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
