"use client";
import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { mockMotos } from "@/data/mockMotos";

export default function MotoDetailsPage() {
  const params = useParams();
  const idValue = typeof params?.id === "string" ? parseInt(params.id) : null;
  
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "40px" }}>
             <div style={{ padding: "20px", background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
               <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Motor / Cilindrada</span>
               <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>{moto.cc} <span style={{fontSize: "1rem", color: "var(--accent-primary)"}}>cc</span></span>
             </div>
             <div style={{ padding: "20px", background: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
               <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Peso en Vacío</span>
               <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>{moto.weight}</span>
             </div>
          </div>

          {/* Caja de Costos y Acción de Compra */}
          <div style={{ padding: "32px", background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.5) 100%)", borderRadius: "16px", border: "1px solid rgba(0,255,200,0.2)", position: "relative", overflow: "hidden" }}>
             {/* Decoración cyber */}
             <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "radial-gradient(circle at top right, var(--accent-primary) 0%, transparent 70%)", opacity: 0.1 }}></div>

             <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
               <span style={{ fontSize: "0.9rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-secondary)" }}>Precio Lista Contado</span>
               <span style={{ fontSize: "3rem", fontWeight: 900, color: "white", lineHeight: 1 }}>{formatSoles(moto.price)}</span>
               <span style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: 700 }}>* Incluye tarjeta de rodaje y 3 placas.</span>
             </div>

             <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
               <Link href="/financiamiento" className="btn btn-primary" style={{ flex: 2, textAlign: "center", padding: "16px", fontSize: "1.1rem", textTransform: "uppercase", fontWeight: 900, boxShadow: "0 10px 20px rgba(0,255,200,0.2)", minWidth: "200px" }}>
                 Cotizar Crédito
               </Link>
               
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
    </main>
  );
}
