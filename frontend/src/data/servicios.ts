import type { ComponentType, SVGProps } from "react";
import { IconMoto, IconPhone, IconWrench } from "@/components/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface Servicio {
  id: "vehicular" | "celulares" | "repuestos";
  titulo: string;
  resumen: string;
  href: string;
  cta: string;
  Icon: Icon;
  puntos: string[];
  etiqueta?: string;
  /** Foto de portada de la tarjeta (en /public). */
  imagen: { src: string; alt: string; sobreNegro?: boolean };
}

/** Los servicios que ofrece Inversiones JP, en el orden en que se muestran en la web. */
export const servicios: Servicio[] = [
  {
    id: "vehicular",
    titulo: "Crédito vehicular",
    resumen: "Motos lineales y mototaxis para trabajar, con cuotas mensuales y crédito directo, sin bancos.",
    href: "/catalogo?linea=motos",
    cta: "Ver vehículos",
    Icon: IconMoto,
    puntos: ["Motos Honda y Motokar", "Hasta 36 meses", "Inicial flexible"],
    etiqueta: "Más solicitado",
    imagen: { src: "/motos/gallery/gallery-3.webp", alt: "Moto Honda estacionada lista para trabajar" },
  },
  {
    id: "celulares",
    titulo: "Celulares a crédito",
    resumen: "Estrena iPhone, Samsung, Xiaomi u Honor pagando en cuotas semanales o quincenales.",
    href: "/catalogo?linea=celulares",
    cta: "Ver celulares",
    Icon: IconPhone,
    puntos: ["Todas las marcas", "Cuotas semanales", "Sin boletas de pago"],
    imagen: { src: "/celulares/celulares-escena.webp", alt: "Celulares de última generación" },
  },
  {
    id: "repuestos",
    titulo: "Repuestos y accesorios",
    resumen: "Lubricantes, llantas, cascos y repuestos originales para mantener tu vehículo trabajando.",
    href: "/catalogo?linea=repuestos",
    cta: "Ver repuestos",
    Icon: IconWrench,
    puntos: ["Productos originales", "Pedido por WhatsApp", "Entrega coordinada"],
    imagen: { src: "/repuestos/casco.webp", alt: "Casco para moto", sobreNegro: true },
  },
];
