"use client";
import Image from "next/image";
import Link from "next/link";
import { mockMotos } from "@/data/mockMotos";

export default function Home() {
  const featuredMotos = mockMotos.filter(m => [1, 6, 11].includes(m.id));
  
  const formatSoles = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section" style={{ 
        padding: "160px 0 120px 0", 
        position: "relative",
        backgroundImage: "linear-gradient(to bottom, rgba(15, 17, 21, 0.4) 0%, rgba(15, 17, 21, 0.7) 60%, rgba(15, 17, 21, 1) 100%), url('/hero_bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center 20%"
      }}>
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h1 style={{ marginBottom: "16px", textTransform: "uppercase", fontSize: "3rem", fontWeight: 900, textShadow: "0 4px 12px rgba(0,0,0,0.8)", letterSpacing: "1px" }}>
              La moto que buscas, la tenemos
            </h1>
            <p style={{ fontSize: "1.3rem", color: "var(--text-secondary)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              Conócela, cómprala o finánciala aquí.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "24px", color: "white", fontSize: "0.9rem", fontWeight: 700, flexWrap: "wrap" }}>
              <span className="flex items-center" style={{ gap: "8px" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> FÁCIL Y RÁPIDO</span>
              <span className="flex items-center" style={{ gap: "8px" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> 100% SEGURO</span>
              <span className="flex items-center" style={{ gap: "8px" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> ASESORÍA PERSONALIZADA</span>
            </div>
          </div>

          {/* Panel de Filtros (Solo Escritorio) */}
          <div className="desktop-only" style={{ background: "rgba(15, 17, 21, 0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "48px" }}>
            
            {/* Columna Izquierda: Filtros Completos */}
            <div>
              <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 700, marginBottom: "24px", letterSpacing: "1px" }}>Completa los filtros y encuentra tu moto ideal</h3>
              
              <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase" }}>Precio (S/)</label>
                  <input type="range" min="3000" max="50000" defaultValue="25000" style={{ width: "100%", accentColor: "var(--accent-primary)", marginBottom: "8px" }} />
                  <div className="flex space-between" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                    <span>S/ 3,000</span>
                    <span>S/ 50,000+</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase" }}>Cilindrada</label>
                  <input type="range" min="0" max="1000" defaultValue="500" style={{ width: "100%", accentColor: "var(--accent-primary)", marginBottom: "8px" }} />
                  <div className="flex space-between" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                    <span>0 cc</span>
                    <span>1,000 cc+</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase" }}>Tipo de Moto</label>
                <select style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "12px 16px", color: "white", fontSize: "1rem", appearance: "none" }}>
                  <option value="" style={{ color: "black" }}>Sin Preferencia</option>
                  <option value="deportiva" style={{ color: "black" }}>Deportiva</option>
                  <option value="scooter" style={{ color: "black" }}>Scooter</option>
                  <option value="todoterreno" style={{ color: "black" }}>Todo Terreno</option>
                </select>
              </div>

              <button style={{ width: "100%", background: "var(--accent-primary)", color: "black", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", padding: "16px", border: "none", borderRadius: "8px", fontSize: "1rem" }}>
                Buscar Motos
              </button>
            </div>

            {/* Columna Derecha: Búsqueda Libre */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 700, marginBottom: "16px", letterSpacing: "1px" }}>¿Tienes una moto en mente? Búscala aquí.</h3>
                <div style={{ position: "relative" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input type="text" placeholder="Escribe modelo, marca o tipo de moto" style={{ width: "100%", background: "white", padding: "16px 16px 16px 48px", border: "none", borderRadius: "4px", color: "black", fontWeight: 700, outline: "none" }} />
                </div>
              </div>
              
              <div style={{ marginTop: "40px" }}>
                <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 700, marginBottom: "16px", letterSpacing: "1px" }}>Mira todos los modelos</h3>
                <button style={{ width: "100%", background: "transparent", border: "1px solid white", color: "white", padding: "16px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>
                  Ver Catálogo Completo
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Botones de Acción (Solo Móvil) */}
      <section className="mobile-only" style={{ padding: "0 20px 40px 20px" }}>
        <Link href="/motos" className="btn btn-primary" style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", padding: "16px", borderRadius: "12px", width: "100%" }}>
          Ver Catálogo de Motos 
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
        <Link href="/repuestos" className="btn btn-secondary" style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", padding: "16px", borderRadius: "12px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)" }}>
          Tienda de Repuestos
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
        <Link href="/financiamiento" className="btn btn-secondary" style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", padding: "16px", borderRadius: "12px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)" }}>
          Quiero un Crédito
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </section>

      {/* Motos Destacadas */}
      <section style={{ padding: "80px 0", background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="flex space-between items-center" style={{ marginBottom: "40px" }}>
            <h2>Recién Llegadas</h2>
            <Link href="/motos" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>Ver Todas →</Link>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {featuredMotos.map((moto) => (
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
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Financiamento CTA (Estilo Nuevo Inspirado en Referencia) */}
      <section style={{ padding: "120px 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", gap: "64px", alignItems: "center" }}>
          
          {/* Lado Imagen (Persona con llave, fondo extraido matemáticamente) */}
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
            <img src="/financing_worker.png" alt="Financiamiento JP Motors Trabajadores" style={{ maxWidth: "100%", maxHeight: "600px", objectFit: "contain", mixBlendMode: "screen", filter: "contrast(1.1) brightness(1.2)" }} />
          </div>

          {/* Lado Textos y Columnas */}
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            
            {/* Título Principal */}
            <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: "1.1", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-1px" }}>
              Tu próxima moto está<br />
              <span style={{ color: "var(--accent-primary)" }}>al alcance de tu mano</span>
            </h2>

            {/* Columnas Inferiores responsivas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px" }}>
              
              {/* Col Bloque 1 */}
              <div>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "16px", fontWeight: 700, lineHeight: "1.4" }}>El financiamiento que te entiende</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                  Entendemos que la moto es tu principal herramienta de progreso. Evaluamos tu perfil rápidamente y te brindamos créditos accesibles, con la flexibilidad que requieres.
                </p>
              </div>

              {/* Col Bloque 2 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "16px", fontWeight: 700, lineHeight: "1.4" }}>Proyecta tus pagos hoy</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "32px" }}>
                  Descubre cuál sería tu cuota mensual y la inicial que mejor encaja en tu economía actual mediante nuestro simulador. Te acompañamos paso a paso de forma transparente.
                </p>
                <Link href="/financiamiento" className="btn btn-primary" style={{ width: "100%", textAlign: "center", textTransform: "uppercase", fontWeight: 800 }}>
                  Calcular mis cuotas
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Marcas Aliadas */}
      <section style={{ padding: "60px 0 100px 0", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "2.5rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "48px" }}>
            Busca tu Moto por <span style={{ color: "var(--accent-primary)" }}>Marca</span>
          </h2>
          
          <div style={{ display: "flex", justifyContent: "center" }}>
            
            {/* HONDA */}
            <div style={{ width: "100%", maxWidth: "180px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="card" style={{ width: "100%", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                <img src="/brands/HONDA_wing.png" alt="Honda" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "screen" }} />
              </div>
              <span style={{ marginTop: "16px", fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>HONDA EXCLUSIVO</span>
            </div>

          </div>
        </div>
      </section>


    </main>
  );
}
