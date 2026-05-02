"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <nav style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10, 12, 16, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 1000, transition: "all 0.3s ease" }}>
      <div className="container flex items-center space-between">
        <div className="flex items-center" style={{ gap: "32px" }}>
          {/* Logo estilo transparente y totalmente blanco con inversion */}
          <Link href="/">
            <Image
              src="/premium_logo.png"
              alt="Multimarca JP Logo"
              width={180}
              height={80}
              style={{ objectFit: "contain", mixBlendMode: "screen", opacity: 0.95 }}
              priority
            />
          </Link>

          {/* Menú de navegación Desktop */}
          <div className="desktop-menu flex gap-6 items-center" style={{ marginLeft: "16px" }}>
            <Link href="/motos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Catálogo de Motos</Link>
            <Link href="/repuestos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Repuestos</Link>
            <Link href="/financiamiento" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Financiamiento</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/financiamiento" className="btn btn-primary desktop-menu" style={{ padding: "8px 24px", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 800 }}>Cotizar Crédito</Link>
          
          {/* Botón Hamburguesa para Mobile */}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "none", padding: "8px" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú Desplegable Mobile */}
      <div className={`mobile-drawer ${isMenuOpen ? 'open' : ''}`} style={{ display: "none" }}>
        <Link href="/motos" onClick={() => setIsMenuOpen(false)} style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Catálogo de Motos</Link>
        <Link href="/repuestos" onClick={() => setIsMenuOpen(false)} style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Repuestos</Link>
        <Link href="/financiamiento" onClick={() => setIsMenuOpen(false)} style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Financiamiento</Link>
        <Link href="/financiamiento" onClick={() => setIsMenuOpen(false)} className="btn btn-primary" style={{ marginTop: "24px", textAlign: "center", padding: "12px", fontSize: "1rem", fontWeight: 800 }}>Cotizar Crédito</Link>
      </div>
    </nav>
  );
};

export default Navbar;
