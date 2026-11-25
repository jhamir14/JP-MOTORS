import "server-only";

export const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/**
 * Detecta el tipo real de un archivo por sus primeros bytes (no confía en la extensión ni en el navegador).
 * Reconoce JPG, PNG, WEBP, AVIF y PDF.
 */
export function detectarTipo(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp" && /avi[fs]/.test(b.toString("ascii", 8, 12))) return "image/avif";
  if (b.length > 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}
