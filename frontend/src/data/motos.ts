/**
 * Catálogo de motos (temporal, hasta la Fase 1 en que pasa a la base de datos).
 * - `destacado`: aparece en la portada (reemplaza al antiguo filtro por ids [1, 6, 11]).
 * - `categoria`: debe ser uno de MOTO_CATEGORIAS; los filtros se construyen a partir de esta lista.
 */

export const MOTO_CATEGORIAS = ["Urbana", "Deportiva", "Todo Terreno", "Trabajo", "Trimóvil"] as const;
export type MotoCategoria = (typeof MOTO_CATEGORIAS)[number];

export interface Moto {
  id: number;
  nombre: string;
  marca: string;
  categoria: MotoCategoria;
  cc: number;
  peso: string;
  precio: number;
  precioUsd: number;
  imagen: string;
  descripcion: string;
  destacado: boolean;
  specs: Record<string, string>;
  galeria: string[];
}

const GALERIA_GENERICA = [
  "/motos/gallery/gallery-1.webp",
  "/motos/gallery/gallery-2.webp",
  "/motos/gallery/gallery-3.webp",
  "/motos/gallery/gallery-4.webp",
];

export const motos: Moto[] = [
  {
    id: 1,
    nombre: "CB190R 2024",
    marca: "Honda",
    categoria: "Deportiva",
    cc: 184.4,
    peso: "141 kg",
    precio: 11966,
    precioUsd: 3149,
    imagen: "/motos/cb190r.webp",
    descripcion:
      "Naked street con espíritu Racing. Su horquilla dorada invertida y look de moto mucho más pesada detienen miradas en cada semáforo, con un frenado perfecto.",
    destacado: true,
    specs: {
      Transmisión: "5 velocidades",
      Alimentación: "Inyección electrónica",
      Llantas: "Del: 110/70R17 - Tras: 140/70R17",
      Frenos: "Disco / Disco",
      Potencia: "16.6 HP / 8,000 RPM",
    },
    galeria: GALERIA_GENERICA,
  },
  {
    id: 2,
    nombre: "CB125F Twister",
    marca: "Honda",
    categoria: "Deportiva",
    cc: 124.8,
    peso: "117 kg",
    precio: 7695.2,
    precioUsd: 2024,
    imagen: "/motos/cb125f.webp",
    descripcion:
      "De líneas deportivas y diseño Street Naked, pero ligera para el conductor diario. Una propuesta ideal como primera moto para abrirte paso de lunes a viernes.",
    destacado: true,
    specs: {
      Transmisión: "4 velocidades",
      Alimentación: "Carburador",
      Llantas: "80/100-18M / 90/90-18M",
      Frenos: "Disco / Tambor",
      Potencia: "8.38 HP / 7,500 RPM",
    },
    galeria: GALERIA_GENERICA,
  },
  {
    id: 3,
    nombre: "Navi",
    marca: "Honda",
    categoria: "Urbana",
    cc: 109.19,
    peso: "101 kg",
    precio: 5889.29,
    precioUsd: 1549,
    imagen: "/motos/navi.webp",
    descripcion:
      "Una mini scooter revolucionaria y súper divertida. Ideal para moverse fácilmente por el denso tráfico urbano gracias a su bajísimo peso y excelente rendimiento de combustible.",
    destacado: true,
    specs: {
      Transmisión: "Automática (V-Matic)",
      Alimentación: "Carburador",
      Llantas: "90/90-12 / 90/100-10",
      Frenos: "Tambor / Tambor",
      Potencia: "7.09 HP / 7,500 RPM",
    },
    galeria: GALERIA_GENERICA,
  },
];

export const getMotoById = (id: number) => motos.find((m) => m.id === id);
export const getMotosDestacadas = () => motos.filter((m) => m.destacado);
/** Categorías que realmente tienen productos (para no mostrar filtros que siempre dan 0). */
export const getCategoriasConStock = () => MOTO_CATEGORIAS.filter((c) => motos.some((m) => m.categoria === c));
export const PRECIO_MAXIMO_CATALOGO = Math.ceil(Math.max(...motos.map((m) => m.precio)) / 1000) * 1000;
