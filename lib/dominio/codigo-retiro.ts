/**
 * Códigos de retiro: 6 caracteres de un alfabeto de 32 símbolos sin caracteres ambiguos
 * (sin I, O, 0 ni 1): unos mil millones de combinaciones (SUP-03).
 *
 * @module dominio/codigo-retiro
 */

/** Símbolos permitidos. */
export const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Longitud del código. */
export const LONGITUD = 6;

/** Expresión que reconoce un código bien formado. */
export const FORMATO_CODIGO_RETIRO = new RegExp(`^[${ALFABETO}]{${LONGITUD}}$`);

/**
 * Genera un código con una fuente de bytes aleatorios. Usa `crypto.getRandomValues` por
 * defecto (criptográficamente seguro). Descarta bytes ≥ 224 para no sesgar el alfabeto.
 *
 * @param bytesAleatorios función que llena un arreglo con bytes aleatorios
 * @returns código de 6 caracteres
 */
export function generarCodigoRetiro(
  bytesAleatorios: (arreglo: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a),
): string {
  let codigo = "";
  while (codigo.length < LONGITUD) {
    for (const b of bytesAleatorios(new Uint8Array(LONGITUD * 2))) {
      if (b < 224 && codigo.length < LONGITUD) {
        codigo += ALFABETO[b % ALFABETO.length];
      }
    }
  }
  return codigo;
}
