/**
 * Recordatorios de pago por WhatsApp (mensaje prearmado que el personal envía desde su celular con wa.me).
 * Funciones puras: las usan la ficha del cliente, la página de Cobranzas y los tests.
 */
import { normalizarCelular } from "./clientes";

export interface CuotaPendiente {
  numero: number;
  /** Fecha de vencimiento en formato AAAA-MM-DD. */
  fecha: string;
  /** Lo que falta pagar de la cuota (cuota + mora − pagado). */
  saldo: number;
}

export interface DatosRecordatorio {
  nombres: string;
  codigo: string;
  /** Moto, motokar, torito o celular financiado (opcional). */
  producto?: string | null;
  numeroCuotas: number;
  /** Cuotas con saldo, en orden de vencimiento. */
  pendientes: CuotaPendiente[];
  /** Fecha de hoy (AAAA-MM-DD, hora de Lima). */
  hoy: string;
}

export type TipoRecordatorio = "MORA" | "VENCE_HOY" | "POR_VENCER" | "AL_DIA";

const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** «jueves 28 de noviembre» a partir de AAAA-MM-DD (sin desfases de zona horaria). */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("es-PE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

export const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

/** Clasifica la situación del crédito para elegir el tono del mensaje. */
export function tipoRecordatorio(d: Pick<DatosRecordatorio, "pendientes" | "hoy">): TipoRecordatorio {
  const conSaldo = d.pendientes.filter((c) => c.saldo > 0.004);
  if (conSaldo.some((c) => c.fecha < d.hoy)) return "MORA";
  if (conSaldo.some((c) => c.fecha === d.hoy)) return "VENCE_HOY";
  return conSaldo.length ? "POR_VENCER" : "AL_DIA";
}

/** Primer nombre con mayúscula inicial («JUAN CARLOS» → «Juan»). */
const primerNombre = (nombres: string) => {
  const n = nombres.trim().split(/\s+/)[0] ?? "";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

/** Lista natural: «2», «2 y 3», «2, 3 y 4». */
const lista = (ns: number[]) => (ns.length <= 1 ? String(ns[0] ?? "") : `${ns.slice(0, -1).join(", ")} y ${ns[ns.length - 1]}`);

/**
 * Mensaje corto y directo (sin código de crédito ni firma), p. ej.:
 * «Hola Antonio, te recordamos que hoy vence tu cuota número 3 de S/ 300.00. Puedes pagarla por Yape, Plin,
 *  transferencia o en efectivo. Si ya pagaste, envíanos tu comprobante. ¡Gracias!»
 */
export function mensajeRecordatorio(d: DatosRecordatorio): string {
  const conSaldo = d.pendientes.filter((c) => c.saldo > 0.004);
  const tipo = tipoRecordatorio(d);
  const hola = `Hola ${primerNombre(d.nombres)},`;
  const cierre = "Puedes pagarla por Yape, Plin, transferencia o en efectivo. Si ya pagaste, envíanos tu comprobante. ¡Gracias!";

  if (tipo === "AL_DIA") return `${hola} no tienes cuotas pendientes. ¡Gracias por tu puntualidad!`;

  if (tipo === "VENCE_HOY") {
    const c = conSaldo.find((x) => x.fecha === d.hoy)!;
    return `${hola} te recordamos que hoy vence tu cuota número ${c.numero} de ${soles(c.saldo)}. ${cierre}`;
  }

  if (tipo === "POR_VENCER") {
    const c = conSaldo[0];
    return `${hola} te recordamos que el ${fechaLarga(c.fecha)} vence tu cuota número ${c.numero} de ${soles(c.saldo)}. ${cierre}`;
  }

  // MORA
  const vencidas = conSaldo.filter((c) => c.fecha < d.hoy);
  const total = vencidas.reduce((s, c) => s + c.saldo, 0);
  const hoy = conSaldo.find((c) => c.fecha === d.hoy);
  const texto =
    vencidas.length === 1
      ? `${hola} te recordamos que tu cuota número ${vencidas[0].numero} de ${soles(total)} venció el ${fechaLarga(vencidas[0].fecha)}.`
      : `${hola} te recordamos que tienes ${vencidas.length} cuotas vencidas (número ${lista(vencidas.map((c) => c.numero))}) por un total de ${soles(total)}.`;
  const extra = hoy ? ` Además, hoy vence tu cuota número ${hoy.numero} de ${soles(hoy.saldo)}.` : "";
  return `${texto}${extra} ${cierre.replace("pagarla", vencidas.length > 1 || hoy ? "pagarlas" : "pagarla")}`;
}

/** Enlace wa.me al celular del cliente, o null si no tiene un celular peruano válido. */
export function enlaceRecordatorio(telefono: string | null | undefined, mensaje: string): string | null {
  const cel = normalizarCelular(telefono ?? "");
  return cel ? `https://wa.me/51${cel}?text=${encodeURIComponent(mensaje)}` : null;
}
