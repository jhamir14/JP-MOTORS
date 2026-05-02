"use client";
import React, { useState } from "react";
import Link from "next/link";
import { mockMotos } from "@/data/mockMotos";

export default function MotosPage() {
  // Manejo de Estados de Filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [maxPrice, setMaxPrice] = useState(30000);
  const [sortBy, setSortBy] = useState("Destacados");
  
  // Lógica de Filtrado y Ordenamiento
  const filteredMotos = mockMotos.filter(moto => {
    const matchesSearch = moto.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Todas" || moto.category.includes(categoryFilter);
    const matchesPrice = moto.price <= maxPrice;
    return matchesSearch && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === "Menor Precio") return a.price - b.price;
    if (sortBy === "Mayor Precio") return b.price - a.price;
    if (sortBy === "Mayor Cilindrada") return b.cc - a.cc;
    return 0; // "Destacados"
  });

  // Formatters
  const formatSoles = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value);
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      
      {/* Header del Catálogo */}
      <section style={{ backgroundColor: "var(--bg-secondary)", padding: "60px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="container">
          <h1 style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>
            Catálogo de <span style={{ color: "var(--accent-primary)" }}>Motos</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
            Encuentra nuestra exhibición interactiva. Modelos Honda, accesorios y Trimóviles con entrega inmediata.
          </p>
        </div>
      </section>

      {/* Contenedor Principal (Layout a 2 Columnas) */}
      <section style={{ padding: "60px 0" }}>
        <div className="container" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          
          {/* PANEL DE FILTROS SUPERIOR */}
          <aside style={{ backgroundColor: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", fontWeight: 800, marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
              Filtros Rápidos
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", alignItems: "start" }}>
            
            {/* Buscador de Texto */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 700 }}>Buscar por modelo</label>
              <input type="text" placeholder="Ej. XR150L" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", outline: "none", transition: "border 0.2s" }} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            </div>

            {/* Filtro Marca */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: 700 }}>Marca</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.95rem" }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent-primary)", width: "18px", height: "18px" }} /> Honda
                </label>
              </div>
            </div>

            {/* Filtro Rango de Precio */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 700 }}>Precio Máximo: {maxPrice === 30000 ? "Sin límite" : formatSoles(maxPrice)}</label>
              <input type="range" min="3000" max="30000" step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent-primary)", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "8px", color: "var(--text-secondary)" }}>
                <span>S/ 3,000</span>
                <span>S/ 30,000+</span>
              </div>
            </div>

            {/* Filtro Categoría */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: 700 }}>Categoría</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["Todas", "Urbana", "Todo Terreno", "Deportiva", "Trimóvil"].map((cat) => (
                  <span 
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{ 
                      padding: "6px 12px", 
                      background: categoryFilter === cat ? "var(--accent-primary)" : "rgba(255,255,255,0.05)", 
                      border: categoryFilter === cat ? "1px solid var(--accent-primary)" : "1px solid rgba(255,255,255,0.1)", 
                      borderRadius: "20px", 
                      fontSize: "0.8rem", 
                      fontWeight: categoryFilter === cat ? 800 : 400,
                      color: categoryFilter === cat ? "black" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            </div>
          </aside>

          {/* COLUMNA DERECHA: Vitrina de Motos */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            
            {/* Barra de Ordenamiento */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Mostrando <strong>{filteredMotos.length}</strong> máquinas</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "8px 16px", background: "var(--bg-secondary)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: "6px", outline: "none", cursor: "pointer" }}>
                <option value="Destacados">Destacados</option>
                <option value="Menor Precio">Menor Precio</option>
                <option value="Mayor Precio">Mayor Precio</option>
                <option value="Mayor Cilindrada">Mayor Cilindrada</option>
              </select>
            </div>

            {/* Cuadrícula (Grid) de Productos en 2 columnas exactas */}
            {filteredMotos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
                  <h2 style={{ fontSize: "2rem", marginBottom: "16px" }}>No se encontraron modelos</h2>
                  <p>Intenta ajustar o limpiar tus filtros de búsqueda.</p>
                  <button onClick={() => { setSearchTerm(""); setCategoryFilter("Todas"); setMaxPrice(30000); }} style={{ marginTop: "24px", padding: "10px 24px", background: "var(--accent-primary)", color: "black", borderRadius: "6px", fontWeight: 800, border: "none", cursor: "pointer" }}>Limpiar Filtros</button>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
                  {filteredMotos.map((moto) => (
                    <div key={moto.id} className="card" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
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
                      
                      {/* Foto de la Moto */}
                      <div style={{ backgroundColor: "rgba(255,255,255,0.02)", width: "100%", height: "220px", display: "flex", justifyContent: "center", alignItems: "center", position: "relative", padding: "20px" }}>
                        <span style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "var(--accent-primary)", color: "black", fontSize: "0.75rem", fontWeight: 800, padding: "4px 8px", borderRadius: "4px", zIndex: 2 }}>{moto.category}</span>
                        <img src={moto.image} alt={moto.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "screen", filter: "contrast(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }} />
                      </div>

                      {/* Info de la Moto */}
                      <div style={{ padding: "24px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Marca HondA</div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px", lineHeight: "1.2" }}>{moto.name}</h3>
                        
                        {/* Specs Tags */}
                        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                          <span style={{ border: "1px solid rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>⚙️ {moto.cc} cc</span>
                          <span style={{ border: "1px solid rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>⚖️ {moto.weight}</span>
                        </div>

                        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Precio Contado</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "white" }}>{formatSoles(moto.price)}</div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
                          <Link href={`/motos/${moto.id}`} style={{ flex: 1, textAlign: "center", padding: "10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 700, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor="rgba(255,255,255,0.05)"} onMouseOut={(e) => e.currentTarget.style.backgroundColor="transparent"}>
                            Detalles
                          </Link>
                          <Link href="/financiamiento" style={{ flex: 1, textAlign: "center", padding: "10px", background: "var(--accent-primary)", color: "black", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 800 }}>
                            Financiar
                          </Link>
                        </div>

                      </div>
                    </div>
                  ))}

                </div>
            )}

          </div>

        </div>
      </section>

    </main>
  );
}
