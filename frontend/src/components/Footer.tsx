import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <footer style={{ backgroundColor: "var(--bg-secondary)", padding: "80px 0 40px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="container">
        
        {/* Top Footer: Logo & Trust Badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "60px" }}>
          <img src="/premium_logo.png" alt="JP Motors Logo" style={{ height: "80px", marginBottom: "32px", mixBlendMode: "screen", opacity: 0.95 }} />
          
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "32px", color: "white", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> FÁCIL Y RÁPIDO</span>
            <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> 100% CONFIABLE</span>
            <span className="flex items-center" style={{ gap: "8px" }}><span style={{ color: "var(--accent-primary)" }}>✓</span> ASESORÍA PERSONALIZADA</span>
          </div>
        </div>

        {/* Brands Text List */}
        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "60px", paddingBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px" }}>
          <span style={{ cursor: "pointer", fontWeight: 800, color: "white" }}>DISTRIBUIDOR EXCLUSIVO HONDA</span>
        </div>

        {/* Bottom Footer: 4 Grid Columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "48px" }}>
          
          {/* Col 1 */}
          <div>
            <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "20px", color: "var(--text-secondary)", letterSpacing: "1px" }}>Nosotros</h4>
            <p style={{ fontSize: "0.85rem", color: "white", lineHeight: "1.6", marginBottom: "16px" }}>
              Somos tu mejor aliado comercial especializado en venta de motos y accesorios con financiamiento accesible en todo el Perú.
            </p>
            <Link href="/nosotros" style={{ color: "var(--accent-primary)", fontSize: "0.85rem", fontWeight: 700 }}>Más de nosotros</Link>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "20px", color: "var(--text-secondary)", letterSpacing: "1px" }}>Soporte</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem", color: "white" }}>
              <li><Link href="#">Políticas de Privacidad</Link></li>
              <li><Link href="#">Términos y Condiciones</Link></li>
              <li><Link href="#">Libro de Reclamaciones</Link></li>
              <li><Link href="#">Talleres Autorizados</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "20px", color: "var(--text-secondary)", letterSpacing: "1px" }}>Contacto</h4>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <a href="#" style={{ color: "white" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="#" style={{ color: "white" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>
              <a href="#" style={{ color: "white" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
            </div>
            <h4 style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "8px", color: "var(--text-secondary)" }}>Encuéntranos</h4>
            <p style={{ fontSize: "0.85rem", color: "white", lineHeight: "1.5" }}>
              <strong>Tienda Central</strong><br />
              Av. Los Motores 1234,<br />
              Distrito Financiero, Perú.<br />
              Referencia: A dos cuadras del Óvalo.
            </p>
          </div>

          {/* Col 4 */}
          <div>
            <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "20px", color: "var(--text-secondary)", letterSpacing: "1px" }}>Recibe Ofertas Especiales</h4>
            <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
              <input type="email" placeholder="Ingresar Email" style={{ flex: 1, padding: "12px 16px", background: "white", border: "none", outline: "none", color: "black", fontWeight: 700 }} />
              <button style={{ backgroundColor: "var(--accent-primary)", color: "black", border: "none", padding: "0 24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
            <Link href="#" style={{ color: "var(--accent-primary)", fontSize: "0.85rem", fontWeight: 700 }}>Vende tu moto con nosotros</Link>
          </div>

        </div>

        <div style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          <span>© JP Motors 2026. Todos los derechos reservados.</span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
