/**
 * Calendario de cobro: los domingos y los feriados NO se cobran.
 * Toda fecha de vencimiento que caiga en domingo o feriado pasa al siguiente día hábil.
 * Las fechas se manejan como texto AAAA-MM-DD (sin horas) para evitar desfases de zona horaria.
 *
 * La lista vigente de feriados vive en la base (configuracion.feriados) y se edita desde el panel;
 * `feriadosNacionales()` genera la lista oficial de un año como punto de partida.
 */
import type { Frecuencia } from "./finance";

const aFecha = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const aIso = (f: Date) => f.toISOString().slice(0, 10);

export const sumarDias = (iso: string, dias: number) => {
  const f = aFecha(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return aIso(f);
};

/** Mismo día del mes `meses` después; si ese día no existe (31 → febrero), el último día del mes. */
export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return aIso(new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimoDia))));
}

export const esFechaIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && aIso(aFecha(v)) === v;
export const esDomingo = (iso: string) => aFecha(iso).getUTCDay() === 0;
export const esDiaHabil = (iso: string, feriados: ReadonlySet<string>) => !esDomingo(iso) && !feriados.has(iso);

/** La misma fecha si es día hábil; si no, el siguiente día hábil. */
export function siguienteDiaHabil(iso: string, feriados: ReadonlySet<string>): string {
  let f = iso;
  for (let i = 0; i < 30 && !esDiaHabil(f, feriados); i++) f = sumarDias(f, 1);
  return f;
}

/**
 * Fechas de vencimiento de un cronograma.
 *   · DIARIO: días hábiles consecutivos (lunes a sábado sin feriados) desde el primer vencimiento.
 *   · SEMANAL / QUINCENAL: cada 7 / 15 días; MENSUAL: el mismo día de cada mes.
 *     Las fechas nominales se calculan desde el primer vencimiento (los corrimientos no se acumulan) y, si caen en
 *     domingo o feriado, se mueven al siguiente día hábil.
 * Garantiza fechas estrictamente crecientes.
 */
export function fechasCronograma(primerVencimiento: string, numeroCuotas: number, frecuencia: Frecuencia, feriados: ReadonlySet<string>): string[] {
  if (!esFechaIso(primerVencimiento)) throw new Error("Fecha de primer vencimiento no válida");
  const fechas: string[] = [];
  let anterior = "";
  for (let k = 0; k < numeroCuotas; k++) {
    let f: string;
    if (frecuencia === "DIARIO") f = siguienteDiaHabil(k === 0 ? primerVencimiento : sumarDias(anterior, 1), feriados);
    else {
      const nominal =
        frecuencia === "MENSUAL" ? sumarMeses(primerVencimiento, k) : sumarDias(primerVencimiento, k * (frecuencia === "SEMANAL" ? 7 : 15));
      f = siguienteDiaHabil(nominal, feriados);
      if (f <= anterior) f = siguienteDiaHabil(sumarDias(anterior, 1), feriados);
    }
    fechas.push(f);
    anterior = f;
  }
  return fechas;
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Feriados nacionales del Perú (Decreto Legislativo 713 y modificatorias, incluidos los añadidos en 2022). */
export function feriadosNacionales(anio: number): { fecha: string; nombre: string }[] {
  const pascua = domingoDePascua(anio);
  const fijos: [string, string][] = [
    ["01-01", "Año Nuevo"],
    ["05-01", "Día del Trabajo"],
    ["06-07", "Batalla de Arica y Día de la Bandera"],
    ["06-29", "San Pedro y San Pablo"],
    ["07-23", "Día de la Fuerza Aérea del Perú"],
    ["07-28", "Fiestas Patrias"],
    ["07-29", "Fiestas Patrias"],
    ["08-06", "Batalla de Junín"],
    ["08-30", "Santa Rosa de Lima"],
    ["10-08", "Combate de Angamos"],
    ["11-01", "Día de Todos los Santos"],
    ["12-08", "Inmaculada Concepción"],
    ["12-09", "Batalla de Ayacucho"],
    ["12-25", "Navidad"],
  ];
  return [
    ...fijos.map(([md, nombre]) => ({ fecha: `${anio}-${md}`, nombre })),
    { fecha: sumarDias(pascua, -3), nombre: "Jueves Santo" },
    { fecha: sumarDias(pascua, -2), nombre: "Viernes Santo" },
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/**
 * Lee la lista editable del panel: una fecha por línea («2026-12-25 Navidad» o solo «2026-12-25»).
 * Devuelve las fechas ordenadas y sin duplicados, o el número de línea con error.
 */
export function parsearFeriados(texto: string): { fechas: string[] } | { error: string } {
  const fechas = new Set<string>();
  for (const [i, linea] of texto.split(/\r?\n/).entries()) {
    const t = linea.trim();
    if (!t) continue;
    const fecha = t.slice(0, 10);
    if (!esFechaIso(fecha) || (t.length > 10 && !/^\s/.test(t.slice(10)))) return { error: `Línea ${i + 1}: usa el formato AAAA-MM-DD (ej. 2026-12-25 Navidad)` };
    fechas.add(fecha);
  }
  return { fechas: [...fechas].sort() };
}
