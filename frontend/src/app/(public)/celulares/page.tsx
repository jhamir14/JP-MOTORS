import type { Metadata } from "next";
import { PaginaCatalogo } from "@/components/public/PaginaCatalogo";

export const metadata: Metadata = {
  title: "Celulares",
  description: "Celulares nuevos iPhone, Samsung, Xiaomi y Honor en cuotas semanales sin inicial en Inversiones JP, Santa Anita (Lima).",
  alternates: { canonical: "/celulares" },
};

export const revalidate = 300;

export default async function CelularesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaCatalogo catalogo="celulares" searchParams={await searchParams} />;
}
