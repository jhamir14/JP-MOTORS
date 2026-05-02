"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <div className="bottom-nav" style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      backgroundColor: "rgba(10, 12, 16, 0.98)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      display: "none", /* Oculto en desktop, lo mostramos vía CSS en mobile */
      justifyContent: "space-around",
      alignItems: "center",
      padding: "12px 0",
      paddingBottom: "max(12px, env(safe-area-inset-bottom))", // Para iPhones con barra home
      zIndex: 1000,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.5)"
    }}>
      
      <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: pathname === "/" ? "var(--accent-primary)" : "var(--text-secondary)", transition: "color 0.2s" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>Inicio</span>
      </Link>

      <Link href="/motos" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: pathname?.startsWith("/motos") ? "var(--accent-primary)" : "var(--text-secondary)", transition: "color 0.2s" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
        </svg>
        <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>Motos</span>
      </Link>

      <Link href="/repuestos" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: pathname?.startsWith("/repuestos") ? "var(--accent-primary)" : "var(--text-secondary)", transition: "color 0.2s" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>Repuestos</span>
      </Link>

      <Link href="/financiamiento" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", color: pathname?.startsWith("/financiamiento") ? "var(--accent-primary)" : "var(--text-secondary)", transition: "color 0.2s" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
        </svg>
        <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>Crédito</span>
      </Link>

    </div>
  );
};

export default BottomNav;
