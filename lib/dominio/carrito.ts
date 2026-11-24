/**
 * Carrito: selección en construcción; todavía no es un pedido. Solo guarda códigos y
 * cantidades. Es inmutable: cada operación devuelve un carrito nuevo. Agregar dos veces el
 * mismo producto acumula la cantidad en una sola línea (SUP-11).
 *
 * @module dominio/carrito
 */
import { CantidadInvalidaError, DatoInvalidoError } from "./errores";
import { normalizarCodigo } from "./producto";

/** Mensaje de toda cantidad inválida (RN-NEG-01). */
export const MENSAJE_CANTIDAD = "La cantidad debe ser un número entero mayor que cero.";

/** Cantidad máxima por línea, para evitar errores de digitación. */
export const CANTIDAD_MAXIMA = 50;

/** Línea del carrito. */
export interface LineaCarrito {
  readonly codigo: string;
  readonly cantidad: number;
}

/** Carrito: líneas en el orden en que se agregaron. */
export type Carrito = readonly LineaCarrito[];

/** Carrito vacío. */
export const CARRITO_VACIO: Carrito = Object.freeze([]);

/**
 * Valida una cantidad.
 *
 * @param cantidad valor a validar
 * @throws Lanza {@link CantidadInvalidaError} si no es un entero mayor que cero o excede el máximo
 */
export function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new CantidadInvalidaError(MENSAJE_CANTIDAD);
  }
  if (cantidad > CANTIDAD_MAXIMA) {
    throw new CantidadInvalidaError(`La cantidad máxima por producto es ${CANTIDAD_MAXIMA}.`);
  }
}

/**
 * Convierte el texto de una cantidad en número. Un texto vacío, decimal o no numérico se
 * convierte en 0, que {@link validarCantidad} rechaza (HU-02, escenario 3).
 *
 * @param texto lo que escribió el usuario
 * @returns la cantidad, o 0 si no es un entero
 */
export function aCantidad(texto: string | number | null | undefined): number {
  if (typeof texto === "number") {
    return Number.isInteger(texto) ? texto : 0;
  }
  const limpio = (texto ?? "").trim();
  return /^-?\d+$/.test(limpio) ? Number.parseInt(limpio, 10) : 0;
}

/**
 * Agrega un producto; si ya estaba, suma la cantidad.
 *
 * @param carrito carrito actual
 * @param codigo código del producto
 * @param cantidad entero mayor que cero
 * @returns el carrito nuevo
 * @throws Lanza {@link CantidadInvalidaError} si la cantidad no es válida
 */
export function agregar(carrito: Carrito, codigo: string, cantidad: number): Carrito {
  validarCantidad(cantidad);
  const c = codigoValido(codigo);
  const actual = cantidadDe(carrito, c);
  if (actual > 0) {
    validarCantidad(actual + cantidad);
    return carrito.map((l) => (l.codigo === c ? { codigo: c, cantidad: actual + cantidad } : l));
  }
  return [...carrito, { codigo: c, cantidad }];
}

/**
 * Reemplaza la cantidad de un producto, o lo agrega si no estaba.
 *
 * @param carrito carrito actual
 * @param codigo código del producto
 * @param cantidad nueva cantidad
 * @returns el carrito nuevo
 * @throws Lanza {@link CantidadInvalidaError} si la cantidad no es válida
 */
export function cambiarCantidad(carrito: Carrito, codigo: string, cantidad: number): Carrito {
  validarCantidad(cantidad);
  const c = codigoValido(codigo);
  if (cantidadDe(carrito, c) === 0) {
    return [...carrito, { codigo: c, cantidad }];
  }
  return carrito.map((l) => (l.codigo === c ? { codigo: c, cantidad } : l));
}

/**
 * Quita un producto. No hace nada si no estaba.
 *
 * @param carrito carrito actual
 * @param codigo código del producto
 * @returns el carrito nuevo
 */
export function quitar(carrito: Carrito, codigo: string): Carrito {
  const c = normalizarCodigo(codigo);
  return carrito.filter((l) => l.codigo !== c);
}

/**
 * Devuelve la cantidad de un producto.
 *
 * @param carrito carrito
 * @param codigo código del producto
 * @returns la cantidad, o 0 si no está
 */
export function cantidadDe(carrito: Carrito, codigo: string): number {
  const c = normalizarCodigo(codigo);
  return carrito.find((l) => l.codigo === c)?.cantidad ?? 0;
}

/**
 * Cuenta las unidades del carrito.
 *
 * @param carrito carrito
 * @returns suma de cantidades
 */
export function unidades(carrito: Carrito): number {
  return carrito.reduce((suma, l) => suma + l.cantidad, 0);
}

/**
 * Indica si el carrito no tiene líneas.
 *
 * @param carrito carrito
 * @returns `true` si está vacío
 */
export function estaVacio(carrito: Carrito): boolean {
  return carrito.length === 0;
}

/**
 * Reconstruye un carrito recibido de afuera (navegador, formulario), descartando líneas
 * mal formadas. Sirve para no confiar en datos del cliente.
 *
 * @param valor dato desconocido
 * @returns un carrito válido (posiblemente vacío)
 */
export function sanear(valor: unknown): Carrito {
  if (!Array.isArray(valor)) {
    return CARRITO_VACIO;
  }
  let carrito: Carrito = CARRITO_VACIO;
  for (const linea of valor.slice(0, 100)) {
    if (linea && typeof linea === "object") {
      const { codigo, cantidad } = linea as Record<string, unknown>;
      if (typeof codigo === "string" && typeof cantidad === "number") {
        try {
          carrito = cambiarCantidad(carrito, codigo, cantidad);
        } catch {
          // línea inválida: se descarta
        }
      }
    }
  }
  return carrito;
}

function codigoValido(codigo: string): string {
  const c = normalizarCodigo(codigo);
  if (!c) {
    throw new DatoInvalidoError("El código es obligatorio.");
  }
  return c;
}
