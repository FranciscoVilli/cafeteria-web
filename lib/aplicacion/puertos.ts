/**
 * Puertos: interfaces que la capa de aplicación necesita y que la infraestructura implementa
 * (Supabase en producción, memoria en las pruebas). Así las reglas no dependen de la base de
 * datos ni de la interfaz (RNF-06).
 *
 * @module aplicacion/puertos
 */
import type { Cliente, DatosCliente } from "../dominio/cliente";
import type { EstadoPedido } from "../dominio/estado-pedido";
import type { Pedido } from "../dominio/pedido";
import type { Producto } from "../dominio/producto";

/** Acceso a los productos del menú. */
export interface ProductoRepositorio {
  /** Inserta el producto o, si el código ya existe, lo actualiza. */
  guardar(producto: Producto): Promise<void>;
  /** Busca por código (ya normalizado en mayúsculas). */
  buscarPorCodigo(codigo: string): Promise<Producto | null>;
  /** Busca varios productos por código; omite los que no existen. */
  buscarVarios(codigos: readonly string[]): Promise<Producto[]>;
  /** Productos disponibles, ordenados por categoría y nombre. */
  listarDisponibles(): Promise<Producto[]>;
  /** Todos los productos, ordenados por categoría y nombre. */
  listarTodos(): Promise<Producto[]>;
}

/** Acceso a los clientes registrados. */
export interface ClienteRepositorio {
  /**
   * Registra un cliente y le asigna el siguiente código (CLI-001, CLI-002…).
   *
   * @param datos datos validados
   * @param usuarioId id de la cuenta de acceso asociada
   * @throws Lanza {@link dominio/errores!EntidadDuplicadaError | EntidadDuplicadaError} si la cédula o el correo ya existen
   */
  registrar(datos: DatosCliente, usuarioId: string): Promise<Cliente>;
  buscarPorCodigo(codigo: string): Promise<Cliente | null>;
  buscarPorUsuario(usuarioId: string): Promise<Cliente | null>;
  existePorCedula(cedula: string): Promise<boolean>;
  existePorCorreo(correo: string): Promise<boolean>;
}

/** Cuentas de acceso (correo y contraseña). */
export interface ProveedorCuentas {
  /**
   * Crea la cuenta de un cliente, ya confirmada.
   *
   * @returns el id de la cuenta
   * @throws Lanza {@link dominio/errores!EntidadDuplicadaError | EntidadDuplicadaError} si el correo ya tiene cuenta
   */
  crearCuentaCliente(correo: string, contrasena: string, nombre: string): Promise<string>;
  /** Elimina una cuenta (compensación si el registro falla a medias). */
  eliminarCuenta(usuarioId: string): Promise<void>;
}

/** Acceso a los pedidos. */
export interface PedidoRepositorio {
  /**
   * Guarda un pedido nuevo con todas sus líneas en una sola transacción (RNF-03).
   *
   * @returns el pedido con id asignado
   * @throws Lanza {@link dominio/errores!CodigoRetiroDuplicadoError | CodigoRetiroDuplicadoError} si el código ya existe
   */
  guardar(pedido: Pedido): Promise<Pedido>;
  /**
   * Cambia el estado solo si el pedido sigue en `estadoAnterior` (evita que dos personas
   * lo avancen a la vez).
   *
   * @returns `true` si se actualizó; `false` si otro usuario lo cambió antes
   */
  actualizarEstado(pedido: Pedido, estadoAnterior: EstadoPedido): Promise<boolean>;
  buscarPorId(id: number): Promise<Pedido | null>;
  buscarPorCodigoRetiro(codigo: string): Promise<Pedido | null>;
  /** Pedidos por fecha de registro ascendente (SUP-14); `null` para todos. */
  listarPorEstado(estado: EstadoPedido | null): Promise<Pedido[]>;
  /** Pedidos de un cliente, del más reciente al más antiguo. */
  listarPorCliente(codigoCliente: string): Promise<Pedido[]>;
  /** Cantidad de pedidos en cada estado. */
  contarPorEstado(): Promise<Record<EstadoPedido, number>>;
  existeCodigoRetiro(codigo: string): Promise<boolean>;
}

/** Genera candidatos de código de retiro (no garantiza unicidad). */
export type GeneradorCodigo = () => string;

/** Fuente de la fecha y hora actual (inyectable en pruebas). */
export type Reloj = () => Date;
