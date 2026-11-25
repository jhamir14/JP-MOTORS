/** Validaciones de identificadores de inventario (compartidas por el panel y los tests). */

/** VIN / número de chasis: 17 caracteres, sin I, O ni Q (ISO 3779). */
export const esVinValido = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase());

/** IMEI: 15 dígitos con dígito verificador Luhn. */
export function esImeiValido(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let suma = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(imei[14 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
}

/** Placa peruana: formato vehicular/moto (ej. ABC-123, 1234-AB) o vacía si está en trámite. */
export const esPlacaValida = (placa: string) => placa === "" || /^[A-Z0-9]{2,4}-?[A-Z0-9]{2,4}$/.test(placa.toUpperCase());
