"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { mockMotos } from "@/data/mockMotos";

export default function MotoDetailsPage() {
  const params = useParams();
  const idValue = typeof params?.id === "string" ? parseInt(params.id) : null;
  
  // States for Simulator
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [months, setMonths] = useState<number>(12);
  
  // Buscar la moto específica
  const moto = mockMotos.find((m) => m.id === idValue);

  // Formatters
  const formatSoles = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value);
  }

  // Si no se encuentra (Id ingresado falso) mostrar 404
  if (!moto) {
    return (
      <main style={{ minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1 style={{ fontSize: "3rem", color: "var(--accent-primary)" }}>404</h1>
        <p style={{ marginTop: "16px", fontSize: "1.2rem" }}>Motocicleta no encontrada en nuestro inventario.</p>
        <Link href="/motos" className="btn btn-primary" style={{ marginTop: "32px", padding: "12px 32px" }}>Volver al Catálogo</Link>
      </main>
    );
  }

  // Cálculos para el Simulador
  const principal = Math.max(0, moto.price - initialPayment);
  const interestRate = 0.02; // Tasa referencial 2% mensual (aprox 24% anual)
  const monthlyPayment = principal > 0 ? (principal * interestRate * Math.pow(1 + interestRate, months)) / (Math.pow(1 + interestRate, months) - 1) : 0;

  // Si existe la moto generamos la vista gigantesca inmersiva.
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Navegación interna (Breadcrumb) */}
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "16px" }}>
        <Link href="/motos" style={{ color: "var(--text-secondary)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <span>← Volver al inventario</span>
        </Link>
      </div>

      <div className="container" style={{ paddingTop: "40px", paddingBottom: "100px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))", gap: "60px", alignItems: "center" }}>
        
        {/* Lado Izquierdo: Exhibición Visual Inmersiva */}
        <div style={{ 
            position: "relative", 
            width: "100%", 
            height: "500px", 
            backgroundColor: "rgba(255,255,255,0.02)", 
            borderRadius: "24px", 
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px",
            boxShadow: "inset 0 0 100px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4)"
        }}>
          {/* Brillo de neón de fondo detrás de la moto */}
          <div style={{ position: "absolute", width: "60%", height: "60%", background: "var(--accent-primary)", filter: "blur(120px)", opacity: 0.15, zIndex: 0 }}></div>
          
          <img 
            src={moto.image} 
            alt={moto.name} 
            style={{ 
              maxWidth: "100%", 
              maxHeight: "100%", 
              objectFit: "contain", 
              mixBlendMode: "screen", 
              filter: "contrast(1.15) drop-shadow(0 20px 20px rgba(0,0,0,0.8))",
              position: "relative",
              zIndex: 1
            }} 
          />
        </div>

        {/* Lado Derecho: Ficha Técnica y Compra */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "var(--accent-primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", fontSize: "0.85rem", marginBottom: "8px" }}>
            Segmento {moto.category}
          </span>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 900, lineHeight: 1.1, marginBottom: "24px", textTransform: "uppercase" }}>
            {moto.name}
          </h1>

          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px" }}>
            {moto.description}
          </p>

            {/* Ficha Rápida Específica de esta moto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "40px" }}>
              {moto.specs && Object.entries(moto.specs).map(([key, value]) => (
                <div key={key} style={{ padding: "16px", background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>{key}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "white" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Caja de Costos y Acción de Compra */}
            <div style={{ padding: "32px", background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.5) 100%)", borderRadius: "16px", border: "1px solid rgba(0,255,200,0.2)", position: "relative", overflow: "hidden" }}>
               {/* Decoración cyber */}
               <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "radial-gradient(circle at top right, var(--accent-primary) 0%, transparent 70%)", opacity: 0.1 }}></div>

               <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                 <span style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-secondary)" }}>Precio Lista Contado</span>
                 <span style={{ fontSize: "3rem", fontWeight: 900, color: "white", lineHeight: 1 }}>{formatSoles(moto.price)}</span>
                 <span style={{ fontSize: "1.2rem", color: "var(--text-secondary)", fontWeight: 700 }}>USD {formatSoles(moto.priceUsd || 0).replace('S/', '$')}</span>
                 <span style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 700, marginTop: "8px" }}>* Incluye tarjeta de rodaje y 3 placas.</span>
               </div>

               <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                 <a href="#simulador" className="btn btn-primary" style={{ flex: 2, textAlign: "center", padding: "16px", fontSize: "1.1rem", textTransform: "uppercase", fontWeight: 900, boxShadow: "0 10px 20px rgba(0,255,200,0.2)", minWidth: "200px" }}>
                   Cotizar Crédito
                 </a>
                 
                 {/* Contacto WhatsApp directo a la Moto */}
                 <a 
                   href={`https://wa.me/51902423015?text=Hola,%20tengo%20interés%20en%20comprar%20la%20moto%20${moto.name}%20que%20vi%20en%20la%20plataforma.`} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   style={{ flex: 1, textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", padding: "16px", border: "2px solid #25D366", color: "#25D366", borderRadius: "6px", fontSize: "1rem", fontWeight: 800, textDecoration: "none", transition: "all 0.3s", minWidth: "160px" }}
                   onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#25D366'; e.currentTarget.style.color = 'white'; }}
                   onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#25D366'; }}
                 >
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                   </svg> Let's chat
                 </a>
               </div>
            </div>

          </div>

        </div>

        {/* --- SECCIÓN: CONÓCELA MÁS DE CERCA (Galería) --- */}
        <section style={{ padding: "60px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="container">
            <h2 style={{ fontSize: "2rem", fontWeight: 900, textAlign: "center", marginBottom: "40px", textTransform: "uppercase" }}>Conócela más de <span style={{ color: "var(--accent-primary)" }}>cerca</span></h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              {/* Renderizando galería real con imágenes lifestyle */}
              {moto.gallery && moto.gallery.map((imgSrc, index) => (
                <div key={index} style={{ 
                  backgroundColor: "rgba(255,255,255,0.02)", 
                  borderRadius: "16px", 
                  overflow: "hidden", 
                  height: "250px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  border: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => { e.currentTarget.children[0].setAttribute("style", "width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; transform: scale(1.1);"); }}
                onMouseOut={(e) => { e.currentTarget.children[0].setAttribute("style", "width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; transform: scale(1);"); }}
                >
                  <img src={imgSrc} alt={`Gallery ${index + 1}`} style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover", 
                    transition: "transform 0.5s" 
                  }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECCIÓN: SIMULADOR DE CRÉDITO --- */}
        <section id="simulador" style={{ padding: "60px 0 100px 0", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <div className="container" style={{ maxWidth: "800px" }}>
            <div className="form-card" style={{ padding: "40px", borderTop: "4px solid var(--accent-primary)" }}>
              <h2 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "8px", textAlign: "center", textTransform: "uppercase" }}>Simulador de <span style={{ color: "var(--accent-primary)" }}>Crédito</span></h2>
              <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "32px" }}>Ajusta tu cuota inicial y el plazo para descubrir tu pago mensual estimado.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Inputs de Simulación */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Cuota Inicial (S/)</label>
                    <input 
                      type="number" 
                      min="0"
                      max={moto.price}
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(Number(e.target.value))}
                      style={{ width: "100%", padding: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "1.2rem", fontWeight: 800, outline: "none" }} 
                    />
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>Recomendado: 20% - 30% del valor</div>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "6px" }}>Plazo (Meses)</label>
                    <select 
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      style={{ width: "100%", padding: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "1.2rem", fontWeight: 800, outline: "none", cursor: "pointer" }}
                    >
                      <option value="6">6 Meses</option>
                      <option value="12">12 Meses</option>
                      <option value="18">18 Meses</option>
                      <option value="24">24 Meses</option>
                      <option value="36">36 Meses</option>
                    </select>
                  </div>
                </div>

                {/* Resultado */}
                <div style={{ background: "rgba(0,255,200,0.05)", padding: "24px", borderRadius: "12px", border: "1px dashed rgba(0,255,200,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Cuota Mensual Estimada</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--accent-primary)" }}>{formatSoles(monthlyPayment)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>* Tasa referencial aplicada. Sujeto a evaluación.</div>
                  </div>
                  
                  <a 
                    href={`https://wa.me/51902423015?text=Hola,%20he%20realizado%20una%20simulación%20para%20la%20moto%20${moto.name}.%0ACuota Inicial:%20S/%20${initialPayment}%0APlazo:%20${months}%20meses.%0ACuota Mensual Estimada:%20S/%20${monthlyPayment.toFixed(2)}.%0A¿Podrían evaluarme?`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary" 
                    style={{ padding: "16px 32px", fontSize: "1.1rem", textTransform: "uppercase", fontWeight: 900 }}
                  >
                    Solicitar Evaluación Ahora
                  </a>
                </div>

              </div>
            </div>
          </div>
        </section>
      </main>
    );
}
