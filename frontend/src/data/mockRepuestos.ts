export interface Repuesto {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  price: number;
  stock: boolean;
}

export const mockRepuestos: Repuesto[] = [
  // --- LUBRICANTES ---
  {
    id: 1,
    name: "Aceite Honda 10W-30 Sintético",
    brand: "Honda",
    category: "Lubricantes",
    description: "Aceite 100% sintético de última generación, ideal para modelos deportivos y motores de inyección electrónica. Máxima protección térmica.",
    image: "/repuestos/aceite_sintetico.png",
    price: 55.00,
    stock: true
  },
  {
    id: 2,
    name: "Aceite Honda 20W-50 Mineral",
    brand: "Honda",
    category: "Lubricantes",
    description: "Aceite mineral original Honda 4 tiempos, formulado para motores de trabajo rudo, motokars y motos de alto kilometraje.",
    image: "/repuestos/aceite.png",
    price: 40.00,
    stock: true
  },
  {
    id: 3,
    name: "Aceite Semi-Sintético 15W-40",
    brand: "Honda",
    category: "Lubricantes",
    description: "El equilibrio perfecto para scooters urbanas como la Navi o Dio. Protege el embrague automático de fricción extrema.",
    image: "/repuestos/aceite_scooter.png",
    price: 48.00,
    stock: true
  },
  
  // --- NEUMÁTICOS ---
  {
    id: 4,
    name: "Llanta Motokar Trasera Reforzada",
    brand: "Honda",
    category: "Neumáticos",
    description: "Cauchos traseros reforzados con lona de alta dureza para soportar carga pesada y terreno agreste en trimóviles comerciales.",
    image: "/repuestos/llantas.png",
    price: 135.00,
    stock: true
  },
  {
    id: 5,
    name: "Llanta Off-Road XR/Tornado",
    brand: "Honda",
    category: "Neumáticos",
    description: "Neumático con cocada profunda estilo enduro. Diseñado para ofrecer agarre máximo en barro, tierra y trocha.",
    image: "/repuestos/llanta_offroad.png",
    price: 180.00,
    stock: true
  },
  {
    id: 6,
    name: "Llanta Sport Lisa Trasera",
    brand: "Generico Premium",
    category: "Neumáticos",
    description: "Neumático de pista de perfil ancho, ideal para modelos tipo Pulsar NS200 o CB190R. Excelente agarre en asfalto seco y mojado.",
    image: "/repuestos/llanta_sport.png",
    price: 165.00,
    stock: true
  },
  {
    id: 7,
    name: "Llanta Scooter Perfil Bajo",
    brand: "Honda",
    category: "Neumáticos",
    description: "Neumático aro pequeño diseñado específicamente para Honda Navi, Dio o Yamaha NMAX. Alta maniobrabilidad urbana.",
    image: "/repuestos/llanta_scooter.png",
    price: 95.00,
    stock: true
  },

  // --- FILTROS ---
  {
    id: 8,
    name: "Filtro de Aire Original",
    brand: "Honda",
    category: "Filtros",
    description: "Filtro de aire de celulosa de alta densidad para retener impurezas y proteger el carburador e inyección.",
    image: "/repuestos/filtro.png",
    price: 35.00,
    stock: true
  },
  {
    id: 9,
    name: "Filtro de Aceite Deportivo",
    brand: "Honda",
    category: "Filtros",
    description: "Filtro de aceite magnético que retiene micro-partículas de metal del motor para extender la vida útil de la máquina.",
    image: "/repuestos/filtro_aceite.png",
    price: 25.00,
    stock: true
  },

  // --- FRENOS ---
  {
    id: 10,
    name: "Pastillas de Freno Delanteras",
    brand: "Honda",
    category: "Frenos",
    description: "Pastillas de freno de disco sinterizadas. Ofrecen una frenada potente y disipación de calor inmediata.",
    image: "/repuestos/zapatas.png",
    price: 55.00,
    stock: true
  },
  {
    id: 11,
    name: "Zapatas de Freno de Tambor",
    brand: "Honda",
    category: "Frenos",
    description: "Zapatas traseras originales que aseguran una frenada precisa y sin chirridos mecánicos. Larga duración.",
    image: "/repuestos/zapatas.png",
    price: 40.00,
    stock: true
  },

  // --- TRANSMISIÓN Y EMBRAGUE ---
  {
    id: 12,
    name: "Kit de Arrastre (Cadena, Corona, Piñón)",
    brand: "Honda",
    category: "Transmisión",
    description: "Kit completo original. Cadena reforzada con O-Rings, corona y piñón de acero de alta resistencia.",
    image: "/repuestos/cadena.png",
    price: 155.00,
    stock: true
  },
  {
    id: 13,
    name: "Cadena Reforzada Dorada",
    brand: "Generico Premium",
    category: "Transmisión",
    description: "Cadena de pase 428H con eslabones dorados y tratamiento térmico antidesgaste. Estética y rendimiento deportivo.",
    image: "/repuestos/cadena.png",
    price: 85.00,
    stock: true
  },
  {
    id: 14,
    name: "Kit de Discos de Embrague",
    brand: "Honda",
    category: "Transmisión",
    description: "Kit de discos de fricción Honda originales para garantizar una transferencia de potencia sin patinajes.",
    image: "/repuestos/disco.png",
    price: 65.00,
    stock: true
  },

  // --- SEGURIDAD ---
  {
    id: 15,
    name: "Casco Integral Deportivo",
    brand: "Honda",
    category: "Seguridad",
    description: "Casco cerrado aerodinámico, certificación DOT. Visor anti-rayaduras y ventilación dinámica para pistas rápidas.",
    image: "/repuestos/casco.png",
    price: 185.00,
    stock: true
  },
  {
    id: 16,
    name: "Casco Abierto Urbano",
    brand: "Generico Premium",
    category: "Seguridad",
    description: "Casco 3/4 ideal para ciudad y clima cálido. Excelente visión periférica y gran comodidad interna.",
    image: "/repuestos/casco_abierto.png",
    price: 120.00,
    stock: true
  },
  {
    id: 17,
    name: "Casco Motocross Enduro",
    brand: "Generico Premium",
    category: "Seguridad",
    description: "Casco agresivo off-road con mentonera prominente y visera extendida. Máxima protección contra piedras y barro.",
    image: "/repuestos/casco_motocross.png",
    price: 210.00,
    stock: true
  },

  // --- ELÉCTRICO Y CABLES ---
  {
    id: 18,
    name: "Bujía NGK Iridium Racing",
    brand: "NGK",
    category: "Eléctrico",
    description: "Bujía de punta de iridio. Arranque más rápido, mejor aceleración y combustión eficiente. Triplica la vida útil.",
    image: "/repuestos/bujia.png",
    price: 45.00,
    stock: true
  },
  {
    id: 19,
    name: "Bujía Estándar Cobre",
    brand: "Honda",
    category: "Eléctrico",
    description: "Bujía original Honda de núcleo de cobre, reemplazo económico y confiable para uso diario.",
    image: "/repuestos/bujia.png",
    price: 18.00,
    stock: true
  },
  {
    id: 20,
    name: "Cable de Embrague Acero",
    brand: "Honda",
    category: "Cables",
    description: "Cable original trenzado con funda recubierta en teflón para un accionamiento de embrague suave y preciso.",
    image: "/repuestos/cable.png",
    price: 28.00,
    stock: true
  },
  {
    id: 21,
    name: "Cable de Acelerador Dual",
    brand: "Honda",
    category: "Cables",
    description: "Conjunto de cables de aceleración (push/pull) originales para una respuesta instantánea al puño.",
    image: "/repuestos/cable.png",
    price: 32.00,
    stock: true
  }
];
