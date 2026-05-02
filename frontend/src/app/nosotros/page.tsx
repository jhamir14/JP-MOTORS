import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function NosotrosPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      
      {/* Hero Section Corporativo */}
      <section style={{ position: "relative", padding: "100px 0 80px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
        {/* Glow de fondo */}
        <div style={{ position: "absolute", top: "-50%", left: "50%", transform: "translateX(-50%)", width: "80%", height: "100%", background: "radial-gradient(ellipse at center, rgba(0, 255, 200, 0.15) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }}></div>
        
        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <span style={{ color: "var(--accent-primary)", fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px", display: "inline-block" }}>
            Conoce JP Motors
          </span>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "24px", lineHeight: 1.1 }}>
            Nuestra Pasión son las <span style={{ color: "var(--bg-primary)", WebkitTextStroke: "1px var(--accent-primary)" }}>Motocicletas</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
            En Inversiones Multimarca JP nacimos con una premisa inquebrantable: Acercar el transporte de calidad y las herramientas de trabajo ideales a las manos de cada peruano, a través de opciones justas y plataformas tecnológicas eficientes.
          </p>
        </div>
      </section>

      {/* Misión y Visión (Grid de 2 Columnas) */}
      <section style={{ padding: "80px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "40px" }}>
            
            {/* Tarjeta Misión */}
            <div style={{ backgroundColor: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", padding: "40px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", backgroundColor: "var(--accent-primary)" }}></div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "16px", color: "white" }}>Nuestra Misión</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.7 }}>
                Ofrecer un catálogo transparente, actualizado y multimodal de las mejores marcas de motocicletas a nivel mundial. Nos enfocamos en brindar simulaciones de crédito directas y facilitar el proceso crediticio para empoderar a los emprendedores, trabajadores y entusiastas con un vehículo propio en la puerta de sus casas.
              </p>
            </div>

            {/* Tarjeta Visión */}
            <div style={{ backgroundColor: "rgba(15,17,21,0.5)", border: "1px solid rgba(255,255,255,0.05)", padding: "40px", borderRadius: "16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "radial-gradient(circle at top right, var(--accent-primary) 0%, transparent 70%)", opacity: 0.1 }}></div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "16px", color: "white" }}>Nuestra Visión</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.7 }}>
                Consolidarnos hacia el próximo quintenio como la primera plataforma E-commerce automotriz líder del país. Queremos transformar totalmente la clásica (y tediosa) manera de comprar motocicletas en Perú, llevando toda la exhibición de marcas, repuestos y la gestión financiera hacia un ecosistema 100% digital, transparente y veloz.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Valores Corporativos */}
      <section style={{ backgroundColor: "var(--bg-secondary)", padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
         <div className="container" style={{ textAlign: "center" }}>
           <h2 style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "60px", color: "white" }}>Por qué elegirnos</h2>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px" }}>
             
             <div style={{ padding: "32px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.01)" }}>
               <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🤝</div>
               <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>Honestidad Frontal</h3>
               <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>Cotizaciones sin letras chicas, tasas transparentes mostradas desde el primer click.</p>
             </div>

             <div style={{ padding: "32px", border: "1px solid rgba(0,255,200,0.1)", borderRadius: "12px", backgroundColor: "rgba(0,255,200,0.02)" }}>
               <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔥</div>
               <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>Alianza Multimarca</h3>
               <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>Un inventario oficial donde las mejores marcas compiten en piso unificado para tu beneficio (Honda, Yamaha, Bajaj).</p>
             </div>

             <div style={{ padding: "32px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.01)" }}>
               <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚡</div>
               <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase" }}>Rapidez Digital</h3>
               <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>Olvídate del papeleo físico absurdo. Todo tu expediente transaccional ocurre en pantallas.</p>
             </div>

           </div>
         </div>
      </section>

      {/* Cierre / CTA */}
      <section style={{ padding: "100px 0", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "24px" }}>¿Listo para dominar las pistas?</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: "40px" }}>Visítanos físicamente en nuestras sedes o elige tu máquina soñada ahora mismo en nuestra exhibición digital.</p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link href="/motos" className="btn btn-primary" style={{ padding: "16px 40px", fontSize: "1.1rem", fontWeight: 800, textTransform: "uppercase" }}>
              Ir al Catálogo 👉
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
