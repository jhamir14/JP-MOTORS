"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { mockRepuestos } from "@/data/mockRepuestos";

export default function RepuestosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  // Obtener categorías únicas
  const categories = ["Todas", ...Array.from(new Set(mockRepuestos.map(r => r.category)))];

  // Filtrar repuestos
  const filteredRepuestos = mockRepuestos.filter(repuesto => {
    const matchesSearch = repuesto.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          repuesto.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Todas" || repuesto.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatSoles = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(value);
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      
      {/* Hero Repuestos */}
      <section style={{ padding: "80px 0 60px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "radial-gradient(ellipse at top, rgba(0,255,200,0.05) 0%, transparent 70%)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <span style={{ color: "var(--accent-primary)", fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px", display: "inline-block" }}>
            Mantenimiento Premium
          </span>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "24px" }}>
            Repuestos y Accesorios <span style={{ color: "var(--bg-primary)", WebkitTextStroke: "1px var(--accent-primary)" }}>Honda</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            Encuentra las piezas originales exactas para mantener tu moto rodando como el primer día. Llantas, lubricantes y consumibles 100% garantizados.
          </p>
        </div>
      </section>

      {/* Controles de Filtro */}
      <section style={{ padding: "40px 0" }}>
        <div className="container">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(15,17,21,0.6)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            
            {/* Buscador de Texto */}
            <div style={{ flex: "1 1 300px", position: "relative" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input 
                type="text" 
                placeholder="Buscar repuesto (Ej: Aceite, Llantas...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.03)", padding: "12px 16px 12px 48px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", fontSize: "0.95rem", outline: "none" }} 
              />
            </div>

            {/* Selector de Categoría */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{ 
                    padding: "8px 16px", 
                    backgroundColor: categoryFilter === cat ? "var(--accent-primary)" : "transparent",
                    color: categoryFilter === cat ? "black" : "white",
                    border: categoryFilter === cat ? "none" : "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Grid de Repuestos */}
      <section style={{ padding: "0 0 80px 0" }}>
        <div className="container">
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {filteredRepuestos.length > 0 ? (
              filteredRepuestos.map((repuesto) => (
                <div key={repuesto.id} className="card" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,255,200,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0,255,200,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  
                  {/* Imagen */}
                  <div style={{ backgroundColor: "rgba(255,255,255,0.02)", width: "100%", height: "240px", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", padding: "30px" }}>
                    <span style={{ position: "absolute", top: "16px", left: "16px", backgroundColor: "white", color: "black", fontSize: "0.7rem", fontWeight: 900, padding: "4px 8px", borderRadius: "4px", zIndex: 2 }}>{repuesto.brand}</span>
                    <span style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.7rem", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", zIndex: 2 }}>{repuesto.category}</span>
                    <Image src={repuesto.image} alt={repuesto.name} fill sizes="(max-width: 768px) 100vw, 300px" style={{ objectFit: "contain", mixBlendMode: "screen", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.5))", padding: "30px" }} />
                  </div>

                  {/* Info */}
                  <div style={{ padding: "24px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "8px", lineHeight: "1.3" }}>{repuesto.name}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "20px" }}>
                      {repuesto.description}
                    </p>

                    <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "2px", textTransform: "uppercase" }}>Precio Especial</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--accent-primary)" }}>{formatSoles(repuesto.price)}</div>
                      </div>
                      
                      <a 
                        href={`https://wa.me/51902423015?text=Hola,%20estoy%20interesado%20en%20comprar%20el%20repuesto:%20${encodeURIComponent(repuesto.name)}%20(S/%20${repuesto.price})`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: "white", color: "black", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Comprar por WhatsApp"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
                      </a>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px", opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>No se encontraron repuestos</h3>
                <p>Intenta con otros términos de búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </section>

    </main>
  );
}
