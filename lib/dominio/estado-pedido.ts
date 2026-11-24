/**
 * Etapas de atención de un pedido, en el único orden permitido (RN-NEG-06):
 * Pendiente → En preparación → Listo para retirar → Entregado. Sin saltos ni retrocesos.
 *
 * @module dominio/estado-pedido
 */
import { TransicionEstadoInvalidaError } from "./errores";

/** Estados en orden. */
export const ESTADOS = ["PENDIENTE", "EN_PREPARACION", "LISTO_PARA_RETIRAR", "ENTREGADO"] as const;

/** Estado de un pedido. */
export type EstadoPedido = (typeof ESTADOS)[number];

/** Nombre legible de cada estado. */
export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  PENDIENTE: "Pendiente",
  EN_PREPARACION: "En preparación",
  LISTO_PARA_RETIRAR: "Listo para retirar",
  ENTREGADO: "Entregado",
};

/**
 * Indica si un texto es un estado válido.
 *
 * @param valor texto
 * @returns `true` si es uno de los cuatro estados
 */
export function esEstado(valor: unknown): valor is EstadoPedido {
  return typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor);
}

/**
 * Arma el mensaje estándar de una transición rechazada.
 *
 * @param actual estado en que está el pedido
 * @param destino estado al que se intentó pasar
 * @returns «El pedido está en {estado}; no puede pasar a {destino}.»
 */
export function mensajeTransicion(actual: EstadoPedido, destino: EstadoPedido): string {
  return `El pedido está en ${NOMBRE_ESTADO[actual]}; no puede pasar a ${NOMBRE_ESTADO[destino]}.`;
}

/**
 * Devuelve el estado al que se avanza con la acción «avanzar» del personal. El paso a
 * Entregado no se hace con esta función sino con la entrega, porque exige el código
 * (RN-NEG-07).
 *
 * @param estado estado actual
 * @returns EN_PREPARACION desde PENDIENTE y LISTO_PARA_RETIRAR desde EN_PREPARACION
 * @throws Lanza {@link TransicionEstadoInvalidaError} desde LISTO_PARA_RETIRAR o ENTREGADO
 */
export function siguienteEstado(estado: EstadoPedido): EstadoPedido {
  switch (estado) {
    case "PENDIENTE":
      return "EN_PREPARACION";
    case "EN_PREPARACION":
      return "LISTO_PARA_RETIRAR";
    case "LISTO_PARA_RETIRAR":
      throw new TransicionEstadoInvalidaError(mensajeTransicion(estado, "ENTREGADO"));
    default:
      throw new TransicionEstadoInvalidaError(
        `El pedido está en ${NOMBRE_ESTADO[estado]}; no puede pasar a otro estado.`,
      );
  }
}
