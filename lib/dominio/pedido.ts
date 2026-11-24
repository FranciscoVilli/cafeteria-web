/**
 * Pedido confirmado. Un pedido solo existe confirmado, así que siempre cumple sus reglas:
 * al menos una línea, código de retiro y estado válido. Es inmutable: avanzar o entregar
 * devuelven un pedido nuevo.
 *
 * @module dominio/pedido
 */
import type { Cliente } from "./cliente";
import { multiplicar, type Centavos } from "./dinero";
import {
  CantidadInvalidaError,
  CodigoRetiroIncorrectoError,
  DatoInvalidoError,
  PedidoVacioError,
  TransicionEstadoInvalidaError,
} from "./errores";
import { mensajeTransicion, siguienteEstado, type EstadoPedido } from "./estado-pedido";
import { MENSAJE_CANTIDAD } from "./carrito";
import type { Producto } from "./producto";

/** Mensaje cuando se intenta confirmar sin productos. */
export const MENSAJE_PEDIDO_VACIO = "Agregue al menos un producto para confirmar el pedido.";

/** Producto incluido en un pedido, con el precio de la operación (RN-NEG-04). */
export interface DetallePedido {
  readonly producto: Pick<Producto, "codigo" | "nombre" | "categoria" | "imagenUrl">;
  readonly cantidad: number;
  /** Precio fijado al confirmar; no cambia aunque cambie el menú (SUP-05). */
  readonly precioUnitarioCentavos: Centavos;
}

/** Pedido confirmado. */
export interface Pedido {
  /** Identificador asignado por la base de datos; `null` antes de guardarse. */
  readonly id: number | null;
  readonly codigoRetiro: string;
  readonly cliente: Cliente;
  readonly estado: EstadoPedido;
  readonly fechaRegistro: Date;
  readonly detalles: readonly DetallePedido[];
}

/**
 * Crea una línea con el precio vigente del producto (RN-NEG-03).
 *
 * @param producto producto del menú
 * @param cantidad entero mayor que cero
 * @returns la línea
 * @throws Lanza {@link CantidadInvalidaError} si la cantidad no es positiva
 */
export function detalleConPrecioVigente(producto: Producto, cantidad: number): DetallePedido {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new CantidadInvalidaError(MENSAJE_CANTIDAD);
  }
  return {
    producto: {
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria,
      imagenUrl: producto.imagenUrl,
    },
    cantidad,
    precioUnitarioCentavos: producto.precioCentavos,
  };
}

/**
 * Calcula precio unitario × cantidad.
 *
 * @param d línea
 * @returns subtotal en centavos
 */
export function subtotal(d: DetallePedido): Centavos {
  return multiplicar(d.precioUnitarioCentavos, d.cantidad);
}

/**
 * Suma los subtotales (RN-NEG-03).
 *
 * @param pedido pedido o lista de líneas
 * @returns importe total en centavos
 */
export function calcularTotal(pedido: Pick<Pedido, "detalles">): Centavos {
  return pedido.detalles.reduce((total, d) => total + subtotal(d), 0);
}

/**
 * Crea un pedido recién confirmado, en estado PENDIENTE.
 *
 * @param cliente cliente registrado
 * @param detalles líneas con el precio vigente; al menos una (RN-NEG-01)
 * @param codigoRetiro código único ya verificado (RN-NEG-05)
 * @param fecha fecha y hora de registro
 * @returns el pedido, todavía sin id
 * @throws Lanza {@link PedidoVacioError} si no hay líneas
 */
export function confirmar(
  cliente: Cliente,
  detalles: readonly DetallePedido[],
  codigoRetiro: string,
  fecha: Date,
): Pedido {
  if (!detalles || detalles.length === 0) {
    throw new PedidoVacioError(MENSAJE_PEDIDO_VACIO);
  }
  const codigo = (codigoRetiro ?? "").trim().toUpperCase();
  if (!codigo) {
    throw new DatoInvalidoError("El código de retiro es obligatorio.");
  }
  return { id: null, codigoRetiro: codigo, cliente, estado: "PENDIENTE", fechaRegistro: fecha, detalles: [...detalles] };
}

/**
 * Pasa al siguiente estado: de Pendiente a En preparación o de En preparación a Listo.
 *
 * @param pedido pedido actual
 * @returns el pedido con el nuevo estado
 * @throws Lanza {@link TransicionEstadoInvalidaError} si está Listo para retirar o Entregado
 */
export function avanzar(pedido: Pedido): Pedido {
  return { ...pedido, estado: siguienteEstado(pedido.estado) };
}

/**
 * Registra la entrega. Primero valida el estado y luego el código (RN-NEG-07). El código se
 * compara sin distinguir mayúsculas ni espacios laterales.
 *
 * @param pedido pedido actual
 * @param codigoPresentado código que muestra el cliente
 * @returns el pedido entregado
 * @throws Lanza {@link TransicionEstadoInvalidaError} si no está Listo para retirar
 * @throws Lanza {@link CodigoRetiroIncorrectoError} si el código no coincide
 */
export function entregar(pedido: Pedido, codigoPresentado: string | null | undefined): Pedido {
  if (pedido.estado !== "LISTO_PARA_RETIRAR") {
    throw new TransicionEstadoInvalidaError(mensajeTransicion(pedido.estado, "ENTREGADO"));
  }
  if ((codigoPresentado ?? "").trim().toUpperCase() !== pedido.codigoRetiro) {
    throw new CodigoRetiroIncorrectoError("El código de retiro no coincide con el pedido.");
  }
  return { ...pedido, estado: "ENTREGADO" };
}
