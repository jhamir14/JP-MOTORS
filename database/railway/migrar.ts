/**
 * Inversiones JP · Migración en Railway (se ejecuta como Railway Function, runtime Bun).
 *
 * 1. Aplica en PostgreSQL las migraciones de database/migrations que falten (tabla public._migraciones).
 * 2. Si IMPORTAR_LEGADO=1, copia los datos del sistema anterior leyéndolos DIRECTO del MySQL en vivo
 *    (misma lógica que database/importar_legado.py). Es idempotente: UUID deterministas + ON CONFLICT DO NOTHING.
 *
 * Variables (referencias de Railway, nunca valores escritos a mano):
 *   DATABASE_URL = ${{Postgres.DATABASE_URL}}
 *   MYSQL_URL    = ${{MySQL.MYSQL_URL}}
 *   IMPORTAR_LEGADO = 1
 * Para pruebas locales: LEGADO_JSON=/ruta/data.json en lugar de MYSQL_URL.
 *
 * Los logs solo muestran conteos: ningún dato personal.
 * El archivo desplegado se genera con database/railway/construir_funcion.py (incrusta las migraciones).
 */
import { createHash } from "node:crypto";
import pg from "pg";
import mysql from "mysql2";

// construir_funcion.py reemplaza esto por las migraciones incrustadas o, con --remoto, por su
// ubicación en GitHub (fijada a un commit) y el SHA-256 de cada archivo.
const MIGRACIONES: { nombre: string; sql?: string; url?: string; sha256?: string }[] = /*__MIGRACIONES__*/ [];

async function cargarMigraciones() {
  const out: { nombre: string; sql: string }[] = [];
  for (const m of MIGRACIONES) {
    if (m.sql) {
      out.push({ nombre: m.nombre, sql: m.sql });
      continue;
    }
    const res = await fetch(m.url!);
    if (!res.ok) throw new Error(`No se pudo descargar ${m.nombre}: HTTP ${res.status}`);
    const sql = await res.text();
    const hash = createHash("sha256").update(sql, "utf8").digest("hex");
    if (hash !== m.sha256) throw new Error(`El hash de ${m.nombre} no coincide: el archivo fue modificado`);
    out.push({ nombre: m.nombre, sql });
  }
  return out;
}

type Fila = Record<string, any>;
type Tablas = Record<string, Fila[]>;

// ───────────────────────── utilidades ─────────────────────────
const NS = "6f1c3a52-6c55-4e0f-9a3e-4a9d2a0b1c01";

/** UUID v5 (idéntico al de importar_legado.py, para que ambos caminos generen los mismos ids). */
function uid(...partes: (string | number)[]): string {
  const ns = Buffer.from(NS.replace(/-/g, ""), "hex");
  const h = createHash("sha1").update(Buffer.concat([ns, Buffer.from(partes.join(":"), "utf8")])).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** Importes en céntimos (enteros) para no perder precisión. */
const cts = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const sol = (c: number) => (c / 100).toFixed(2);
const fecha = (v: unknown) => (v == null || v === "" ? null : String(v).slice(0, 10));
const txt = (v: unknown) => (v == null ? "" : String(v)).trim();
const limpiarTelefono = (t: unknown) => {
  let d = txt(t).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("51")) d = d.slice(2);
  return d || null;
};
const frecuencia = (v: unknown) =>
  ({ diario: "DIARIO", semanal: "SEMANAL", quincenal: "QUINCENAL", mensual: "MENSUAL" })[txt(v).toLowerCase()] ?? "SEMANAL";
const metodo = (v: unknown) =>
  ({ efectivo: "EFECTIVO", yape: "YAPE", plin: "PLIN", transferencia: "TRANSFERENCIA" })[txt(v).toLowerCase()] ??
  (txt(v) ? "OTRO" : "EFECTIVO");
const MARCAS: Record<string, string> = { iphone: "Apple", xiomi: "Xiaomi", "xiaomi redmi": "Xiaomi", hona: "Honda", "honda motokar": "Honda" };
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const pagado = (v: unknown) => v === true || Number(v) === 1;

// ───────────────────────── lectura del origen ─────────────────────────
const TABLAS_LEGADO = [
  "users_client",
  "inventory_moto",
  "devices_device",
  "devices_devicesale",
  "devices_deviceinstallment",
  "loans_prestamo",
  "loans_cuotaprestamo",
] as const;

async function leerOrigen(): Promise<Tablas> {
  if (process.env.LEGADO_JSON) return JSON.parse(await Bun.file(process.env.LEGADO_JSON).text());
  const url = process.env.MYSQL_URL;
  if (!url) throw new Error("Falta MYSQL_URL (o LEGADO_JSON para pruebas locales)");
  const conn = mysql.createConnection({ uri: url, dateStrings: true, decimalNumbers: false }).promise();
  const out: Tablas = {};
  try {
    for (const t of TABLAS_LEGADO) {
      const [rows] = await conn.query(`SELECT * FROM \`${t}\` ORDER BY id`);
      out[t] = rows as Fila[];
    }
  } finally {
    await conn.end();
  }
  return out;
}

// ───────────────────────── transformación ─────────────────────────
function transformar(d: Tablas) {
  const avisos: string[] = [];
  const stats = { clientesIncompletos: 0, cabecerasCorregidas: 0, cuotasConExcedente: 0, icloudOmitidas: 0 };

  const correos = new Map<string, number>();
  for (const c of d.users_client) {
    const e = txt(c.email).toLowerCase();
    correos.set(e, (correos.get(e) ?? 0) + 1);
  }
  const clientes = d.users_client.map((c) => {
    const doc = txt(c.dni);
    const email = txt(c.email).toLowerCase();
    const domicilio = txt(c.domicilio);
    const soloDistrito = /^santa anita(,\s*lima)?$/i.test(domicilio);
    const docValido = /^\d{8}$/.test(doc);
    const emailValido = email.includes("@") && correos.get(email) === 1;
    const incompleto = !docValido || !emailValido || soloDistrito || domicilio.length < 5;
    if (incompleto) stats.clientesIncompletos++;
    return {
      id: uid("cliente", c.id),
      nombres: txt(c.nombres),
      apellidos: txt(c.apellidos),
      tipo_documento: "DNI",
      numero_documento: doc && doc !== "." ? doc : `SIN-DOC-${c.id}`,
      telefono: limpiarTelefono(c.telefono),
      email: emailValido ? email : null,
      direccion: soloDistrito || domicilio.length < 5 ? null : domicilio,
      distrito: soloDistrito ? "Santa Anita" : null,
      provincia: soloDistrito ? "Lima" : null,
      departamento: soloDistrito ? "Lima" : null,
      legado_id: c.id,
      datos_incompletos: incompleto,
    };
  });

  const vehiculos = d.inventory_moto.map((m) => {
    const marcaRaw = txt(m.marca);
    const esMotokar = `${marcaRaw} ${txt(m.modelo)}`.toLowerCase().includes("motokar");
    return {
      id: uid("vehiculo", m.id),
      tipo_vehiculo: esMotokar ? "TRIMOVIL_PASAJEROS" : "MOTO_LINEAL",
      marca: MARCAS[marcaRaw.toLowerCase()] ?? titulo(marcaRaw),
      modelo: esMotokar ? "Motokar GL150" : titulo(txt(m.modelo)),
      anio: m.anio,
      color: txt(m.color) || null,
      condicion: txt(m.condicion).toLowerCase() === "0km" ? "NUEVO" : "USADO",
      precio_lista: sol(cts(m.precio)),
      numero_motor: txt(m.numero_motor),
      numero_chasis: txt(m.numero_serie),
      placa: txt(m.placa) || null,
      estado: txt(m.estado).toLowerCase() === "disponible" ? "EN_STOCK" : "VENDIDO_CONTADO",
      legado_id: m.id,
    };
  });

  const ventaPorEquipo = new Map(d.devices_devicesale.map((s) => [s.device_id, s]));
  stats.icloudOmitidas = d.devices_devicesale.filter((s) => txt(s.icloud_password)).length;
  const celulares = d.devices_device.map((x) => {
    const venta = ventaPorEquipo.get(x.id);
    const marcaRaw = txt(x.marca);
    const marca = MARCAS[marcaRaw.toLowerCase()] ?? titulo(marcaRaw);
    let modelo = txt(x.modelo);
    if (marcaRaw.toLowerCase() === "iphone") modelo = `iPhone ${modelo}`.replace(" pro", " Pro");
    else if (marcaRaw.toLowerCase() === "xiaomi redmi") modelo = `Redmi ${modelo}`;
    const icloud = txt(venta?.icloud_email) || null;
    const so = txt(venta?.sistema_operativo) || (marca === "Apple" ? "IOS" : "ANDROID");
    if (txt(x.imei).length !== 15) avisos.push(`Celular legado #${x.id}: IMEI1 con ${txt(x.imei).length} dígitos`);
    return {
      id: uid("celular", x.id),
      marca,
      modelo,
      color: txt(x.color) || null,
      sistema_operativo: so.toUpperCase(),
      precio_lista: sol(cts(x.precio)),
      imei1: txt(x.imei),
      imei2: txt(x.imei2) || null,
      numero_serie: txt(x.numero_serie) || null,
      plataforma_bloqueo: icloud ? "ICLOUD" : "NINGUNA",
      id_enrolamiento: icloud,
      estado_bloqueo: venta && txt(venta.estado).toLowerCase() === "pagado" ? "LIBERADO_DEFINITIVO" : "DESBLOQUEADO_OPERATIVO",
      estado: txt(x.estado).toLowerCase() === "vendido" ? "VENDIDO_CREDITO" : "EN_STOCK",
      legado_id: x.id,
    };
  });

  const creditos: Fila[] = [];
  const cuotas: Fila[] = [];
  const pagos: Fila[] = [];
  const aplicaciones: Fila[] = [];

  function agregarCredito(
    origen: string,
    cab: Fila,
    tipo: "PRESTAMO_EFECTIVO" | "CREDITO_CELULAR",
    filas: Fila[],
    o: { montoTotal: number; inicial: number; fechaInicio: string; frec: string; unidadCelular: string | null },
  ) {
    if (filas.length === 0) {
      avisos.push(`${origen} #${cab.id}: sin cuotas, no se importa`);
      return;
    }
    filas = [...filas].sort((a, b) => a.numero - b.numero);
    const financiado = o.montoTotal - o.inicial;
    const totalCuotas = filas.reduce((s, r) => s + cts(r.monto), 0);
    if (Math.abs(totalCuotas - cts(cab.monto_total_deuda)) > 10) stats.cabecerasCorregidas++;
    const intereses = Math.max(totalCuotas - financiado, 0);
    const tasa = financiado ? Math.round((intereses / financiado) * 100 * 1000) / 1000 : 0;
    const cid = uid("credito", origen, cab.id);
    const todoPagado = filas.every((r) => pagado(r.pagado));
    const ultima = filas.map((r) => fecha(r.fecha_pago)).filter(Boolean).sort().at(-1) ?? null;
    let nota = `Migrado del sistema anterior (${origen} #${cab.id}).`;
    if (Math.abs(tasa - Number(cab.interes)) > 0.5)
      nota += ` La cabecera original indicaba ${Number(cab.interes)} % de interés; el cronograma cobrado equivale a ${tasa} %.`;
    creditos.push({
      id: cid,
      codigo: `JP-${tipo === "PRESTAMO_EFECTIVO" ? "PE" : "CC"}-L${String(cab.id).padStart(5, "0")}`,
      tipo,
      cliente_id: uid("cliente", cab.cliente_id),
      unidad_celular_id: o.unidadCelular,
      monto_total: sol(o.montoTotal),
      cuota_inicial: sol(o.inicial),
      tasa_porcentaje: tasa.toFixed(3),
      tipo_calculo: "FLAT",
      total_intereses: sol(intereses),
      monto_total_pagar: sol(financiado + intereses),
      frecuencia: o.frec,
      numero_cuotas: filas.length,
      valor_cuota: sol(cts(cab.monto_cuota) || cts(filas[0].monto)),
      fecha_desembolso: o.fechaInicio,
      fecha_primer_vencimiento: fecha(filas[0].fecha_vencimiento),
      fecha_cancelacion: todoPagado ? ultima : null,
      estado: todoPagado ? "FINALIZADO_LIQUIDADO" : "VIGENTE",
      notas: nota,
      legado_origen: origen,
      legado_id: cab.id,
    });

    let capitalRestante = financiado;
    filas.forEach((r, k) => {
      const monto = cts(r.monto);
      let capital = k === filas.length - 1 ? capitalRestante : totalCuotas ? Math.round((monto * financiado) / totalCuotas) : 0;
      capital = Math.max(Math.min(capital, monto), 0);
      const interes = monto - capital;
      capitalRestante -= capital;
      const pagadoMonto = cts(r.monto_pagado);
      const exceso = Math.max(pagadoMonto - monto, 0);
      const qid = uid("cuota", origen, r.id);
      cuotas.push({
        id: qid,
        credito_id: cid,
        numero: r.numero,
        fecha_vencimiento: fecha(r.fecha_vencimiento),
        monto_cuota: sol(monto),
        capital: sol(capital),
        interes: sol(interes),
        mora: sol(exceso),
        monto_pagado: sol(pagadoMonto),
        saldo_capital: sol(Math.max(capitalRestante, 0)),
        fecha_pago: pagado(r.pagado) ? fecha(r.fecha_pago) : null,
        estado: pagado(r.pagado) ? "PAGADA" : pagadoMonto > 0 ? "PAGADA_PARCIAL" : "PENDIENTE",
        legado_id: r.id,
      });
      if (pagadoMonto > 0) {
        if (exceso > 0) stats.cuotasConExcedente++;
        const pid = uid("pago", origen, r.id);
        pagos.push({
          id: pid,
          credito_id: cid,
          monto: sol(pagadoMonto),
          metodo: metodo(r.metodo_pago),
          fecha_pago: fecha(r.fecha_pago) ?? fecha(r.fecha_vencimiento),
          notas: "Pago migrado del sistema anterior" + (exceso ? `; incluye S/ ${sol(exceso)} por encima de la cuota (registrado como mora)` : ""),
        });
        const cubierto = Math.min(pagadoMonto, monto);
        const aInteres = Math.min(cubierto, interes);
        aplicaciones.push({
          id: uid("aplicacion", origen, r.id),
          pago_id: pid,
          cuota_id: qid,
          mora: sol(exceso),
          interes: sol(aInteres),
          capital: sol(cubierto - aInteres),
        });
      }
    });
  }

  const porPrestamo = Map.groupBy(d.loans_cuotaprestamo, (r) => r.prestamo_id);
  for (const p of d.loans_prestamo)
    agregarCredito("loans_prestamo", p, "PRESTAMO_EFECTIVO", porPrestamo.get(p.id) ?? [], {
      montoTotal: cts(p.monto_prestado),
      inicial: 0,
      fechaInicio: fecha(p.fecha_inicio)!,
      frec: frecuencia(p.frecuencia),
      unidadCelular: null,
    });

  const precioEquipo = new Map(d.devices_device.map((x) => [x.id, cts(x.precio)]));
  const porVenta = Map.groupBy(d.devices_deviceinstallment, (r) => r.sale_id);
  for (const s of d.devices_devicesale)
    agregarCredito("devices_devicesale", s, "CREDITO_CELULAR", porVenta.get(s.id) ?? [], {
      montoTotal: precioEquipo.get(s.device_id) ?? 0,
      inicial: cts(s.monto_inicial),
      fechaInicio: fecha(s.fecha_venta)!,
      frec: frecuencia(s.metodo_pago || "Semanal"),
      unidadCelular: uid("celular", s.device_id),
    });

  return { clientes, vehiculos, celulares, creditos, cuotas, pagos, aplicaciones, avisos, stats };
}

// ───────────────────────── escritura ─────────────────────────
async function insertar(db: pg.PoolClient, tabla: string, filas: Fila[]) {
  let insertadas = 0;
  for (let i = 0; i < filas.length; i += 400) {
    const lote = filas.slice(i, i + 400);
    const cols = Object.keys(lote[0]);
    const valores: unknown[] = [];
    const tuplas = lote.map((f) => `(${cols.map((c) => (valores.push(f[c]), `$${valores.length}`)).join(", ")})`);
    const r = await db.query(
      `insert into public.${tabla} (${cols.join(", ")}) values ${tuplas.join(", ")} on conflict do nothing`,
      valores,
    );
    insertadas += r.rowCount ?? 0;
  }
  return insertadas;
}

async function aplicarMigraciones(db: pg.PoolClient) {
  await db.query(`create table if not exists public._migraciones (nombre text primary key, aplicada timestamptz not null default now())`);
  await db.query(`alter table public._migraciones enable row level security`);
  const { rows } = await db.query(`select nombre from public._migraciones`);
  const hechas = new Set(rows.map((r) => r.nombre));
  for (const m of await cargarMigraciones()) {
    if (hechas.has(m.nombre)) continue;
    await db.query("begin");
    try {
      await db.query(m.sql); // sin parámetros → protocolo simple: admite varias sentencias
      await db.query(`insert into public._migraciones (nombre) values ($1)`, [m.nombre]);
      await db.query("commit");
      console.log(`migración aplicada: ${m.nombre}`);
    } catch (e) {
      await db.query("rollback");
      throw new Error(`Falló la migración ${m.nombre}: ${(e as Error).message}`);
    }
  }
}

async function importarLegado(db: pg.PoolClient) {
  const origen = await leerOrigen();
  const t = transformar(origen);
  await db.query("begin");
  try {
    await db.query("alter table public.credito disable trigger credito_auditoria");
    await db.query("alter table public.credito disable trigger credito_estado_unidad");
    await db.query("alter table public.pago disable trigger pago_auditoria");
    const n = {
      clientes: await insertar(db, "cliente", t.clientes),
      vehiculos: await insertar(db, "unidad_vehiculo", t.vehiculos),
      celulares: await insertar(db, "unidad_celular", t.celulares),
      creditos: await insertar(db, "credito", t.creditos),
      cuotas: await insertar(db, "cuota", t.cuotas),
      pagos: await insertar(db, "pago", t.pagos),
      aplicaciones: await insertar(db, "aplicacion_pago", t.aplicaciones),
    };
    await db.query("alter table public.credito enable trigger credito_auditoria");
    await db.query("alter table public.credito enable trigger credito_estado_unidad");
    await db.query("alter table public.pago enable trigger pago_auditoria");
    const { rows } = await db.query("select * from public.recalcular_estados()");
    await db.query(
      `insert into public.audit_log (tabla, registro_id, accion, despues) values ('importacion', 'legado', 'INSERT', $1)`,
      [JSON.stringify({ leidos: Object.fromEntries(TABLAS_LEGADO.map((k) => [k, origen[k]?.length ?? 0])), insertados: n })],
    );
    await db.query("commit");
    console.log("leídos del sistema anterior:", Object.fromEntries(TABLAS_LEGADO.map((k) => [k, origen[k]?.length ?? 0])));
    console.log("insertados (nuevos):", n);
    console.log("limpieza:", t.stats);
    console.log("recalcular_estados:", rows[0]);
    for (const a of t.avisos) console.log("aviso:", a);
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  let db: pg.PoolClient | undefined;
  for (let intento = 1; !db; intento++) {
    try {
      db = await pool.connect();
    } catch (e) {
      if (intento >= 6) throw e;
      console.log(`PostgreSQL no responde aún (intento ${intento}); reintentando en 5 s`);
      await Bun.sleep(5000);
    }
  }
  try {
    await aplicarMigraciones(db);
    if (process.env.IMPORTAR_LEGADO === "1") await importarLegado(db);
    const { rows } = await db.query(`
      select (select count(*) from public.cliente) clientes, (select count(*) from public.credito) creditos,
             (select count(*) from public.cuota) cuotas, (select count(*) from public.pago) pagos,
             (select count(*) from public.producto_catalogo) productos`);
    console.log("estado final:", rows[0]);
    console.log("MIGRACION_OK");
  } finally {
    db.release();
    await pool.end();
  }
}

await main();
