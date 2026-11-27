/**
 * Respaldo estático del catálogo: es el mismo contenido que siembran las migraciones
 * (20261125000400_datos_iniciales.sql y 20261126000100_fase2_panel.sql).
 * Solo se usa si DATABASE_URL no está configurada (desarrollo local, CI) o si la base no responde,
 * para que la web pública nunca quede vacía. En producción los datos se editan desde /admin.
 */
import type { PlanPublico, Producto, TasaPublica } from "@/lib/catalogo";
import { cotizarCelularJP, gamaCelular, planJP, plazosCelular, slugCelular, specsCelular } from "@/lib/celularesJP";
import { CELULARES_JP } from "./celularesJP";
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

/** Plan JP del celular: el de la lista oficial, o el que da la metodología según su precio. */
const planCelular = (slug: string, precio: number): PlanPublico[] => {
  const oficial = CELULARES_JP.find((c) => slugCelular(c) === slug);
  const g = gamaCelular(precio);
  // Misma inicial de la lista oficial, en el plazo sugerido (cuota pequeña): igual que la migración 20261213000100.
  const inicial = oficial?.inicial ?? g.inicial;
  const c = cotizarCelularJP(precio, inicial, plazosCelular(precio, inicial, g.tasaMensual).sugerido, g.tasaMensual);
  const p = planJP(c);
  return [{ id: `${slug}-jp`, nombre: p.nombre, cuotaInicial: p.cuota_inicial, numeroCuotas: p.numero_cuotas, frecuencia: "SEMANAL", tipoCalculo: "FLAT", tasaPorcentaje: p.tasa_porcentaje, montoCuota: p.monto_cuota }];
};

type Base = Omit<Producto, "id" | "planes" | "stock" | "imagenes" | "modelo"> & { imagen?: string; modelo?: string };

const vehiculos: Base[] = [
  {
    slug: "honda-cb190r", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda CB190R", precio: 11966, destacado: true, etiquetas: ["Deportiva"],
    descripcion: "Naked street con espíritu racing: horquilla invertida dorada, inyección electrónica y frenos de disco en ambas ruedas.",
    specs: { Cilindrada: "184.4 cc", Transmisión: "5 velocidades", Alimentación: "Inyección electrónica", Frenos: "Disco / Disco", Potencia: "16.6 HP / 8,000 RPM", Peso: "141 kg" },
    imagen: "/motos/modelos/honda-cb190r.webp",
  },
  {
    slug: "honda-cb125f-twister", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda CB125F Twister", precio: 7695.2, destacado: true, etiquetas: ["Trabajo", "Urbana"],
    descripcion: "Líneas deportivas y peso ligero para el día a día. Ideal como primera moto para trabajar y moverte por la ciudad.",
    specs: { Cilindrada: "124.8 cc", Transmisión: "4 velocidades", Alimentación: "Carburador", Frenos: "Disco / Tambor", Potencia: "8.38 HP / 7,500 RPM", Peso: "117 kg" },
    imagen: "/motos/modelos/honda-cb125f-twister.webp",
  },
  {
    slug: "honda-navi", categoria: "MOTO_LINEAL", marca: "Honda", nombre: "Honda Navi", precio: 5889.29, destacado: true, etiquetas: ["Urbana"],
    descripcion: "Mini scooter automática, liviana y muy económica en combustible: perfecta para el tráfico urbano.",
    specs: { Cilindrada: "109.19 cc", Transmisión: "Automática (V-Matic)", Alimentación: "Carburador", Frenos: "Tambor / Tambor", Potencia: "7.09 HP / 7,500 RPM", Peso: "101 kg" },
    imagen: "/motos/modelos/honda-navi.webp",
  },
  {
    slug: "honda-motokar-gl150", categoria: "TRIMOVIL_PASAJEROS", marca: "Honda", nombre: "Honda Motokar GL150", precio: 8800, destacado: true, etiquetas: ["Trimóvil", "Trabajo"],
    descripcion: "El clásico motokar de pasajeros para trabajar en provincia y selva: motor 150 cc confiable y carreta techada.",
    specs: { Cilindrada: "150 cc", Uso: "Transporte de pasajeros", Condición: "0 km" },
    imagen: "/motos/modelos/honda-motokar-gl150.webp",
  },
  {
    slug: "honda-motokar-gl125", categoria: "TRIMOVIL_PASAJEROS", marca: "Honda", nombre: "Honda Motokar GL125", precio: 8000, destacado: true, etiquetas: ["Trimóvil", "Trabajo"],
    descripcion: "Motokar de pasajeros con el motor Honda 125 cc de siempre: económico, resistente y listo para trabajar desde el primer día.",
    specs: { Cilindrada: "125 cc", Uso: "Transporte de pasajeros", Condición: "0 km" },
    imagen: "/motos/modelos/honda-motokar-gl125.webp",
  },
];

const cel = (slug: string, marca: string, nombre: string, precio: number, gama: string, destacado: boolean, descripcion: string, sistema = "Android"): Base => ({
  slug, categoria: "CELULAR", marca, nombre: marca === "Apple" ? nombre : `${marca} ${nombre}`, modelo: nombre, precio, destacado, etiquetas: [gama], descripcion,
  specs: { Sistema: sistema },
  imagen: fotoPorDefecto(slug),
});

/** Los 38 modelos oficiales (src/data/celularesJP.ts) + los 4 anteriores que siguen en el catálogo. */
const DESTACADOS = new Set(["apple-iphone-16", "apple-iphone-17-pro-max", "samsung-galaxy-a56", "xiaomi-redmi-note-14-pro-5g", "honor-400-5g"]);
const celulares: Base[] = [
  ...CELULARES_JP.map((c): Base => {
    const slug = slugCelular(c);
    return {
      slug, categoria: "CELULAR", marca: c.marca, nombre: c.nombre, modelo: c.nombre.replace(new RegExp(`^${c.marca}\\s+`, "i"), ""),
      precio: c.precio, destacado: DESTACADOS.has(slug), etiquetas: [gamaCelular(c.precio).nombre], descripcion: null,
      specs: specsCelular(c.specs, c.marca), imagen: fotoPorDefecto(slug),
    };
  }),
  cel("apple-iphone-15-pro", "Apple", "iPhone 15 Pro", 3800, "Premium", false, "Titanio, chip A17 Pro y cámara profesional. Disponible a crédito con inicial flexible.", "iOS"),
  cel("apple-iphone-13", "Apple", "iPhone 13", 1850, "Gama media", false, "Un clásico confiable con excelente batería y cámara dual.", "iOS"),
  cel("samsung-galaxy-s24-plus", "Samsung", "Galaxy S24+", 3000, "Premium", false, "Pantalla de 6.7\", Galaxy AI y cámara de 50 MP."),
  cel("xiaomi-redmi-note-13-pro-5g", "Xiaomi", "Redmi Note 13 Pro 5G", 1800, "Gama media", false, "Cámara de 200 MP, pantalla AMOLED de 120 Hz y carga rápida."),
];

export const catalogoRespaldo: Producto[] = [...vehiculos, ...celulares].map(({ imagen, modelo, ...b }) => ({
  ...b,
  id: b.slug,
  modelo: modelo ?? b.nombre.replace(`${b.marca} `, ""),
  imagenes: imagen ? [{ url: imagen, alt: b.nombre }] : [],
  planes: b.categoria === "CELULAR" ? planCelular(b.slug, b.precio) : planesVehiculo(b.slug, b.precio),
  stock: 0,
}));

/** Espejo de las tasas públicas de tasa_servicio. */
export const tasasRespaldo: TasaPublica[] = [
  // Motokar GL150: S/ 8,800 al contado, S/ 1,000 de inicial + 400 cuotas diarias de S/ 33 ⇒ 0.290 % diario (francés). Igual para todos los vehículos.
  { servicio: "CREDITO_VEHICULAR", frecuencia: "DIARIO", tipoCalculo: "FRANCES", tasaPorcentaje: 0.29, cuotasMin: 100, cuotasMax: 400 },
  { servicio: "CREDITO_CELULAR", frecuencia: "SEMANAL", tipoCalculo: "FRANCES", tasaPorcentaje: 1.2, cuotasMin: 8, cuotasMax: 52 },
  { servicio: "CREDITO_CELULAR", frecuencia: "QUINCENAL", tipoCalculo: "FRANCES", tasaPorcentaje: 2.4, cuotasMin: 4, cuotasMax: 24 },
];
