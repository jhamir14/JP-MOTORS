import type { Metadata } from "next";
import { PaginaCatalogo } from "@/components/public/PaginaCatalogo";

export const metadata: Metadata = {
  title: "Motos, motocar y toritos",
  description: "Motos lineales, motocar y toritos nuevos con financiamiento directo en Inversiones JP, Santa Anita (Lima). Consulta con un asesor por WhatsApp.",
  alternates: { canonical: "/motos" },
};

export const revalidate = 300;

export default async function MotosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaCatalogo catalogo="vehiculos" searchParams={await searchParams} />;
}
