/**
 * Importes en dólares representados como **centavos enteros** (RNF-05): así no hay errores
 * de punto flotante (0.35 × 3 = 1.05 exacto). La conversión desde texto no usa `number`
 * decimal en ningún paso.
 *
 * @module dominio/dinero
 */
import { DatoInvalidoError } from "./errores";

/** Importe en centavos de dólar (entero). */
export type Centavos = number;

const FORMATO_PRECIO = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;

/**
 * Convierte el texto de un precio en centavos. Acepta punto o coma decimal y hasta 2
 * decimales.
 *
 * @param texto por ejemplo «1.50», «1,5» o «2»
 * @returns centavos, por ejemplo 150
 * @throws Lanza {@link DatoInvalidoError} si el texto no es un importe válido
 */
export function aCentavos(texto: string): Centavos {
  const limpio = (texto ?? "").trim();
  const partes = FORMATO_PRECIO.exec(limpio);
  if (!partes) {
    throw new DatoInvalidoError("El precio debe ser un número con hasta 2 decimales, por ejemplo 1.50.");
  }
  const enteros = Number.parseInt(partes[1], 10);
  const decimales = Number.parseInt((partes[2] ?? "").padEnd(2, "0"), 10);
  return enteros * 100 + decimales;
}

/**
 * Formatea centavos como importe con dos decimales.
 *
 * @param centavos por ejemplo 550
 * @returns por ejemplo «5.50»
 */
export function aTexto(centavos: Centavos): string {
  const signo = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  return `${signo}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Formatea centavos como dólares para mostrar.
 *
 * @param centavos por ejemplo 550
 * @returns por ejemplo «$5.50»
 */
export function formatearDolares(centavos: Centavos): string {
  return `$${aTexto(centavos)}`;
}

/**
 * Multiplica un precio por una cantidad.
 *
 * @param precio precio unitario en centavos
 * @param cantidad cantidad entera
 * @returns subtotal en centavos
 */
export function multiplicar(precio: Centavos, cantidad: number): Centavos {
  return precio * cantidad;
}
