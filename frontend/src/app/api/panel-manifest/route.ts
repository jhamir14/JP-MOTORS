import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Manifest del panel para instalarlo como app (pantalla de inicio). En iPhone es requisito para
 * recibir avisos push. Solo se entrega con sesión iniciada: así no revela dónde está el panel.
 */
export async function GET() {
  if (!(await obtenerSesion())) return new NextResponse("No encontrado", { status: 404 });
  return NextResponse.json(
    {
      name: "Panel Inversiones JP",
      short_name: "Panel JP",
      start_url: "/admin",
      scope: "/",
      display: "standalone",
      background_color: "#071d45",
      theme_color: "#071d45",
      icons: [
        { src: "/iconos/panel-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/iconos/panel-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } },
  );
}
