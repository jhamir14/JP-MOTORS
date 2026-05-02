"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <nav style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(10, 12, 16, 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 1000, transition: "all 0.3s ease" }}>
      <div className="container flex items-center" style={{ justifyContent: "space-between" }}>
        
        {/* Bloque Izquierdo: Logo */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          <Link href="/">
            <Image
              src="/premium_logo.png"
              alt="Multimarca JP Logo"
              width={160}
              height={70}
              style={{ objectFit: "contain", mixBlendMode: "screen", opacity: 0.95 }}
              priority
            />
          </Link>
        </div>

        {/* Bloque Central: Menú de navegación Desktop */}
        <div className="desktop-menu flex items-center" style={{ gap: "40px", flex: 2, justifyContent: "center" }}>
          <Link href="/motos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="var(--accent-primary)"} onMouseOut={e=>e.currentTarget.style.color="#fff"}>Catálogo de Motos</Link>
          <Link href="/repuestos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="var(--accent-primary)"} onMouseOut={e=>e.currentTarget.style.color="#fff"}>Repuestos</Link>
          <Link href="/financiamiento" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="var(--accent-primary)"} onMouseOut={e=>e.currentTarget.style.color="#fff"}>Financiamiento</Link>
        </div>

        {/* Bloque Derecho: Botón de Acción */}
        <div className="flex items-center" style={{ flex: 1, justifyContent: "flex-end", gap: "16px" }}>
          <Link href="/financiamiento" className="btn btn-primary desktop-menu" style={{ padding: "10px 28px", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 900, letterSpacing: "1px" }}>Cotizar Crédito</Link>
          
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
