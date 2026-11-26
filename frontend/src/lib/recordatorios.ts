/**
 * Recordatorios de pago por WhatsApp (mensaje prearmado que el personal envía desde su celular con wa.me).
 * Funciones puras: las usan la ficha del cliente, la página de Cobranzas y los tests.
 */
import { siteConfig } from "./config";
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
  /** Moto, motocar, torito o celular financiado (opcional). */
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

export function mensajeRecordatorio(d: DatosRecordatorio): string {
  const conSaldo = d.pendientes.filter((c) => c.saldo > 0.004);
  const tipo = tipoRecordatorio(d);
  const credito = `tu crédito ${d.codigo}${d.producto ? ` (${d.producto})` : ""}`;
  const lineas = [`Hola ${primerNombre(d.nombres)}, te saluda ${siteConfig.name}.`];

  if (tipo === "MORA") {
    const vencidas = conSaldo.filter((c) => c.fecha < d.hoy);
    const total = vencidas.reduce((s, c) => s + c.saldo, 0);
    const dias = diasEntre(vencidas[0].fecha, d.hoy);
    lineas.push(
      vencidas.length === 1
        ? `Tu cuota N.° ${vencidas[0].numero} de ${credito} venció el ${fechaLarga(vencidas[0].fecha)} (hace ${dias} día${dias === 1 ? "" : "s"}). Saldo pendiente: ${soles(total)}.`
        : `Tienes ${vencidas.length} cuotas vencidas de ${credito} (N.° ${vencidas.map((c) => c.numero).join(", ")}). Total pendiente: ${soles(total)}. La más antigua venció hace ${dias} días.`,
      "Te pedimos regularizar tu pago lo antes posible para evitar más penalidades.",
    );
    const hoy = conSaldo.find((c) => c.fecha === d.hoy);
    if (hoy) lineas.push(`Además, hoy vence tu cuota N.° ${hoy.numero} por ${soles(hoy.saldo)}.`);
  } else if (tipo === "VENCE_HOY") {
    const c = conSaldo.find((x) => x.fecha === d.hoy)!;
    lineas.push(`Te recordamos que hoy vence tu cuota N.° ${c.numero} de ${d.numeroCuotas} de ${credito} por ${soles(c.saldo)}.`);
  } else if (tipo === "POR_VENCER") {
    const c = conSaldo[0];
    lineas.push(`Te recordamos que tu cuota N.° ${c.numero} de ${d.numeroCuotas} de ${credito} vence el ${fechaLarga(c.fecha)} por ${soles(c.saldo)}.`);
  } else {
    lineas.push(`Tu crédito ${d.codigo} no tiene cuotas pendientes. ¡Gracias por tu puntualidad!`);
    return lineas.join("\n");
  }

  lineas.push(
    "Puedes pagar con Yape, Plin, transferencia o en efectivo con nuestro cobrador (siempre con recibo).",
    "Si ya pagaste, envíanos tu comprobante por aquí. ¡Gracias!",
  );
  return lineas.join("\n");
}

/** Enlace wa.me al celular del cliente, o null si no tiene un celular peruano válido. */
export function enlaceRecordatorio(telefono: string | null | undefined, mensaje: string): string | null {
  const cel = normalizarCelular(telefono ?? "");
  return cel ? `https://wa.me/51${cel}?text=${encodeURIComponent(mensaje)}` : null;
}
