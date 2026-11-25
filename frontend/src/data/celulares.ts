/**
 * Catálogo de celulares (temporal: es el mismo que siembra la migración
 * database/migrations/20261125000400_datos_iniciales.sql; en la Fase 2 la web lo leerá de la BD).
 * Precios tomados del inventario real del sistema anterior.
 */

export const GAMAS = ["Gama trabajo", "Gama media", "Premium"] as const;
export type Gama = (typeof GAMAS)[number];

export interface Celular {
  slug: string;
  marca: "Apple" | "Samsung" | "Xiaomi" | "Honor";
  nombre: string;
  gama: Gama;
  precio: number;
  descripcion: string;
  destacado: boolean;
}

export const celulares: Celular[] = [
  { slug: "apple-iphone-16", marca: "Apple", nombre: "iPhone 16", gama: "Premium", precio: 3000, destacado: true,
    descripcion: "El iPhone más reciente con cámara de 48 MP y chip A18." },
  { slug: "apple-iphone-15-pro", marca: "Apple", nombre: "iPhone 15 Pro", gama: "Premium", precio: 3800, destacado: true,
    descripcion: "Titanio, chip A17 Pro y cámara profesional." },
  { slug: "apple-iphone-15", marca: "Apple", nombre: "iPhone 15", gama: "Premium", precio: 2700, destacado: false,
    descripcion: "Dynamic Island, USB-C y cámara de 48 MP." },
  { slug: "apple-iphone-13", marca: "Apple", nombre: "iPhone 13", gama: "Gama media", precio: 1850, destacado: false,
    descripcion: "Un clásico confiable con excelente batería y cámara dual." },
  { slug: "samsung-galaxy-s24-plus", marca: "Samsung", nombre: "Galaxy S24+", gama: "Premium", precio: 3000, destacado: false,
    descripcion: "Pantalla de 6.7\", Galaxy AI y cámara de 50 MP." },
  { slug: "samsung-galaxy-a56", marca: "Samsung", nombre: "Galaxy A56 5G", gama: "Gama media", precio: 1300, destacado: true,
    descripcion: "Gama media 5G con gran batería y años de actualizaciones." },
  { slug: "xiaomi-redmi-note-13-pro-5g", marca: "Xiaomi", nombre: "Redmi Note 13 Pro 5G", gama: "Gama media", precio: 1800, destacado: true,
    descripcion: "Cámara de 200 MP, pantalla AMOLED de 120 Hz y carga rápida." },
  { slug: "xiaomi-redmi-note-15", marca: "Xiaomi", nombre: "Redmi Note 15", gama: "Gama trabajo", precio: 900, destacado: false,
    descripcion: "Batería para todo el día a un precio accesible." },
  { slug: "honor-magic-7-lite", marca: "Honor", nombre: "Magic 7 Lite", gama: "Gama media", precio: 1250, destacado: false,
    descripcion: "Batería de larga duración y pantalla resistente a caídas." },
  { slug: "honor-x8c", marca: "Honor", nombre: "X8c", gama: "Gama trabajo", precio: 780, destacado: false,
    descripcion: "Delgado, liviano y con excelente relación precio-calidad." },
];

export const MARCAS_CELULAR = ["Apple", "Samsung", "Xiaomi", "Honor"] as const;
export const getCelularesDestacados = () => celulares.filter((c) => c.destacado);
