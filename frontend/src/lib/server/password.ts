import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Hash de contraseñas con scrypt (incluido en Node, sin dependencias nativas).
 * Formato guardado en auth.users.password_hash:  scrypt$N$r$p$<sal base64>$<hash base64>
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const LARGO = 64;

const derivar = (password: string, sal: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) => {
    const opts: ScryptOptions = { N: n, r, p, maxmem: 128 * n * r * 2 };
    scrypt(password.normalize("NFKC"), sal, LARGO, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });

export async function hashPassword(password: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(password, sal, N, R, P);
  return ["scrypt", N, R, P, sal.toString("base64"), hash.toString("base64")].join("$");
}

export async function verificarPassword(password: string, guardado: string | null | undefined): Promise<boolean> {
  const partes = guardado?.split("$");
  if (!partes || partes.length !== 6 || partes[0] !== "scrypt") {
    // Se calcula igual un hash para que el tiempo de respuesta no revele si el usuario existe.
    await derivar(password, randomBytes(16), N, R, P);
    return false;
  }
  const [, n, r, p, sal, hash] = partes;
  const esperado = Buffer.from(hash, "base64");
  const calculado = await derivar(password, Buffer.from(sal, "base64"), Number(n), Number(r), Number(p));
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

/** Reglas mínimas de contraseña del personal. Devuelve el error o null. */
export function validarPassword(password: string): string | null {
  if (password.length < 10) return "La contraseña debe tener al menos 10 caracteres";
  if (password.length > 200) return "La contraseña es demasiado larga";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Usa letras y números";
  return null;
}
