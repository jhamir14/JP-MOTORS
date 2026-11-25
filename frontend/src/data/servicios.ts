import type { ComponentType, SVGProps } from "react";
import { IconBanknote, IconMoto, IconPhone, IconWrench } from "@/components/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface Servicio {
  id: "prestamos" | "vehicular" | "celulares" | "repuestos";
  titulo: string;
  resumen: string;
  href: string;
  cta: string;
  Icon: Icon;
  puntos: string[];
  etiqueta?: string;
}

/** Los servicios que ofrece Inversiones JP, en el orden en que se muestran en la web. */
export const servicios: Servicio[] = [
  {
    id: "prestamos",
    titulo: "Préstamos en efectivo",
    resumen: "Capital de trabajo o una emergencia: dinero en tus manos con pagos diarios o semanales.",
    href: "/prestamos",
    cta: "Ver préstamos",
    Icon: IconBanknote,
    puntos: ["Desembolso rápido", "Pagos diarios o semanales", "Montos que crecen con tu historial"],
    etiqueta: "Más solicitado",
  },
  {
    id: "vehicular",
    titulo: "Crédito vehicular",
    resumen: "Motos lineales y mototaxis para trabajar, con cuotas mensuales y crédito directo, sin bancos.",
    href: "/motos",
    cta: "Ver vehículos",
    Icon: IconMoto,
    puntos: ["Motos Honda y Motokar", "Hasta 36 meses", "Inicial flexible"],
  },
  {
    id: "celulares",
    titulo: "Celulares a crédito",
    resumen: "Estrena iPhone, Samsung, Xiaomi u Honor pagando en cuotas semanales o quincenales.",
    href: "/celulares",
    cta: "Ver celulares",
    Icon: IconPhone,
    puntos: ["Todas las marcas", "Cuotas semanales", "Sin boletas de pago"],
  },
  {
    id: "repuestos",
    titulo: "Repuestos y accesorios",
    resumen: "Lubricantes, llantas, cascos y repuestos originales para mantener tu vehículo trabajando.",
    href: "/repuestos",
    cta: "Ver repuestos",
    Icon: IconWrench,
    puntos: ["Productos originales", "Pedido por WhatsApp", "Entrega coordinada"],
  },
];
