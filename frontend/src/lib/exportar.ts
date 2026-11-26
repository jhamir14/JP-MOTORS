/**
 * Exportación de tablas a CSV y a Excel (.xlsx) sin dependencias.
 *   · CSV: UTF-8 con BOM (Excel muestra bien tildes y ñ), separador coma, comillas RFC 4180.
 *   · XLSX: SpreadsheetML mínimo dentro de un ZIP sin compresión (método "stored"); números como
 *     números (se pueden sumar en Excel) y fechas como texto AAAA-MM-DD.
 *   · Ambos neutralizan la "inyección de fórmulas": un texto que empieza con = + - @ (o tab / retorno)
 *     se antepone con un apóstrofo para que Excel no lo ejecute.
 */
import type { Columna } from "./reportes";

const PELIGROSO = /^[=+\-@\t\r]/;
export const neutralizar = (s: string) => (PELIGROSO.test(s) ? `'${s}` : s);

/** Quita caracteres de control que rompen el XML o el CSV (deja tab, salto de línea y retorno). */
const limpiar = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");

function celdaTexto(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  return neutralizar(limpiar(String(v)));
}

// ───────────────────────── CSV ─────────────────────────
const comillas = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function aCsv<T>(columnas: Columna<T>[], filas: T[]): string {
  const lineas = [columnas.map((c) => comillas(c.titulo)).join(",")];
  for (const f of filas) {
    lineas.push(
      columnas
        .map((c) => {
          const v = c.valor(f);
          if (typeof v === "number" && (c.tipo === "numero" || c.tipo === "soles")) return Number.isFinite(v) ? String(c.tipo === "soles" ? Math.round(v * 100) / 100 : v) : "";
          return comillas(celdaTexto(v));
        })
        .join(","),
    );
  }
  return "﻿" + lineas.join("\r\n") + "\r\n";
}

// ───────────────────────── XLSX ─────────────────────────
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Letra de columna de Excel: 0 → A, 25 → Z, 26 → AA. */
export function letraColumna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function aXlsx<T>(nombreHoja: string, columnas: Columna<T>[], filas: T[], encabezado: string[] = []): Uint8Array {
  // Estilos: 0 normal · 1 encabezado (negrita) · 2 moneda 0.00 · 3 título (negrita, más grande)
  const filasXml: string[] = [];
  let r = 0;
  const fila = (celdas: string[]) => {
    r++;
    filasXml.push(`<row r="${r}">${celdas.join("")}</row>`);
  };
  const texto = (c: number, v: string, estilo = 0) =>
    `<c r="${letraColumna(c)}${r + 1}" t="inlineStr"${estilo ? ` s="${estilo}"` : ""}><is><t xml:space="preserve">${xml(celdaTexto(v))}</t></is></c>`;
  const numero = (c: number, v: number, estilo = 0) => `<c r="${letraColumna(c)}${r + 1}"${estilo ? ` s="${estilo}"` : ""}><v>${v}</v></c>`;

  encabezado.forEach((linea, i) => fila([texto(0, linea, i === 0 ? 3 : 0)]));
  if (encabezado.length) fila([]);
  fila(columnas.map((c, i) => texto(i, c.titulo, 1)));
  for (const f of filas) {
    fila(
      columnas.map((c, i) => {
        const v = c.valor(f);
        if (typeof v === "number" && Number.isFinite(v) && (c.tipo === "numero" || c.tipo === "soles"))
          return numero(i, c.tipo === "soles" ? Math.round(v * 100) / 100 : v, c.tipo === "soles" ? 2 : 0);
        return texto(i, v === null || v === undefined ? "" : String(v));
      }),
    );
  }
  const anchos = columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(45, Math.max(10, c.titulo.length + 2, c.tipo === "texto" ? 18 : 12))}" customWidth="1"/>`).join("");
  const filaEnc = encabezado.length ? encabezado.length + 2 : 1;
  const hoja =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${filaEnc}" topLeftCell="A${filaEnc + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${anchos}</cols><sheetData>${filasXml.join("")}</sheetData>` +
    (columnas.length ? `<autoFilter ref="A${filaEnc}:${letraColumna(columnas.length - 1)}${Math.max(filaEnc, r)}"/>` : "") +
    `</worksheet>`;
  const hojaNombre = xml(nombreHoja.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Reporte");

  const archivos: [string, string][] = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${hojaNombre}" sheetId="1" r:id="rId1"/></sheets>` +
        (columnas.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${hojaNombre.replace(/'/g, "''")}'!$A$${filaEnc}:$${letraColumna(columnas.length - 1)}$${Math.max(filaEnc, r)}</definedName></definedNames>` : "") +
        `</workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>` +
        `<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
        `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
        `</styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", hoja],
  ];
  return zipSinCompresion(archivos.map(([n, c]) => [n, new TextEncoder().encode(c)]));
}

// ───────────────────────── ZIP (stored) ─────────────────────────
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipSinCompresion(archivos: [string, Uint8Array][]): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // Fecha DOS fija (1980-01-01): el contenido es reproducible.
  const hora = 0, fecha = (0 << 9) | (1 << 5) | 1;
  for (const [nombre, datos] of archivos) {
    const n = new TextEncoder().encode(nombre);
    const crc = crc32(datos);
    const local = new Uint8Array(30 + n.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true); // nombres en UTF-8
    dv.setUint16(8, 0, true); // stored
    dv.setUint16(10, hora, true);
    dv.setUint16(12, fecha, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, datos.length, true);
    dv.setUint32(22, datos.length, true);
    dv.setUint16(26, n.length, true);
    dv.setUint16(28, 0, true);
    local.set(n, 30);
    partes.push(local, datos);

    const c = new Uint8Array(46 + n.length);
    const dc = new DataView(c.buffer);
    dc.setUint32(0, 0x02014b50, true);
    dc.setUint16(4, 20, true);
    dc.setUint16(6, 20, true);
    dc.setUint16(8, 0x0800, true);
    dc.setUint16(10, 0, true);
    dc.setUint16(12, hora, true);
    dc.setUint16(14, fecha, true);
    dc.setUint32(16, crc, true);
    dc.setUint32(20, datos.length, true);
    dc.setUint32(24, datos.length, true);
    dc.setUint16(28, n.length, true);
    dc.setUint32(42, offset, true);
    c.set(n, 46);
    central.push(c);
    offset += local.length + datos.length;
  }
  const tamCentral = central.reduce((a, c) => a + c.length, 0);
  const fin = new Uint8Array(22);
  const df = new DataView(fin.buffer);
  df.setUint32(0, 0x06054b50, true);
  df.setUint16(8, archivos.length, true);
  df.setUint16(10, archivos.length, true);
  df.setUint32(12, tamCentral, true);
  df.setUint32(16, offset, true);
  const total = offset + tamCentral + fin.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const x of [...partes, ...central, fin]) {
    out.set(x, p);
    p += x.length;
  }
  return out;
}
