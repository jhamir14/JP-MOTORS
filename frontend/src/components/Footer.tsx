"use client";
import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <footer className="footer-padding" style={{ backgroundColor: "var(--bg-secondary)", padding: "80px 0 60px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="container">
        
        {/* Confianza Top Bar */}
        <div className="footer-text" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "32px", color: "white", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "60px", paddingBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> FÁCIL Y RÁPIDO</span>
          <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> 100% CONFIABLE</span>
          <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> DISTRIBUIDOR EXCLUSIVO HONDA</span>
        </div>

        {/* Bottom Footer: 4 Grid Columns */}
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "48px" }}>
          
          {/* Col 1: Marca y Redes */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <img src="/premium_logo.png" alt="JP Motors Logo" style={{ height: "60px", marginBottom: "20px", mixBlendMode: "screen", opacity: 0.95 }} />
            <p className="footer-text" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "24px" }}>
              Tu mejor aliado comercial especializado en venta de motos Honda y accesorios con financiamiento en todo el Perú.
            </p>
            <div style={{ display: "flex", gap: "16px" }}>
              <a href="#" style={{ color: "white", opacity: 0.7, transition: "opacity 0.3s" }} onMouseOver={e=>e.currentTarget.style.opacity="1"} onMouseOut={e=>e.currentTarget.style.opacity="0.7"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="#" style={{ color: "white", opacity: 0.7, transition: "opacity 0.3s" }} onMouseOver={e=>e.currentTarget.style.opacity="1"} onMouseOut={e=>e.currentTarget.style.opacity="0.7"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>
              <a href="#" style={{ color: "white", opacity: 0.7, transition: "opacity 0.3s" }} onMouseOver={e=>e.currentTarget.style.opacity="1"} onMouseOut={e=>e.currentTarget.style.opacity="0.7"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
            </div>
          </div>

          {/* Col 2: Enlaces Rápidos */}
          <div>
            <h4 className="footer-col-gap" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "24px", color: "white", letterSpacing: "1px" }}>Explorar</h4>
            <ul className="footer-list-gap" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <li><Link href="/motos" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Catálogo de Motos</Link></li>
              <li><Link href="/repuestos" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Tienda de Repuestos</Link></li>
              <li><Link href="/financiamiento" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Créditos y Financiamiento</Link></li>
              <li><Link href="#" style={{ transition: "color 0.3s", color: "var(--accent-primary)" }}>Vende tu moto usada</Link></li>
            </ul>
          </div>

          {/* Col 3: Soporte */}
          <div>
            <h4 className="footer-col-gap" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "24px", color: "white", letterSpacing: "1px" }}>Soporte</h4>
            <ul className="footer-list-gap" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <li><Link href="#" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Políticas de Privacidad</Link></li>
              <li><Link href="#" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Términos y Condiciones</Link></li>
              <li><Link href="#" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Libro de Reclamaciones</Link></li>
              <li><Link href="#" style={{ transition: "color 0.3s" }} onMouseOver={e=>e.currentTarget.style.color="white"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"}>Talleres Autorizados</Link></li>
            </ul>
          </div>

          {/* Col 4: Contacto */}
          <div>
            <h4 className="footer-col-gap" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "24px", color: "white", letterSpacing: "1px" }}>Contacto</h4>
            <div className="footer-col-gap" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "24px" }}>
              <strong>Tienda Central</strong><br />
              Av. Los Motores 1234,<br />
              Distrito Financiero, Perú.<br />
              Referencia: A dos cuadras del Óvalo.
            </div>
            
            <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "12px", color: "white" }}>Ofertas Exclusivas</h4>
            <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", overflow: "hidden" }}>
              <input type="email" placeholder="Tu correo electrónico" style={{ flex: 1, padding: "12px 16px", background: "rgba(0,0,0,0.2)", border: "none", outline: "none", color: "white", fontSize: "0.85rem" }} />
              <button style={{ backgroundColor: "var(--accent-primary)", color: "black", border: "none", padding: "0 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "filter 0.3s" }} onMouseOver={e=>e.currentTarget.style.filter="brightness(1.2)"} onMouseOut={e=>e.currentTarget.style.filter="brightness(1)"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "center", fontSize: "0.75rem", color: "var(--text-secondary)", paddingBottom: "20px" }}>
          <span>© JP Motors 2026. Todos los derechos reservados.</span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
