/**
 * Tipos y utilidades del catálogo público, compartidos por servidor y cliente.
 * Los datos vienen de PostgreSQL (lib/server/catalogo.ts) o, si no hay base de datos,
 * del respaldo estático (data/catalogoRespaldo.ts).
 */
import { calcularCredito, type Frecuencia, type ResultadoCredito, type TipoCalculo } from "./finance";

export const CATEGORIAS = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA", "CELULAR", "REPUESTO"] as const;
export type CategoriaProducto = (typeof CATEGORIAS)[number];

export const CATEGORIAS_VEHICULO = ["MOTO_LINEAL", "TRIMOVIL_PASAJEROS", "TRIMOVIL_CARGA"] as const satisfies readonly CategoriaProducto[];

export const ETIQUETA_CATEGORIA: Record<CategoriaProducto, string> = {
  MOTO_LINEAL: "Moto lineal",
  TRIMOVIL_PASAJEROS: "Mototaxi de pasajeros",
  TRIMOVIL_CARGA: "Trimóvil de carga",
  CELULAR: "Celular",
  REPUESTO: "Repuesto",
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

export function hrefProducto(p: Pick<Producto, "categoria" | "slug" | "nombre">) {
  if (p.categoria === "CELULAR") return `/celulares/${p.slug}`;
  if (p.categoria === "REPUESTO") return `/repuestos?q=${encodeURIComponent(p.nombre)}`;
  return `/vehiculos/${p.slug}`;
}

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
