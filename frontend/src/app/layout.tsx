import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";

// Archivo variable con eje de ancho: los titulares usan la versión expandida (como el logotipo).
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: { icon: "/marca/logo-inversiones-jp.png", apple: "/marca/logo-inversiones-jp.png" },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [{ url: "/marca/logo-inversiones-jp.png", width: 640, height: 640, alt: "Inversiones JP" }],
  },
};

// Sin maximumScale/userScalable: el usuario debe poder hacer zoom (accesibilidad).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050e24",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={archivo.variable}>{children}</body>
    </html>
  );
}
