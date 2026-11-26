import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { aCsv, aXlsx, crc32, letraColumna, neutralizar, zipSinCompresion } from "../exportar";
import type { Columna } from "../reportes";

interface F { nombre: string; monto: number; fecha: string }
const COLS: Columna<F>[] = [
  { titulo: "Nombre", tipo: "texto", valor: (f) => f.nombre },
  { titulo: "Monto (S/)", tipo: "soles", valor: (f) => f.monto },
  { titulo: "Fecha", tipo: "fecha", valor: (f) => f.fecha },
];

/** Lee un ZIP "stored" (o deflate) sin dependencias: nombre → contenido. */
function leerZip(b: Uint8Array): Record<string, string> {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const fin = b.length - 22;
  expect(dv.getUint32(fin, true)).toBe(0x06054b50);
  const n = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const out: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    expect(dv.getUint32(p, true)).toBe(0x02014b50);
    const metodo = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true);
    const tam = dv.getUint32(p + 20, true);
    const ln = dv.getUint16(p + 28, true);
    const off = dv.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(b.subarray(p + 46, p + 46 + ln));
    const lnLocal = dv.getUint16(off + 26, true);
    let datos = b.subarray(off + 30 + lnLocal, off + 30 + lnLocal + tam);
    if (metodo === 8) datos = inflateRawSync(datos);
    expect(crc32(datos)).toBe(crc);
    out[nombre] = new TextDecoder().decode(datos);
    p += 46 + ln;
  }
  return out;
}

describe("neutralizar (inyección de fórmulas)", () => {
  it("antepone apóstrofo a = + - @ tab y retorno", () => {
    for (const s of ["=HYPERLINK(\"x\")", "+51 999", "-2+3", "@SUM(A1)", "\tx", "\rx"]) expect(neutralizar(s)).toBe(`'${s}`);
    expect(neutralizar("Ana Pérez")).toBe("Ana Pérez");
  });
});

describe("aCsv", () => {
  it("BOM UTF-8, comillas RFC 4180, números sin formato y fórmulas neutralizadas", () => {
    const csv = aCsv(COLS, [
      { nombre: 'Ñandú, "el bueno"', monto: 1234.567, fecha: "2026-11-26" },
      { nombre: "=1+1", monto: 0, fecha: "2026-11-27" },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Nombre,Monto (S/),Fecha",
      '"Ñandú, ""el bueno""",1234.57,2026-11-26',
      "'=1+1,0,2026-11-27",
      "",
    ]);
  });
});

describe("crc32 y zip", () => {
  it("crc32 conocido", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
  it("letras de columna", () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(letraColumna)).toEqual(["A", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
  it("el zip se puede leer y conserva nombres UTF-8", () => {
    const z = zipSinCompresion([["a.txt", new TextEncoder().encode("hola")], ["carpeta/ñ.xml", new TextEncoder().encode("<x/>")]]);
    expect(leerZip(z)).toEqual({ "a.txt": "hola", "carpeta/ñ.xml": "<x/>" });
  });
});

describe("aXlsx", () => {
  const filas: F[] = [
    { nombre: "Ana & <Luis>", monto: 10.005, fecha: "2026-11-26" },
    { nombre: "@peligro", monto: 2500, fecha: "2026-11-27" },
  ];
  const xlsx = aXlsx("Cobranzas: nov/2026", COLS, filas, ["Inversiones JP · Reporte", "Del 01 al 30"]);
  const partes = leerZip(xlsx);

  it("contiene las partes mínimas de un libro de Excel", () => {
    expect(Object.keys(partes).sort()).toEqual(
      ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"].sort(),
    );
    // El nombre de la hoja no admite : / ni más de 31 caracteres
    expect(partes["xl/workbook.xml"]).toContain('name="Cobranzas  nov 2026"');
  });

  it("escapa XML, guarda montos como números y neutraliza fórmulas", () => {
    const hoja = partes["xl/worksheets/sheet1.xml"];
    expect(hoja).toContain("Ana &amp; &lt;Luis&gt;");
    expect(hoja).toContain('<c r="B5" s="2"><v>10.01</v></c>');
    expect(hoja).toContain('<c r="B6" s="2"><v>2500</v></c>');
    expect(hoja).toContain("'@peligro");
    expect(hoja).toContain('<autoFilter ref="A4:C6"/>');
    expect(hoja).toContain('ySplit="4"');
  });

  it("es un .xlsx válido para un lector real (Python zipfile + XML) si está disponible", () => {
    const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
    const archivo = join(dir, "r.xlsx");
    writeFileSync(archivo, xlsx);
    let salida: string;
    try {
      salida = execFileSync("python3", ["-I", "-c",
        "import sys,zipfile,xml.dom.minidom as m;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;" +
        "[m.parseString(z.read(n)) for n in z.namelist()];print('ok',len(z.namelist()))", archivo], { encoding: "utf8" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return; // sin Python: se omite
      throw e;
    }
    expect(salida.trim()).toBe("ok 6");
  });
});
