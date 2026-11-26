import type { ReactNode } from "react";
import Script from "next/script";
import { siteConfig } from "@/lib/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import WhatsAppFloat from "@/components/WhatsAppFloat";

/** El espacio que necesita la barra inferior móvil lo reserva el propio pie (oscuro), para que no quede una franja clara al final.
 * Marco de la web pública: analítica, barra superior, pie, navegación móvil y botón de WhatsApp (el panel no lo usa). */
export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <div>
      {siteConfig.gaId && (
        <>
          <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`} />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${siteConfig.gaId}');`}
          </Script>
        </>
      )}
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
      <WhatsAppFloat />
    </div>
  );
}
