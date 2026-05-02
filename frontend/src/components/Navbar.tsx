"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Navbar = () => {
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

          {/* Menú de navegación estilo SomosMoto */}
          <div className="flex gap-6 items-center" style={{ marginLeft: "16px" }}>
            <Link href="/motos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Catálogo de Motos</Link>
            <Link href="/repuestos" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Repuestos</Link>
            <Link href="/financiamiento" style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.3s" }}>Financiamiento</Link>
          </div>
        </div>

        <div className="flex items-center">
          <Link href="/financiamiento" className="btn btn-primary" style={{ padding: "8px 24px", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 800 }}>Cotizar Crédito</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
