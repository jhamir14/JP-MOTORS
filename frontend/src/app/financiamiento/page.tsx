"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function FinanciamientoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Estado que agrupa los casi 20 campos
  const [formData, setFormData] = useState({
    // 1. Personales
    nombres: "",
    apellidos: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    fechaNacimiento: "",
    estadoCivil: "Soltero(a)",
    nivelEducacion: "Secundaria",
    // 2. Contacto
    celular: "",
    correo: "",
    preferenciaContacto: "WhatsApp",
    departamento: "",
    provincia: "",
    distrito: "",
    // 3. Moto
    marcaMoto: "Honda",
    modeloMoto: "",
    usoMoto: "Trabajo",
    // 4. Crédito
    situacionLaboral: "Dependiente",
    ingresoMensual: "",
    montoInicial: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch("https://formsubmit.co/ajax/jhamirqs2007@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            _subject: "🚀 ¡Nuevo Lead de Financiamiento JP Motors!",
            _template: "table",
            "Nombres": formData.nombres,
            "Apellidos": formData.apellidos,
            "Documento": `${formData.tipoDocumento} - ${formData.numeroDocumento}`,
            "Celular": formData.celular,
            "Correo": formData.correo,
            "Fecha de Nacimiento": formData.fechaNacimiento,
            "Estado Civil": formData.estadoCivil,
            "Educación": formData.educacion,
            "Contacto Preferido": formData.preferenciaContacto,
            "Ubicación": `${formData.distrito}, ${formData.provincia}, ${formData.departamento}`,
            "Vehículo de Interés": `${formData.marcaMoto} - ${formData.modeloMoto}`,
            "Uso del Vehículo": formData.usoMoto,
            "Monto Inicial (S/)": formData.montoInicial,
            "Ingreso Mensual (S/)": formData.ingresoMensual,
            "Situación Laboral": formData.situacionLaboral
        })
      });

      if (response.ok) {
        setIsSubmitting(false);
        setSubmitted(true);
        window.scrollTo(0,0);
      } else {
        alert("Hubo un error al enviar la solicitud. Por favor intenta de nuevo.");
        setIsSubmitting(false);
      }
    } catch (error) {
      alert("Error de red. Verifica tu conexión a internet e intenta nuevamente.");
      setIsSubmitting(false);
    }
  };

  // Estilos reutilizables para el formulario (Diseño Premium)
  const labelStyle = { fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", outline: "none", transition: "border 0.2s" };
  const cardStyle = { backgroundColor: "rgba(15,17,21,0.7)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "32px", marginBottom: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" };
  const cardTitleStyle = { fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase" as const, marginBottom: "24px", color: "white", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", display: "flex", alignItems: "center", gap: "10px" };

  if (submitted) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px" }}>
        <div style={{ padding: "40px", backgroundColor: "rgba(15,17,21,0.8)", border: "1px solid rgba(0,255,200,0.3)", borderRadius: "16px", maxWidth: "600px", boxShadow: "0 20px 40px rgba(0,255,200,0.1)" }}>
          <h1 style={{ fontSize: "2.5rem", color: "var(--accent-primary)", marginBottom: "16px", fontWeight: 900 }}>¡Solicitud Ingresada!</h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px" }}>
            Estimado(a) <strong>{formData.nombres}</strong>, hemos recibido tu perfil crediticio con éxito. Un analista evaluará tus datos y se pondrá en contacto contigo a la brevedad vía <strong>{formData.preferenciaContacto}</strong>.
          </p>
           <Link href="/motos" className="btn btn-primary" style={{ padding: "12px 32px" }}>Explorar Catálogo de Motos</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", paddingBottom: "80px" }}>
      
      {/* Estilos CSS nativos para forzar el Modo Oscuro en Selects Dropdowns */}
      <style>{`
        select option {
          background-color: #0f1115 !important;
          color: white !important;
          padding: 10px;
        }
        select:focus {
          background-color: #1a1d24 !important;
        }
      `}</style>
      
      {/* Header Formulario */}
      <section style={{ backgroundColor: "var(--bg-secondary)", padding: "60px 0 40px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "40px", textAlign: "center" }}>
        <div className="container">
          <h1 style={{ fontSize: "3rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "16px", lineHeight: 1.1 }}>
            Formulario de <span style={{ color: "var(--accent-primary)" }}>Financiamiento</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto" }}>
            Completa tus datos reales y descubre la cuota perfecta para llevarte tu motocicleta hoy mismo.
          </p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: "800px" }}>
        <form onSubmit={handleSubmit}>

          {/* TARJETA 1: DATOS PERSONALES */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>
              <span style={{ color: "var(--accent-primary)" }}>1.</span> Ficha Personal
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              <div>
                <label style={labelStyle}>Nombres</label>
                <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              <div>
                <label style={labelStyle}>Apellidos</label>
                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Documento</label>
                <select name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carnet de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Número de Documento</label>
                <input type="text" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} required pattern="[A-Za-z0-9]{8,12}" title="Ingrese un documento válido de entre 8 a 12 caracteres." style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Estado Civil</label>
                <select name="estadoCivil" value={formData.estadoCivil} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="Soltero(a)">Soltero(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Conviviente">Conviviente</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nivel de Educación</label>
                <select name="nivelEducacion" value={formData.nivelEducacion} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="Secundaria">Secundaria Cómpleta</option>
                  <option value="Técnico">Estudios Técnicos</option>
                  <option value="Universitario">Universitario</option>
                </select>
              </div>
            </div>
          </div>

          {/* TARJETA 2: CONTACTO Y UBICACIÓN */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>
              <span style={{ color: "var(--accent-primary)" }}>2.</span> Domicilio y Contacto
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              <div>
                <label style={labelStyle}>Teléfono / Celular</label>
                <input type="tel" name="celular" value={formData.celular} onChange={handleChange} required pattern="[0-9]{9,15}" title="Ingrese un número telefónico válido (solo números, mínimo 9 dígitos)." style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Correo Electrónico</label>
                <input type="email" name="correo" value={formData.correo} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Preferencia de Contacto</label>
                <select name="preferenciaContacto" value={formData.preferenciaContacto} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="WhatsApp">WhatsApp (Recomendado)</option>
                  <option value="Llamada">Llamada Telefónica</option>
                  <option value="Correo">Correo Electrónico</option>
                </select>
              </div>
              <div></div> {/* Espaciador para grid */}
              
              <div>
                <label style={labelStyle}>Departamento</label>
                <input type="text" name="departamento" placeholder="Ej. Lima" value={formData.departamento} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Provincia</label>
                <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Distrito (Residencia Actual)</label>
                <input type="text" name="distrito" value={formData.distrito} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
            </div>
          </div>

          {/* TARJETA 3: VEHÍCULO */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>
               <span style={{ color: "var(--accent-primary)" }}>3.</span> La Motocicleta
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              <div>
                <label style={labelStyle}>Marca de la Moto</label>
                <select name="marcaMoto" value={formData.marcaMoto} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="Honda">Honda</option>
                  <option value="Yamaha">Yamaha</option>
                  <option value="Bajaj">Bajaj</option>
                  <option value="Otra">Otra Marca</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Modelo Específico (Ej. NAVI)</label>
                <input type="text" name="modeloMoto" value={formData.modeloMoto} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>¿Qué uso principal tendrá el vehículo?</label>
                <select name="usoMoto" value={formData.usoMoto} onChange={handleChange} style={{...inputStyle, cursor: "pointer"}}>
                  <option value="Trabajo">Transporte Público / delivery / Herramienta de trabajo</option>
                  <option value="Urbano">Transporte Personal Urbano</option>
                  <option value="Paseo">Viajes Largos / Paseo de fin de semana</option>
                </select>
              </div>
            </div>
          </div>

          {/* TARJETA 4: CRÉDITO */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>
               <span style={{ color: "var(--accent-primary)" }}>4.</span> Perfil Crediticio
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              <div style={{ gridColumn: "1 / -1", backgroundColor: "rgba(0,255,200,0.05)", padding: "20px", borderRadius: "8px", border: "1px dashed rgba(0,255,200,0.2)", marginBottom: "8px" }}>
                <p style={{ color: "var(--accent-primary)", fontSize: "0.9rem", margin: 0 }}>
                  💡 <strong>Tip Financiero:</strong> Mientras mayor sea el monto inicial con el que cuentas, mayores serán las posibilidades de aprobación y menores tus cuotas.
                </p>
              </div>
              
              <div>
                <label style={labelStyle}>Monto Inicial con el que cuenta (Soles)</label>
                <input type="number" name="montoInicial" placeholder="S/ 500.00" value={formData.montoInicial} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div>
                <label style={labelStyle}>Ingreso Mensual (Soles)</label>
                <input type="number" name="ingresoMensual" placeholder="Ej. 1800" value={formData.ingresoMensual} onChange={handleChange} required style={inputStyle} onFocus={(e) => e.target.style.borderColor="var(--accent-primary)"} onBlur={(e) => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Situación Laboral</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
                  {["Dependiente", "Independiente", "Informal"].map(laboral => (
                    <label key={laboral} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "16px", borderRadius: "8px", border: formData.situacionLaboral === laboral ? "2px solid var(--accent-primary)" : "1px solid rgba(255,255,255,0.1)", backgroundColor: formData.situacionLaboral === laboral ? "rgba(0,255,200,0.05)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}>
                      <input type="radio" name="situacionLaboral" value={laboral} checked={formData.situacionLaboral === laboral} onChange={handleChange} style={{ accentColor: "var(--accent-primary)", width: "18px", height: "18px" }} />
                      <span style={{ fontWeight: formData.situacionLaboral === laboral ? 800 : 400, color: formData.situacionLaboral === laboral ? "white" : "var(--text-secondary)" }}>{laboral}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTÓN DE SUBMIT */}
          <div style={{ textAlign: "center", marginTop: "48px" }}>
             <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: "20px 60px", fontSize: "1.3rem", fontWeight: 900, textTransform: "uppercase", width: "100%", maxWidth: "400px", boxShadow: "0 10px 30px rgba(0,255,200,0.2)" }}>
               {isSubmitting ? "Procesando..." : "SOLICITAR EVALUACIÓN"}
             </button>
             <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "16px" }}>Al enviar certificas que los datos ingresados son transparentes y verificables.</p>
          </div>

        </form>
      </div>
    </main>
  );
}
