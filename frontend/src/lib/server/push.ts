import "server-only";
import webpush, { WebPushError, type PushSubscription } from "web-push";
import { tiposDe } from "@/lib/areas";
import type { Rol } from "@/lib/roles";
import { sql } from "./db";
import { leerPendientes, textoCobranza } from "./pendientes";

/**
 * Avisos de cobranza por Web Push: llegan al celular o la computadora del personal aunque la
 * pestaña del panel esté cerrada (el navegador los recibe en segundo plano con el service worker /sw.js).
 *
 *   · Claves VAPID: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY si están definidas; si no, se generan una vez
 *     y se guardan en public.push_clave (solo servidor).
 *   · Envío programado: /api/cron/avisos-cobranza (mañana y tarde, ver vercel.json). Cada tramo se envía
 *     una sola vez por día aunque el endpoint se llame varias veces.
 */

let claves: Promise<{ publica: string; privada: string }> | null = null;

async function cargarClaves() {
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) return { publica: envPub, privada: envPriv };
  const db = sql();
  const [fila] = await db<{ publica: string; privada: string }[]>`select publica, privada from public.push_clave`;
  if (fila) return fila;
  const nuevas = webpush.generateVAPIDKeys();
  await db`insert into public.push_clave (publica, privada) values (${nuevas.publicKey}, ${nuevas.privateKey}) on conflict (id) do nothing`;
  const [guardada] = await db<{ publica: string; privada: string }[]>`select publica, privada from public.push_clave`;
  return guardada;
}

function clavesVapid() {
  claves ??= cargarClaves().catch((e) => {
    claves = null;
    throw e;
  });
  return claves;
}

/** Clave pública para que el navegador se suscriba (o null si la base aún no tiene la tabla). */
export async function clavePublicaPush(): Promise<string | null> {
  try {
    return (await clavesVapid()).publica;
  } catch (e) {
    console.error("[push] Sin claves VAPID (¿falta la migración 20261211000300_avisos_push?):", (e as Error).message);
    return null;
  }
}

export async function guardarSuscripcion(usuarioId: string, s: PushSubscription, userAgent: string | null) {
  await sql()`
    insert into public.push_suscripcion (usuario_id, endpoint, p256dh, auth, user_agent)
    values (${usuarioId}, ${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth}, ${userAgent?.slice(0, 300) ?? null})
    on conflict (endpoint) do update
      set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth,
          user_agent = excluded.user_agent, fallos = 0`;
}

export async function quitarSuscripcion(usuarioId: string, endpoint: string) {
  await sql()`delete from public.push_suscripcion where endpoint = ${endpoint} and usuario_id = ${usuarioId}`;
}

export interface Aviso {
  titulo: string;
  cuerpo: string;
  url: string;
  etiqueta?: string;
}

/**
 * Envía un aviso a las suscripciones indicadas (por defecto, todas las del personal activo). Devuelve cuántas lo recibieron.
 * `destino`: un usuario (id) o una lista de usuarios.
 */
export async function enviarAviso(aviso: Aviso, destino?: string | string[]): Promise<{ enviados: number; fallidos: number }> {
  const usuarios = destino == null ? null : Array.isArray(destino) ? destino : [destino];
  const { publica, privada } = await clavesVapid();
  const db = sql();
  const subs = await db<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
    select s.id, s.endpoint, s.p256dh, s.auth
    from public.push_suscripcion s
    join auth.users u on u.id = s.usuario_id and u.activo
    join public.perfil_usuario p on p.id = u.id and p.activo
    where ${usuarios == null} or s.usuario_id::text = any(${usuarios ?? []})`;
  const contacto = process.env.VAPID_SUBJECT?.trim() || "mailto:avisos@inversionesjp.pe";
  const carga = JSON.stringify({ title: aviso.titulo, body: aviso.cuerpo, url: aviso.url, tag: aviso.etiqueta ?? "jp-aviso" });

  let enviados = 0;
  let fallidos = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
          vapidDetails: { subject: contacto, publicKey: publica, privateKey: privada },
          TTL: 6 * 60 * 60,
          urgency: "high",
        });
        enviados++;
        await db`update public.push_suscripcion set ultimo_envio = now(), fallos = 0 where id = ${s.id}`;
      } catch (e) {
        fallidos++;
        const estado = e instanceof WebPushError ? e.statusCode : 0;
        // 404/410: el navegador anuló la suscripción (se desinstaló, se borraron datos…). Otros errores: se reintenta.
        if (estado === 404 || estado === 410) await db`delete from public.push_suscripcion where id = ${s.id}`;
        else await db`update public.push_suscripcion set fallos = fallos + 1 where id = ${s.id}`;
        await db`delete from public.push_suscripcion where id = ${s.id} and fallos >= 10`;
      }
    }),
  );
  return { enviados, fallidos };
}

export type Tramo = "manana" | "tarde";

/** Tramo del día en Lima: desde las 3 p. m. es «tarde». */
export const tramoActual = (): Tramo =>
  Number(new Date().toLocaleString("en-US", { timeZone: "America/Lima", hour: "numeric", hour12: false })) >= 15 ? "tarde" : "manana";

/**
 * Aviso de cobranzas del día (vencen hoy + en mora). Se envía una sola vez por tramo y día:
 * la marca se guarda en configuracion.avisos_push_enviados.
 */
export async function enviarAvisoCobranza(tramo: Tramo = tramoActual()) {
  const db = sql();
  const p = await leerPendientes(db);
  const marca = `${p.hoy}:${tramo}`;
  const [{ nuevo }] = await db<{ nuevo: boolean }[]>`
    with previo as (select valor #>> '{}' as v from public.configuracion where clave = 'avisos_push_enviados'),
         up as (
           insert into public.configuracion (clave, valor) values ('avisos_push_enviados', to_jsonb(${marca}::text))
           on conflict (clave) do update set valor = excluded.valor
           where public.configuracion.valor #>> '{}' is distinct from ${marca}
           returning 1)
    select exists (select 1 from up) as nuevo`;
  if (!nuevo) return { tramo, omitido: "ya se envió este tramo hoy" as const };

  // Cada administrador de área recibe solo los números de su área; el resto del personal, los de toda la cartera.
  const personas = await db<{ id: string; rol: Rol }[]>`
    select distinct p.id, p.rol from public.push_suscripcion s
    join auth.users u on u.id = s.usuario_id and u.activo
    join public.perfil_usuario p on p.id = u.id and p.activo`;
  const grupos = new Map<string, { tipos: string[]; usuarios: string[] }>();
  for (const per of personas) {
    const tipos = tiposDe(per.rol);
    const clave = tipos.join(",");
    const g = grupos.get(clave) ?? { tipos, usuarios: [] };
    g.usuarios.push(per.id);
    grupos.set(clave, g);
  }

  let enviados = 0;
  let fallidos = 0;
  for (const g of grupos.values()) {
    const pg = g.tipos.length === 3 ? p : await leerPendientes(db, g.tipos);
    const texto = textoCobranza(pg);
    if (!texto) continue;
    const r = await enviarAviso({
      titulo: tramo === "manana" ? "Cobranzas de hoy · Inversiones JP" : "Siguen cobranzas pendientes · Inversiones JP",
      cuerpo: `${texto}. Toca para ver a quién cobrar.`,
      url: pg.mora > 0 && pg.vencen_hoy === 0 ? "/admin/cobranzas?ver=mora" : "/admin/cobranzas",
      etiqueta: "jp-cobranzas",
    }, g.usuarios);
    enviados += r.enviados;
    fallidos += r.fallidos;
  }
  if (!enviados && !fallidos && !textoCobranza(p)) return { tramo, omitido: "no hay cobranzas pendientes" as const };
  return { tramo, enviados, fallidos };
}
