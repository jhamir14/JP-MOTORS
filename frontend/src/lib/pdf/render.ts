/**
 * Dibuja un `Documento` (lib/documentos.ts) como PDF A4 con pdf-lib: JavaScript puro, sin Chromium,
 * apto para funciones serverless. Fuentes estándar Helvetica (WinAnsi: cubren tildes, ñ, °, «», —).
 *
 * Soporta: títulos, párrafos con **negritas**, cláusulas, pares clave/valor en 1 o 2 columnas,
 * tablas con cabecera repetida en cada página, recuadro destacado, avisos, firmas con huella,
 * marca de agua, cabecera con la empresa y pie con «Página x de y».
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Alineacion, Bloque, Documento, Firma } from "@/lib/documentos";

const A4: [number, number] = [595.28, 841.89];
const M = { izq: 54, der: 54, sup: 74, inf: 60 };
const ANCHO = A4[0] - M.izq - M.der;

const C = {
  texto: rgb(0.11, 0.13, 0.17),
  tenue: rgb(0.42, 0.45, 0.5),
  marca: rgb(0.06, 0.27, 0.55),
  linea: rgb(0.82, 0.84, 0.87),
  fondo: rgb(0.95, 0.96, 0.97),
  aviso: rgb(0.99, 0.95, 0.86),
  avisoTexto: rgb(0.55, 0.33, 0.02),
  agua: rgb(0.85, 0.15, 0.15),
};

export interface Encabezado {
  empresa: string;
  ruc: string;
}

interface Fuentes {
  normal: PDFFont;
  negrita: PDFFont;
}

/** Reemplaza los caracteres que Helvetica (WinAnsi) no puede codificar, para que el PDF nunca falle. */
export function sanear(texto: string, permitidos: Set<number>): string {
  let out = "";
  for (const ch of texto.normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (permitidos.has(cp) || ch === "\n") out += ch;
    else if (ch === "\t") out += " ";
    else if (/[≤]/.test(ch)) out += "<=";
    else if (/[≥]/.test(ch)) out += ">=";
    else if (/[→]/.test(ch)) out += "->";
    else if (/[‐-‒]/.test(ch)) out += "-";
    else if (/\p{M}/u.test(ch)) continue;
    else {
      const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
      out += base && [...base].every((b) => permitidos.has(b.codePointAt(0)!)) ? base : "?";
    }
  }
  return out;
}

interface Run {
  texto: string;
  negrita: boolean;
}

/** «Hola **mundo**» → runs con y sin negrita. */
function runs(texto: string): Run[] {
  const out: Run[] = [];
  texto.split(/(\*\*[^*]+\*\*)/g).forEach((p) => {
    if (!p) return;
    if (p.startsWith("**") && p.endsWith("**")) out.push({ texto: p.slice(2, -2), negrita: true });
    else out.push({ texto: p, negrita: false });
  });
  return out;
}

class Lienzo {
  pdf: PDFDocument;
  f: Fuentes;
  pagina!: PDFPage;
  y = 0;
  permitidos: Set<number>;

  constructor(
    pdf: PDFDocument,
    f: Fuentes,
    private doc: Documento,
    private enc: Encabezado,
  ) {
    this.pdf = pdf;
    this.f = f;
    this.permitidos = new Set([...f.normal.getCharacterSet(), ...f.negrita.getCharacterSet()]);
    this.nuevaPagina();
  }

  s = (t: string) => sanear(t, this.permitidos);

  nuevaPagina() {
    this.pagina = this.pdf.addPage(A4);
    const [w, h] = A4;
    const p = this.pagina;
    p.drawText(this.s(this.enc.empresa), { x: M.izq, y: h - 40, size: 11, font: this.f.negrita, color: C.marca });
    p.drawText(this.s(`RUC ${this.enc.ruc}`), { x: M.izq, y: h - 52, size: 8, font: this.f.normal, color: C.tenue });
    const ref = this.s(this.doc.referencia);
    p.drawText(ref, { x: w - M.der - this.f.negrita.widthOfTextAtSize(ref, 9), y: h - 44, size: 9, font: this.f.negrita, color: C.texto });
    p.drawLine({ start: { x: M.izq, y: h - 60 }, end: { x: w - M.der, y: h - 60 }, thickness: 0.6, color: C.linea });
    if (this.doc.marcaAgua) {
      const t = this.s(this.doc.marcaAgua);
      const size = 96;
      const tw = this.f.negrita.widthOfTextAtSize(t, size);
      p.drawText(t, { x: w / 2 - (tw / 2) * Math.cos(Math.PI / 5), y: h / 2 - (tw / 2) * Math.sin(Math.PI / 5), size, font: this.f.negrita, color: C.agua, opacity: 0.14, rotate: degrees(36) });
    }
    this.y = h - M.sup;
  }

  /** Asegura `alto` puntos libres; si no, salta de página. Devuelve true si saltó. */
  espacio(alto: number): boolean {
    if (this.y - alto < M.inf) {
      this.nuevaPagina();
      return true;
    }
    return false;
  }

  /** Corta un texto con negritas en líneas que caben en `ancho`. */
  lineas(texto: string, size: number, ancho: number, todoNegrita = false): Run[][] {
    const salida: Run[][] = [];
    for (const parrafo of this.s(texto).split("\n")) {
      let linea: Run[] = [];
      let w = 0;
      const palabras: Run[] = [];
      for (const r of runs(parrafo)) {
        for (const pal of r.texto.split(/(\s+)/)) if (pal) palabras.push({ texto: pal, negrita: todoNegrita || r.negrita });
      }
      for (const p of palabras) {
        const font = p.negrita ? this.f.negrita : this.f.normal;
        const esEspacio = /^\s+$/.test(p.texto);
        const texto = esEspacio ? " " : p.texto;
        const pw = font.widthOfTextAtSize(texto, size);
        if (esEspacio) {
          if (linea.length) {
            linea.push({ texto, negrita: p.negrita });
            w += pw;
          }
          continue;
        }
        if (w + pw > ancho && linea.length) {
          while (linea.length && linea.at(-1)!.texto === " ") linea.pop();
          salida.push(linea);
          linea = [];
          w = 0;
        }
        // Palabra más larga que la línea (ej. un código): se parte por caracteres.
        if (pw > ancho) {
          let trozo = "";
          for (const ch of texto) {
            if (font.widthOfTextAtSize(trozo + ch, size) > ancho) {
              salida.push([{ texto: trozo, negrita: p.negrita }]);
              trozo = "";
            }
            trozo += ch;
          }
          linea = [{ texto: trozo, negrita: p.negrita }];
          w = font.widthOfTextAtSize(trozo, size);
          continue;
        }
        linea.push({ texto, negrita: p.negrita });
        w += pw;
      }
      while (linea.length && linea.at(-1)!.texto === " ") linea.pop();
      salida.push(linea);
    }
    return salida;
  }

  anchoLinea(l: Run[], size: number) {
    return l.reduce((s, r) => s + (r.negrita ? this.f.negrita : this.f.normal).widthOfTextAtSize(r.texto, size), 0);
  }

  dibujarLinea(l: Run[], x: number, y: number, size: number, color = C.texto) {
    // Une los trozos seguidos con la misma fuente: un solo texto por tramo (mejor al copiar o buscar en el PDF).
    const tramos: Run[] = [];
    for (const r of l) {
      const ult = tramos.at(-1);
      if (ult && ult.negrita === r.negrita) ult.texto += r.texto;
      else tramos.push({ ...r });
    }
    for (const r of tramos) {
      const font = r.negrita ? this.f.negrita : this.f.normal;
      if (r.texto) this.pagina.drawText(r.texto, { x, y, size, font, color });
      x += font.widthOfTextAtSize(r.texto, size);
    }
  }

  /** Párrafo con saltos de página entre líneas. */
  parrafo(texto: string, o: { size?: number; x?: number; ancho?: number; alinear?: Alineacion; color?: ReturnType<typeof rgb>; negrita?: boolean; despues?: number } = {}) {
    const size = o.size ?? 9.5;
    const x0 = o.x ?? M.izq;
    const ancho = o.ancho ?? ANCHO;
    const alto = size * 1.38;
    for (const l of this.lineas(texto, size, ancho, o.negrita)) {
      this.espacio(alto);
      const lw = this.anchoLinea(l, size);
      const x = o.alinear === "centro" ? x0 + (ancho - lw) / 2 : o.alinear === "der" ? x0 + ancho - lw : x0;
      this.dibujarLinea(l, x, this.y - size, size, o.color);
      this.y -= alto;
    }
    this.y -= o.despues ?? 5;
  }

  titulo(texto: string) {
    this.espacio(40);
    this.parrafo(texto.toUpperCase(), { size: 13, alinear: "centro", negrita: true, color: C.marca, despues: 6 });
  }

  subtitulo(texto: string) {
    this.espacio(34);
    this.y -= 4;
    this.parrafo(texto, { size: 10.5, negrita: true, color: C.marca, despues: 4 });
  }

  clausula(titulo: string, texto: string) {
    // Evita dejar el título de la cláusula solo al final de la página.
    this.espacio(30);
    this.parrafo(`**${titulo}.** ${texto}`, { size: 9.2, despues: 6 });
  }

  aviso(texto: string) {
    const size = 8.5;
    const lineas = this.lineas(texto, size, ANCHO - 20, true);
    const alto = lineas.length * size * 1.4 + 12;
    this.espacio(alto + 6);
    this.pagina.drawRectangle({ x: M.izq, y: this.y - alto, width: ANCHO, height: alto, color: C.aviso });
    let y = this.y - 6 - size;
    for (const l of lineas) {
      this.dibujarLinea(l, M.izq + 10, y, size, C.avisoTexto);
      y -= size * 1.4;
    }
    this.y -= alto + 8;
  }

  destacado(etiqueta: string, valor: string, detalle?: string) {
    const alto = detalle ? 62 : 46;
    this.espacio(alto + 8);
    this.pagina.drawRectangle({ x: M.izq, y: this.y - alto, width: ANCHO, height: alto, color: C.fondo, borderColor: C.linea, borderWidth: 0.6 });
    this.pagina.drawText(this.s(etiqueta.toUpperCase()), { x: M.izq + 14, y: this.y - 16, size: 7.5, font: this.f.negrita, color: C.tenue });
    this.pagina.drawText(this.s(valor), { x: M.izq + 14, y: this.y - 38, size: 20, font: this.f.negrita, color: C.texto });
    if (detalle) this.pagina.drawText(this.s(detalle), { x: M.izq + 14, y: this.y - 53, size: 8, font: this.f.normal, color: C.tenue });
    this.y -= alto + 10;
  }

  datos(filas: [string, string][], columnas: 1 | 2) {
    const size = 8.8;
    const colAncho = columnas === 2 ? (ANCHO - 16) / 2 : ANCHO;
    const etiquetaAncho = columnas === 2 ? 96 : 110;
    const grupos: [string, string][][] = [];
    for (let i = 0; i < filas.length; i += columnas) grupos.push(filas.slice(i, i + columnas));
    this.y -= 2;
    for (const g of grupos) {
      const celdas = g.map(([k, v]) => ({ k: this.lineas(k, size - 0.8, etiquetaAncho - 6), v: this.lineas(v, size, colAncho - etiquetaAncho) }));
      const n = Math.max(...celdas.map((c) => Math.max(c.k.length, c.v.length)));
      const alto = n * size * 1.35 + 5;
      this.espacio(alto);
      celdas.forEach((c, i) => {
        const x = M.izq + i * (colAncho + 16);
        let y = this.y - size;
        for (const l of c.k) {
          this.dibujarLinea(l, x, y, size - 0.8, C.tenue);
          y -= size * 1.35;
        }
        y = this.y - size;
        for (const l of c.v) {
          this.dibujarLinea(l.map((r) => ({ ...r, negrita: true })), x + etiquetaAncho, y, size);
          y -= size * 1.35;
        }
      });
      this.y -= alto;
      this.pagina.drawLine({ start: { x: M.izq, y: this.y + 2 }, end: { x: M.izq + ANCHO, y: this.y + 2 }, thickness: 0.3, color: C.linea });
    }
    this.y -= 8;
  }

  tabla(b: Extract<Bloque, { t: "tabla" }>) {
    const size = 8;
    const total = b.columnas.reduce((s, c) => s + c.ancho, 0);
    const anchos = b.columnas.map((c) => (c.ancho / total) * ANCHO);
    const alto = size * 1.9;
    const fila = (celdas: string[], o: { negrita?: boolean; fondo?: ReturnType<typeof rgb>; color?: ReturnType<typeof rgb> }) => {
      if (o.fondo) this.pagina.drawRectangle({ x: M.izq, y: this.y - alto, width: ANCHO, height: alto, color: o.fondo });
      let x = M.izq;
      celdas.forEach((t, i) => {
        const font = o.negrita ? this.f.negrita : this.f.normal;
        let txt = this.s(t ?? "");
        const max = anchos[i] - 8;
        while (txt.length > 1 && font.widthOfTextAtSize(txt, size) > max) txt = txt.slice(0, -2) + "…";
        const tw = font.widthOfTextAtSize(txt, size);
        const al = b.columnas[i].alinear;
        const tx = al === "der" ? x + anchos[i] - 4 - tw : al === "centro" ? x + (anchos[i] - tw) / 2 : x + 4;
        this.pagina.drawText(txt, { x: tx, y: this.y - alto + size * 0.65, size, font, color: o.color ?? C.texto });
        x += anchos[i];
      });
      this.y -= alto;
    };
    const cabecera = () => fila(b.columnas.map((c) => c.titulo), { negrita: true, fondo: C.marca, color: rgb(1, 1, 1) });
    this.espacio(alto * 3);
    cabecera();
    b.filas.forEach((f, i) => {
      if (this.espacio(alto)) cabecera();
      fila(f, { fondo: i % 2 ? C.fondo : undefined });
    });
    if (b.total) {
      if (this.espacio(alto)) cabecera();
      this.pagina.drawLine({ start: { x: M.izq, y: this.y }, end: { x: M.izq + ANCHO, y: this.y }, thickness: 0.8, color: C.texto });
      fila(b.total, { negrita: true });
    }
    this.y -= 10;
  }

  firmas(firmas: Firma[]) {
    const porFila = 2;
    const gap = 30;
    const ancho = (ANCHO - gap) / porFila;
    const alto = 118;
    for (let i = 0; i < firmas.length; i += porFila) {
      this.espacio(alto);
      firmas.slice(i, i + porFila).forEach((f, j) => {
        const x = M.izq + j * (ancho + gap);
        const yLinea = this.y - 62;
        const anchoLinea = f.huella ? ancho - 64 : ancho;
        this.pagina.drawLine({ start: { x, y: yLinea }, end: { x: x + anchoLinea, y: yLinea }, thickness: 0.7, color: C.texto });
        if (f.huella) {
          this.pagina.drawRectangle({ x: x + ancho - 52, y: yLinea - 6, width: 52, height: 62, borderColor: C.linea, borderWidth: 0.8 });
          this.pagina.drawText("Huella", { x: x + ancho - 41, y: yLinea - 16, size: 7, font: this.f.normal, color: C.tenue });
        }
        let y = yLinea - 12;
        for (const [t, font, size, color] of [
          [f.rol, this.f.negrita, 7.5, C.tenue],
          [f.nombre, this.f.negrita, 8.5, C.texto],
          [f.documento, this.f.normal, 8, C.texto],
        ] as const) {
          for (const l of this.lineas(t, size, anchoLinea)) {
            this.dibujarLinea(l.map((r) => ({ ...r, negrita: font === this.f.negrita })), x, y, size, color);
            y -= size * 1.3;
          }
        }
      });
      this.y -= alto;
    }
  }

  bloque(b: Bloque) {
    switch (b.t) {
      case "titulo": return this.titulo(b.texto);
      case "subtitulo": return this.subtitulo(b.texto);
      case "parrafo": return this.parrafo(b.texto, { size: b.tamano, alinear: b.alinear });
      case "clausula": return this.clausula(b.titulo, b.texto);
      case "datos": return this.datos(b.filas, b.columnas ?? 1);
      case "tabla": return this.tabla(b);
      case "firmas": return this.firmas(b.firmas);
      case "aviso": return this.aviso(b.texto);
      case "destacado": return this.destacado(b.etiqueta, b.valor, b.detalle);
      case "espacio": this.y -= b.alto ?? 14; return;
      case "salto": this.nuevaPagina(); return;
    }
  }

  pies() {
    const paginas = this.pdf.getPages();
    paginas.forEach((p, i) => {
      const pie = this.s(this.doc.pie);
      const num = `Página ${i + 1} de ${paginas.length}`;
      p.drawLine({ start: { x: M.izq, y: 44 }, end: { x: A4[0] - M.der, y: 44 }, thickness: 0.4, color: C.linea });
      let texto = pie;
      while (texto.length > 1 && this.f.normal.widthOfTextAtSize(texto, 7) > ANCHO - 70) texto = texto.slice(0, -2) + "…";
      p.drawText(texto, { x: M.izq, y: 32, size: 7, font: this.f.normal, color: C.tenue });
      p.drawText(num, { x: A4[0] - M.der - this.f.normal.widthOfTextAtSize(num, 7), y: 32, size: 7, font: this.f.normal, color: C.tenue });
    });
  }
}

/** Genera los bytes del PDF. */
export async function renderizarPdf(doc: Documento, enc: Encabezado): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.titulo);
  pdf.setAuthor(enc.empresa);
  pdf.setCreator("Panel Inversiones JP");
  pdf.setProducer("Inversiones JP");
  pdf.setLanguage("es-PE");
  const f = { normal: await pdf.embedFont(StandardFonts.Helvetica), negrita: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const l = new Lienzo(pdf, f, doc, enc);
  for (const b of doc.bloques) l.bloque(b);
  l.pies();
  return pdf.save();
}
