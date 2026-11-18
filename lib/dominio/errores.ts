/**
 * Errores del dominio. Toda violación de una regla de negocio deriva de
 * {@link ReglaNegocioError} y lleva un mensaje en español que la interfaz muestra tal cual
 * (PN-01, paso 7). Los fallos técnicos de la base de datos se representan aparte con
 * {@link PersistenciaError}.
 *
 * @module dominio/errores
 */

/** Base de toda violación de una regla de negocio. */
export class ReglaNegocioError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** La cantidad no es un entero mayor que cero (RN-NEG-01). */
export class CantidadInvalidaError extends ReglaNegocioError {}

/** Se intenta agregar o confirmar un producto no disponible (RN-NEG-02). */
export class ProductoNoDisponibleError extends ReglaNegocioError {}

/** Se confirma un carrito sin productos (RN-NEG-01). */
export class PedidoVacioError extends ReglaNegocioError {}

/** Se avanza o entrega un pedido fuera del orden permitido (RN-NEG-06, RN-NEG-07). */
export class TransicionEstadoInvalidaError extends ReglaNegocioError {}

/** El código presentado no coincide con el del pedido (RN-NEG-07). */
export class CodigoRetiroIncorrectoError extends ReglaNegocioError {}

/** Un campo está vacío o tiene un formato inválido (SUP-10, SUP-12). */
export class DatoInvalidoError extends ReglaNegocioError {}

/** Código de producto, cédula o correo repetidos (HU-06, HU-11). */
export class EntidadDuplicadaError extends ReglaNegocioError {}

/** No existe el producto, cliente o pedido buscado (HU-05, HU-07). */
export class EntidadNoEncontradaError extends ReglaNegocioError {}

/** El usuario no inició sesión o no tiene el perfil necesario (SUP-15). */
export class NoAutorizadoError extends ReglaNegocioError {}

/** Mensaje que la interfaz muestra ante cualquier fallo de la base de datos. */
export const MENSAJE_PERSISTENCIA = "No se pudo guardar la información. Intente de nuevo.";

/** Fallo técnico al leer o guardar datos. No es una regla de negocio. */
export class PersistenciaError extends Error {
  constructor(mensaje: string = MENSAJE_PERSISTENCIA, options?: { cause?: unknown }) {
    super(mensaje, options);
    this.name = new.target.name;
  }
}

/**
 * La base de datos rechazó un pedido porque su código de retiro ya existía (restricción
 * UNIQUE). Ocurre si dos pedidos se confirman a la vez; el servicio la captura y repite con
 * otro código (RN-NEG-05, RNF-04).
 */
export class CodigoRetiroDuplicadoError extends PersistenciaError {}
