import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { ConsentimientoCookies } from "@/components/ConsentimientoCookies";

/** El espacio que necesita la barra inferior móvil lo reserva el propio pie (oscuro), para que no quede una franja clara al final.
 * Marco de la web pública: analítica, barra superior, pie, navegación móvil y botón de WhatsApp (el panel no lo usa). */
export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
      <WhatsAppFloat />
      {/* Google Analytics se carga solo si el visitante acepta las cookies en el banner. */}
      <ConsentimientoCookies gaId={siteConfig.gaId || undefined} />
    </div>
  );
}
