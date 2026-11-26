/**
 * Catálogo oficial de celulares de Inversiones JP (38 modelos, traído del sistema anterior).
 * Cargado en la base por la migración 20261211000100_catalogo_celulares_jp.sql
 * (generada con `node scripts/generar-catalogo-celulares.mjs`); la prueba
 * src/lib/__tests__/celularesJP.test.ts comprueba que la fórmula da exactamente estas cuotas.
 */
export interface CelularJP {
  /** Enlace ya existente en la web (para no romperlo); si falta, se arma con marca + nombre. */
  slug?: string;
  marca: string;
  nombre: string;
  specs: string;
  precio: number;
  inicial: number;
  tasaMensual: number;
  semanas: number;
  cuota: number;
  totalPagado: number;
}

export const CELULARES_JP: CelularJP[] = [
  // Apple
  { marca: "Apple", nombre: "iPhone 15", specs: "6GB RAM | 128GB | 5G | A16 Bionic | 6.1\" OLED | 48+12 MP", precio: 2800, inicial: 300, tasaMensual: 7.5, semanas: 29, cuota: 133, totalPagado: 4157 },
  { marca: "Apple", nombre: "iPhone 16", specs: "8GB RAM | 128GB | 5G | A18 Bionic | 6.1\" OLED | 48+12 MP", precio: 3000, inicial: 300, tasaMensual: 7.5, semanas: 32, cuota: 135, totalPagado: 4620 },
  { marca: "Apple", nombre: "iPhone 16 Pro Max", specs: "8GB RAM | 256GB | 5G | A18 Pro | 6.9\" 120Hz | 48+48+12 MP Tele 5x", precio: 4200, inicial: 500, tasaMensual: 5, semanas: 30, cuota: 170, totalPagado: 5600 },
  { marca: "Apple", nombre: "iPhone 17", specs: "8GB RAM | 256GB | 5G | A19 Bionic | 6.3\" 120Hz | 48+48 MP", precio: 3500, inicial: 300, tasaMensual: 5, semanas: 35, cuota: 131, totalPagado: 4885 },
  { marca: "Apple", nombre: "iPhone 17 Pro", specs: "12GB RAM | 256GB | 5G | A19 Pro | 6.3\" 120Hz | 48+48+48 MP Tele 5x", precio: 4950, inicial: 300, tasaMensual: 5, semanas: 40, cuota: 174, totalPagado: 7260 },
  { marca: "Apple", nombre: "iPhone 17 Pro Max", specs: "12GB RAM | 256GB | 5G | A19 Pro | 6.9\" 120Hz | 48+48+48 MP Tele 5x", precio: 4600, inicial: 500, tasaMensual: 5, semanas: 32, cuota: 179, totalPagado: 6228 },
  { marca: "Apple", nombre: "iPhone 18 Pro Max", specs: "12GB RAM | 256GB | 5G | A20 Pro | 6.9\" 120Hz | 48+48+48 MP Zoom 10x", precio: 6400, inicial: 500, tasaMensual: 5, semanas: 38, cuota: 229, totalPagado: 9202 },
  // Samsung
  { marca: "Samsung", nombre: "Samsung Galaxy A17 4G", specs: "8GB RAM | 256GB | 4G | Helio G99 | 6.7\" 90Hz | 50 MP OIS | 5000 mAh", precio: 950, inicial: 150, tasaMensual: 15, semanas: 16, cuota: 80, totalPagado: 1430 },
  { marca: "Samsung", nombre: "Samsung Galaxy A27 5G", specs: "6GB RAM | 128GB | 5G | Snapdragon 6 Gen 3 | 6.7\" 120Hz | 50 MP OIS", precio: 1150, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 88, totalPagado: 1558 },
  { marca: "Samsung", nombre: "Samsung Galaxy A36 5G", specs: "6GB RAM | 128GB | 5G | Snapdragon 6 Gen 3 | 6.7\" 120Hz | 50 MP OIS | 45W", precio: 1250, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 96, totalPagado: 1686 },
  { marca: "Samsung", nombre: "Samsung Galaxy A54 5G", specs: "8GB RAM | 256GB | 5G | Exynos 1380 | 6.4\" 120Hz | 50 MP OIS | IP67", precio: 1350, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 105, totalPagado: 1830 },
  { slug: "samsung-galaxy-a56", marca: "Samsung", nombre: "Samsung Galaxy A56 5G", specs: "12GB RAM | 256GB | 5G | Exynos 1580 | 6.7\" 120Hz | 50 MP OIS | IP67 | 45W", precio: 1600, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 116, totalPagado: 2056 },
  { marca: "Samsung", nombre: "Samsung Galaxy A57 5G", specs: "8GB RAM | 256GB | 5G | Exynos 1680 | 6.7\" 120Hz | 50 MP OIS | IP68 | 45W", precio: 1800, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 132, totalPagado: 2312 },
  // ZTE / Nubia
  { marca: "ZTE", nombre: "Nubia Neo 3 GT", specs: "8GB RAM | 256GB | 5G | Unisoc T9100 | OLED 120Hz | 6000 mAh | 80W", precio: 950, inicial: 150, tasaMensual: 15, semanas: 16, cuota: 80, totalPagado: 1430 },
  { marca: "ZTE", nombre: "Nubia Air 5G", specs: "8GB RAM | 256GB | 5G | UNISOC 5G | 6.78\" 1.5K 120Hz | IP68/IP69/IP69K", precio: 1000, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 74, totalPagado: 1334 },
  { marca: "ZTE", nombre: "Nubia Neo 5 5G", specs: "8GB RAM | 256GB | 5G | Unisoc T9300 | 6.8\" 120Hz | 6050 mAh | 45W", precio: 1100, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 83, totalPagado: 1478 },
  { marca: "ZTE", nombre: "Nubia Focus 2 Ultra", specs: "8GB RAM | 512GB | 5G | Sensor 1/1.55\" con Anillo Reflex | 5000 mAh | 33W", precio: 1150, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 88, totalPagado: 1558 },
  { marca: "ZTE", nombre: "Nubia Focus Pro 5G", specs: "8GB RAM | 256GB | 5G | Cámara 108 MP OIS | Kit Fotográfico Pro | 33W", precio: 1200, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 92, totalPagado: 1622 },
  { marca: "ZTE", nombre: "Nubia Neo 5 GT 5G", specs: "12GB RAM | 256GB | 5G | Dimensity 7400 | Ventilador Activo | 144Hz | 80W", precio: 1250, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 96, totalPagado: 1686 },
  // Honor
  { marca: "Honor", nombre: "Honor X7D 5G", specs: "6GB RAM | 256GB | 5G | Snapdragon 6s Gen 3 | 6500 mAh | Botón IA", precio: 1000, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 74, totalPagado: 1334 },
  { slug: "honor-x8c", marca: "Honor", nombre: "Honor X8C 5G", specs: "8GB RAM | 256GB | 5G | Dimensity 7025-Ultra | 108 MP | AMOLED FHD+", precio: 1150, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 88, totalPagado: 1558 },
  { marca: "Honor", nombre: "Honor 400 Lite 5G", specs: "12GB RAM | 256GB | 5G | Dimensity 7025-Ultra | 108 MP | AMOLED 120Hz | IP65", precio: 1400, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 109, totalPagado: 1894 },
  { marca: "Honor", nombre: "Honor Magic 7 Lite", specs: "8GB RAM | 256GB | 5G | Snapdragon 6 Gen 1 | 108 MP OIS | 6600 mAh | 66W", precio: 1700, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 124, totalPagado: 2184 },
  { marca: "Honor", nombre: "Honor Magic 8 Lite", specs: "8GB RAM | 512GB | 5G | Snapdragon 6 Gen 4 | Batería Récord 8300 mAh | IP69K", precio: 1800, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 132, totalPagado: 2312 },
  { marca: "Honor", nombre: "Honor 400 5G", specs: "12GB RAM | 512GB | 5G | Snapdragon 7 Gen 3 | 200 MP OIS | 6000 mAh | 80W", precio: 1900, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 140, totalPagado: 2440 },
  { marca: "Honor", nombre: "Honor 400 Pro 5G", specs: "12GB RAM | 512GB | 5G | Snapdragon 8s Gen 3 | 50+50+12 MP | 100W | Retrato Harcourt", precio: 2600, inicial: 300, tasaMensual: 7.5, semanas: 16, cuota: 187, totalPagado: 3292 },
  // Xiaomi & Poco
  { marca: "Xiaomi", nombre: "Redmi Note 14", specs: "6GB RAM | 128GB | 4G | Helio G99-Ultra | 108 MP | 120Hz | 5500 mAh", precio: 900, inicial: 120, tasaMensual: 15, semanas: 16, cuota: 78, totalPagado: 1368 },
  { slug: "xiaomi-redmi-note-15", marca: "Xiaomi", nombre: "Redmi Note 15 4G", specs: "8GB RAM | 256GB | 4G | Helio G100-Ultra | 108 MP | 6000 mAh | 33W", precio: 1050, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 79, totalPagado: 1414 },
  { marca: "Xiaomi", nombre: "Redmi Note 14 Pro 5G", specs: "8GB RAM | 256GB | 5G | Dimensity 7300-Ultra | 200 MP OIS | IP68 | 45W", precio: 1250, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 96, totalPagado: 1686 },
  { marca: "Xiaomi", nombre: "Redmi Note 15 Pro 4G", specs: "12GB RAM | 512GB | 4G | Helio G200-Ultra | 200 MP OIS | 6500 mAh | 45W", precio: 1500, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 118, totalPagado: 2038 },
  { marca: "Xiaomi", nombre: "Poco X7 Pro", specs: "12GB RAM | 512GB | 5G | Dimensity 8400-Ultra | 1.5K 120Hz | 6000 mAh | 90W | IP68", precio: 1450, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 114, totalPagado: 1974 },
  { marca: "Xiaomi", nombre: "Poco X8 Pro", specs: "12GB RAM | 512GB | 5G | Dimensity 8500-Ultra | 100W | 6500 mAh | IP68", precio: 1650, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 120, totalPagado: 2120 },
  // Motorola
  { marca: "Motorola", nombre: "Moto G56 5G", specs: "8GB RAM | 256GB | 5G | Dimensity 7060 | 50 MP | Selfie 32 MP | IP68/IP69", precio: 1050, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 79, totalPagado: 1414 },
  { marca: "Motorola", nombre: "Moto G77 5G", specs: "8GB RAM | 256GB | 5G | Dimensity 6400 | 108 MP | pOLED 1.5K 120Hz | Gemini", precio: 1400, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 109, totalPagado: 1894 },
  { marca: "Motorola", nombre: "Moto Edge 50 Fusión", specs: "8GB RAM | 256GB | 5G | Snapdragon 7s Gen 2 | Sony Lytia 50 MP OIS | 144Hz | 68W", precio: 1450, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 114, totalPagado: 1974 },
  { marca: "Motorola", nombre: "Moto G86 Power", specs: "8GB RAM | 256GB | 5G | Dimensity 7300 | 6720 mAh | 50 MP OIS | IP68/IP69", precio: 1500, inicial: 150, tasaMensual: 10, semanas: 16, cuota: 118, totalPagado: 2038 },
  { marca: "Motorola", nombre: "Moto Edge 70 Fusión", specs: "8GB RAM | 256GB | 5G | Snapdragon 7s Gen 3 | 7000 mAh | 68W | 144Hz | IP68/IP69", precio: 1650, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 120, totalPagado: 2120 },
  { marca: "Motorola", nombre: "Moto Edge 50 + Buds (Combo)", specs: "12GB RAM | 256GB | 5G | Snapdragon 7 Gen 1 AE | Telefoto | Audífonos Buds incluidos", precio: 1700, inicial: 200, tasaMensual: 8, semanas: 16, cuota: 124, totalPagado: 2184 },
];
