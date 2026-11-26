/**
 * Respaldo estático del catálogo: es el mismo contenido que siembran las migraciones
 * (20261125000400_datos_iniciales.sql y 20261126000100_fase2_panel.sql).
 * Solo se usa si DATABASE_URL no está configurada (desarrollo local, CI) o si la base no responde,
 * para que la web pública nunca quede vacía. En producción los datos se editan desde /admin.
 */
import type { PlanPublico, Producto, TasaPublica } from "@/lib/catalogo";
import { fotoPorDefecto } from "./fotosProducto";

const planesVehiculo = (slug: string, precio: number): PlanPublico[] =>
  [12, 24].map((n) => ({
    id: `${slug}-${n}`,
    nombre: `${n} meses`,
    cuotaInicial: Math.round(precio * 0.2),
    numeroCuotas: n,
    frecuencia: "MENSUAL",
    tipoCalculo: "FRANCES",
    tasaPorcentaje: 2,
    montoCuota: null,
  }));

const planCelular = (slug: string): PlanPublico[] => [
  { id: `${slug}-16`, nombre: "16 semanas sin inicial", cuotaInicial: 0, numeroCuotas: 16, frecuencia: "SEMANAL", tipoCalculo: "FRANCES", tasaPorcentaje: 1.2, montoCuota: null },
];

type Base = Omit<Producto, "id" | "planes" | "stock" | "imagenes" | "modelo"> & { imagen?: string; modelo?: string };

const vehiculos: Base[] = [
  {
    slug: "honda-cb190r", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda CB190R", precio: 11966, destacado: true, etiquetas: ["Deportiva"],
    descripcion: "Naked street con espíritu racing: horquilla invertida dorada, inyección electrónica y frenos de disco en ambas ruedas.",
    specs: { Cilindrada: "184.4 cc", Transmisión: "5 velocidades", Alimentación: "Inyección electrónica", Frenos: "Disco / Disco", Potencia: "16.6 HP / 8,000 RPM", Peso: "141 kg" },
    imagen: "/motos/cb190r.webp",
  },
  {
    slug: "honda-cb125f-twister", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda CB125F Twister", precio: 7695.2, destacado: true, etiquetas: ["Trabajo", "Urbana"],
    descripcion: "Líneas deportivas y peso ligero para el día a día. Ideal como primera moto para trabajar y moverte por la ciudad.",
    specs: { Cilindrada: "124.8 cc", Transmisión: "4 velocidades", Alimentación: "Carburador", Frenos: "Disco / Tambor", Potencia: "8.38 HP / 7,500 RPM", Peso: "117 kg" },
    imagen: "/motos/cb125f.webp",
  },
  {
    slug: "honda-navi", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda Navi", precio: 5889.29, destacado: true, etiquetas: ["Urbana"],
    descripcion: "Mini scooter automática, liviana y muy económica en combustible: perfecta para el tráfico urbano.",
    specs: { Cilindrada: "109.19 cc", Transmisión: "Automática (V-Matic)", Alimentación: "Carburador", Frenos: "Tambor / Tambor", Potencia: "7.09 HP / 7,500 RPM", Peso: "101 kg" },
    imagen: "/motos/navi.webp",
  },
  {
    slug: "honda-motokar-gl150", categoria: "TRIMOVIL_PASAJEROS", marca: "Honda", nombre: "Honda Motokar GL150", precio: 14700, destacado: true, etiquetas: ["Trimóvil", "Trabajo"],
    descripcion: "El clásico motokar de pasajeros para trabajar en provincia y selva: motor 150 cc confiable y carreta techada.",
    specs: { Cilindrada: "150 cc", Uso: "Transporte de pasajeros", Condición: "0 km" },
    imagen: "/motos/nl150.webp",
  },
];

const cel = (slug: string, marca: string, nombre: string, precio: number, gama: string, destacado: boolean, descripcion: string, sistema = "Android"): Base => ({
  slug, categoria: "CELULAR", marca, nombre: marca === "Apple" ? nombre : `${marca} ${nombre}`, modelo: nombre, precio, destacado, etiquetas: [gama], descripcion,
  specs: { Sistema: sistema },
  imagen: fotoPorDefecto(slug),
});

const celulares: Base[] = [
  cel("apple-iphone-16", "Apple", "iPhone 16", 3000, "Premium", true, "El iPhone más reciente con cámara de 48 MP y chip A18. Llévalo en cuotas semanales.", "iOS"),
  cel("apple-iphone-15-pro", "Apple", "iPhone 15 Pro", 3800, "Premium", true, "Titanio, chip A17 Pro y cámara profesional. Disponible a crédito con inicial flexible.", "iOS"),
  cel("apple-iphone-15", "Apple", "iPhone 15", 2700, "Premium", false, "Dynamic Island, USB-C y cámara de 48 MP.", "iOS"),
  cel("apple-iphone-13", "Apple", "iPhone 13", 1850, "Gama media", false, "Un clásico confiable con excelente batería y cámara dual.", "iOS"),
  cel("samsung-galaxy-s24-plus", "Samsung", "Galaxy S24+", 3000, "Premium", false, "Pantalla de 6.7\", Galaxy AI y cámara de 50 MP."),
  cel("samsung-galaxy-a56", "Samsung", "Galaxy A56 5G", 1300, "Gama media", true, "Gama media 5G con gran batería y actualizaciones por años."),
  cel("xiaomi-redmi-note-13-pro-5g", "Xiaomi", "Redmi Note 13 Pro 5G", 1800, "Gama media", true, "Cámara de 200 MP, pantalla AMOLED de 120 Hz y carga rápida."),
  cel("xiaomi-redmi-note-15", "Xiaomi", "Redmi Note 15", 900, "Gama trabajo", false, "Batería para todo el día a un precio accesible."),
  cel("honor-magic-7-lite", "Honor", "Magic 7 Lite", 1250, "Gama media", false, "Batería de larga duración y pantalla resistente a caídas."),
  cel("honor-x8c", "Honor", "X8c", 780, "Gama trabajo", false, "Delgado, liviano y con excelente relación precio-calidad."),
];

export const catalogoRespaldo: Producto[] = [...vehiculos, ...celulares].map(({ imagen, modelo, ...b }) => ({
  ...b,
  id: b.slug,
  modelo: modelo ?? b.nombre.replace(`${b.marca} `, ""),
  imagenes: imagen ? [{ url: imagen, alt: b.nombre }] : [],
  planes: b.categoria === "CELULAR" ? planCelular(b.slug) : planesVehiculo(b.slug, b.precio),
  stock: 0,
}));

/** Espejo de las tasas públicas de tasa_servicio. */
export const tasasRespaldo: TasaPublica[] = [
  { servicio: "CREDITO_VEHICULAR", frecuencia: "MENSUAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2, cuotasMin: 6, cuotasMax: 36 },
  { servicio: "CREDITO_CELULAR", frecuencia: "SEMANAL", tipoCalculo: "FRANCES", tasaPorcentaje: 1.2, cuotasMin: 8, cuotasMax: 52 },
  { servicio: "CREDITO_CELULAR", frecuencia: "QUINCENAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2.4, cuotasMin: 4, cuotasMax: 24 },
];
