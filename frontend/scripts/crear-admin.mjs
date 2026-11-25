#!/usr/bin/env node
/**
 * Crea (o restablece) una cuenta del panel /admin. Se usa para el PRIMER superadministrador;
 * el resto del personal se crea desde /admin/personal.
 *
 *   DATABASE_URL=postgres://... npm run admin:crear -- correo@empresa.com "Nombres" "Apellidos" [ROL]
 *
 * La contraseña se pide por consola (no queda en el historial). También se puede pasar en
 * ADMIN_PASSWORD para automatizar. Si el correo ya existe, se actualiza su contraseña, rol y se reactiva.
 * El formato del hash es el mismo de src/lib/server/password.ts.
 */
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";
import postgres from "postgres";

const ROLES = ["SUPERADMIN", "ADMIN_CREDITOS", "ASESOR_VENTAS", "COBRADOR"];
const [email, nombres, apellidos = "", rol = "SUPERADMIN"] = process.argv.slice(2);

if (!process.env.DATABASE_URL || !email || !nombres || !ROLES.includes(rol)) {
  console.error('Uso: DATABASE_URL=... npm run admin:crear -- correo@empresa.com "Nombres" "Apellidos" [SUPERADMIN|ADMIN_CREDITOS|ASESOR_VENTAS|COBRADOR]');
  process.exit(1);
}

function preguntarOculto(texto) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(texto) ? s : "");
    rl.question(texto, (r) => {
      rl.close();
      process.stdout.write("\n");
      resolve(r);
    });
  });
}

const password = process.env.ADMIN_PASSWORD ?? (await preguntarOculto("Contraseña (mín. 10, letras y números): "));
if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
  console.error("La contraseña debe tener al menos 10 caracteres, con letras y números.");
  process.exit(1);
}

const N = 2 ** 15, R = 8, P = 1;
const sal = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
  scrypt(password.normalize("NFKC"), sal, 64, { N, r: R, p: P, maxmem: 128 * N * R * 2 }, (e, k) => (e ? reject(e) : resolve(k))),
);
const passwordHash = ["scrypt", N, R, P, sal.toString("base64"), hash.toString("base64")].join("$");

const url = process.env.DATABASE_URL;
const sql = postgres(url, { max: 1, ssl: /localhost|127\.0\.0\.1|\.railway\.internal|host=\/|@\/|%2F/.test(url) ? false : { rejectUnauthorized: false } });
try {
  await sql.begin(async (tx) => {
    const [u] = await tx`
      insert into auth.users (email, password_hash, activo) values (${email.toLowerCase()}, ${passwordHash}, true)
      on conflict (email) do update set password_hash = excluded.password_hash, activo = true
      returning id`;
    await tx`
      insert into public.perfil_usuario (id, nombres, apellidos, rol, activo) values (${u.id}, ${nombres}, ${apellidos}, ${rol}, true)
      on conflict (id) do update set nombres = excluded.nombres, apellidos = excluded.apellidos, rol = excluded.rol, activo = true`;
    await tx`delete from public.sesion_panel where usuario_id = ${u.id}`;
  });
  console.log(`Listo: ${email} puede ingresar a /admin con el rol ${rol}.`);
} catch (e) {
  console.error("No se pudo crear la cuenta:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
