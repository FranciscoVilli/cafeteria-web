/**
 * Casos de uso del pedido: carrito, confirmación, seguimiento y atención
 * (HU-02 a HU-05 y HU-08 a HU-10).
 *
 * @module aplicacion/pedido-servicio
 */
import * as carritos from "../dominio/carrito";
import type { Carrito } from "../dominio/carrito";
import type { Cliente } from "../dominio/cliente";
import { multiplicar, type Centavos } from "../dominio/dinero";
import {
  CodigoRetiroDuplicadoError,
  EntidadNoEncontradaError,
  PedidoVacioError,
  PersistenciaError,
  ProductoNoDisponibleError,
  TransicionEstadoInvalidaError,
} from "../dominio/errores";
import type { EstadoPedido } from "../dominio/estado-pedido";
import * as pedidos from "../dominio/pedido";
import type { Pedido } from "../dominio/pedido";
import { normalizarCodigo, type Producto } from "../dominio/producto";
import { CLIENTE_NO_EXISTE } from "./cliente-servicio";
import { PRODUCTO_NO_EXISTE } from "./menu-servicio";
import type { ClienteRepositorio, GeneradorCodigo, PedidoRepositorio, ProductoRepositorio, Reloj } from "./puertos";

/** Número máximo de códigos que se generan antes de desistir (RN-NEG-05). */
export const MAX_INTENTOS_CODIGO = 5;

/** Mensaje cuando el código de retiro no corresponde a ningún pedido. */
export const PEDIDO_NO_ENCONTRADO = "No se encontró un pedido con ese código.";

/** Mensaje cuando el id del pedido no existe. */
export const PEDIDO_ID_NO_ENCONTRADO = "No se encontró el pedido.";

/** Mensaje cuando otro usuario cambió el pedido al mismo tiempo. */
export const PEDIDO_CAMBIADO = "El pedido cambió de estado mientras lo atendías. Revisa su estado actual.";

/** Línea del carrito con los datos vigentes del producto. */
export interface LineaResumen {
  readonly producto: Producto;
  readonly cantidad: number;
  readonly subtotalCentavos: Centavos;
}

/** Carrito con precios vigentes y total (HU-03). */
export interface ResumenCarrito {
  readonly lineas: readonly LineaResumen[];
  readonly totalCentavos: Centavos;
  /** Códigos que ya no existen o no están disponibles; se quitaron del carrito. */
  readonly retirados: readonly string[];
  /** El carrito sin los productos retirados. */
  readonly carrito: Carrito;
}

/** Dependencias del servicio de pedidos. */
export interface DependenciasPedido {
  pedidos: PedidoRepositorio;
  productos: ProductoRepositorio;
  clientes: ClienteRepositorio;
  generarCodigo: GeneradorCodigo;
  reloj?: Reloj;
}

/** Servicio de pedidos. */
export class PedidoServicio {
  private readonly pedidos: PedidoRepositorio;
  private readonly productos: ProductoRepositorio;
  private readonly clientes: ClienteRepositorio;
  private readonly generarCodigo: GeneradorCodigo;
  private readonly reloj: Reloj;

  constructor(d: DependenciasPedido) {
    this.pedidos = d.pedidos;
    this.productos = d.productos;
    this.clientes = d.clientes;
    this.generarCodigo = d.generarCodigo;
    this.reloj = d.reloj ?? (() => new Date());
  }

  /**
   * Agrega un producto disponible al carrito; si ya estaba, suma la cantidad (HU-02). No
   * escribe en la base de datos.
   *
   * @throws Lanza {@link dominio/errores!CantidadInvalidaError | CantidadInvalidaError} si la cantidad no es válida
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si el producto no existe
   * @throws Lanza {@link dominio/errores!ProductoNoDisponibleError | ProductoNoDisponibleError} si el producto no está disponible
   */
  async agregarAlCarrito(carrito: Carrito, codigoProducto: string, cantidad: number): Promise<Carrito> {
    carritos.validarCantidad(cantidad);
    const producto = await this.productoDisponible(codigoProducto);
    return carritos.agregar(carrito, producto.codigo, cantidad);
  }

  /**
   * Reemplaza la cantidad de una línea (HU-03, escenario 2).
   *
   * @throws Lanza {@link dominio/errores!CantidadInvalidaError | CantidadInvalidaError} si la cantidad no es válida
   * @throws Lanza {@link dominio/errores!ProductoNoDisponibleError | ProductoNoDisponibleError} si el producto ya no está disponible
   */
  async cambiarCantidad(carrito: Carrito, codigoProducto: string, cantidad: number): Promise<Carrito> {
    carritos.validarCantidad(cantidad);
    const producto = await this.productoDisponible(codigoProducto);
    return carritos.cambiarCantidad(carrito, producto.codigo, cantidad);
  }

  /** Quita un producto del carrito (HU-02, escenario 5). */
  quitarDelCarrito(carrito: Carrito, codigoProducto: string): Carrito {
    return carritos.quitar(carrito, codigoProducto);
  }

  /**
   * Calcula el total del carrito con los precios vigentes (HU-03, RN-NEG-03).
   *
   * @returns total en centavos; 0 si está vacío
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si algún producto ya no existe
   */
  async calcularTotal(carrito: Carrito): Promise<Centavos> {
    const porCodigo = await this.productosDe(carrito);
    let total = 0;
    for (const linea of carrito) {
      const producto = porCodigo.get(linea.codigo);
      if (!producto) {
        throw new EntidadNoEncontradaError(PRODUCTO_NO_EXISTE);
      }
      total += multiplicar(producto.precioCentavos, linea.cantidad);
    }
    return total;
  }

  /**
   * Prepara el carrito para mostrarse: precios vigentes, subtotales y total. Retira los
   * productos que dejaron de existir o de estar disponibles e informa cuáles fueron.
   */
  async resumirCarrito(carrito: Carrito): Promise<ResumenCarrito> {
    const porCodigo = await this.productosDe(carrito);
    const lineas: LineaResumen[] = [];
    const retirados: string[] = [];
    for (const linea of carrito) {
      const producto = porCodigo.get(linea.codigo);
      if (producto?.disponible) {
        lineas.push({ producto, cantidad: linea.cantidad, subtotalCentavos: multiplicar(producto.precioCentavos, linea.cantidad) });
      } else {
        retirados.push(producto?.nombre ?? linea.codigo);
      }
    }
    return {
      lineas,
      totalCentavos: lineas.reduce((t, l) => t + l.subtotalCentavos, 0),
      retirados,
      carrito: lineas.map((l) => ({ codigo: l.producto.codigo, cantidad: l.cantidad })),
    };
  }

  /**
   * Confirma el carrito como un pedido PENDIENTE (HU-04). Revalida la disponibilidad
   * (SUP-07), toma el precio vigente (SUP-05), genera un código no usado (hasta
   * {@link MAX_INTENTOS_CODIGO} intentos) y guarda cabecera y líneas en una transacción. Si
   * al guardar otro pedido simultáneo tomó el mismo código, repite con otro (diseño 8.2).
   *
   * @throws Lanza {@link dominio/errores!PedidoVacioError | PedidoVacioError} si el carrito no tiene productos (RN-NEG-01)
   * @throws Lanza {@link dominio/errores!ProductoNoDisponibleError | ProductoNoDisponibleError} si algún producto no está disponible (RN-NEG-02)
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si el cliente o un producto no existe
   * @throws Lanza {@link dominio/errores!PersistenciaError | PersistenciaError} si no se pudo guardar
   */
  async confirmarPedido(carrito: Carrito, codigoCliente: string): Promise<Pedido> {
    const cliente = await this.buscarCliente(codigoCliente);
    if (carritos.estaVacio(carrito)) {
      throw new PedidoVacioError(pedidos.MENSAJE_PEDIDO_VACIO);
    }
    const porCodigo = await this.productosDe(carrito);
    const detalles = carrito.map((linea) => {
      const producto = porCodigo.get(linea.codigo);
      if (!producto) {
        throw new EntidadNoEncontradaError(PRODUCTO_NO_EXISTE);
      }
      this.exigirDisponible(producto);
      return pedidos.detalleConPrecioVigente(producto, linea.cantidad);
    });
    const fecha = this.reloj();
    let ultimo: unknown;
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
      const pedido = pedidos.confirmar(cliente, detalles, await this.codigoLibre(), fecha);
      try {
        return await this.pedidos.guardar(pedido);
      } catch (e) {
        if (!(e instanceof CodigoRetiroDuplicadoError)) {
          throw e;
        }
        ultimo = e;
      }
    }
    throw ultimo;
  }

  /**
   * Consulta un pedido por su código de retiro (HU-05).
   *
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si no existe
   */
  async consultarPorCodigoRetiro(codigo: string): Promise<Pedido> {
    const c = (codigo ?? "").trim().toUpperCase();
    const pedido = c ? await this.pedidos.buscarPorCodigoRetiro(c) : null;
    if (!pedido) {
      throw new EntidadNoEncontradaError(PEDIDO_NO_ENCONTRADO);
    }
    return pedido;
  }

  /**
   * Lista los pedidos de un cliente, del más reciente al más antiguo (HU-05, esc. 3).
   *
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si el cliente no existe
   */
  async consultarPedidosDeCliente(codigoCliente: string): Promise<Pedido[]> {
    const cliente = await this.buscarCliente(codigoCliente);
    return this.pedidos.listarPorCliente(cliente.codigo);
  }

  /** Bandeja del personal por orden de llegada (HU-08, SUP-14); `null` muestra todos. */
  listarPedidos(estado: EstadoPedido | null): Promise<Pedido[]> {
    return this.pedidos.listarPorEstado(estado);
  }

  /** Cantidad de pedidos en cada estado, para los indicadores de la bandeja. */
  contarPorEstado(): Promise<Record<EstadoPedido, number>> {
    return this.pedidos.contarPorEstado();
  }

  /**
   * Busca un pedido por id (pantalla P-P3).
   *
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si no existe
   */
  async buscarPedido(id: number): Promise<Pedido> {
    const pedido = Number.isInteger(id) && id > 0 ? await this.pedidos.buscarPorId(id) : null;
    if (!pedido) {
      throw new EntidadNoEncontradaError(PEDIDO_ID_NO_ENCONTRADO);
    }
    return pedido;
  }

  /**
   * Avanza el pedido al siguiente estado (HU-09).
   *
   * @throws Lanza {@link dominio/errores!TransicionEstadoInvalidaError | TransicionEstadoInvalidaError} si está Listo para retirar o Entregado, o
   *         si otro usuario lo cambió al mismo tiempo
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si no existe
   */
  async avanzarEstado(id: number): Promise<Pedido> {
    const actual = await this.buscarPedido(id);
    return this.guardarTransicion(actual, pedidos.avanzar(actual));
  }

  /**
   * Entrega el pedido verificando primero el estado y luego el código (HU-10, RN-NEG-07).
   *
   * @throws Lanza {@link dominio/errores!TransicionEstadoInvalidaError | TransicionEstadoInvalidaError} si no está Listo para retirar
   * @throws Lanza {@link dominio/errores!CodigoRetiroIncorrectoError | CodigoRetiroIncorrectoError} si el código no coincide
   * @throws Lanza {@link dominio/errores!EntidadNoEncontradaError | EntidadNoEncontradaError} si no existe
   */
  async entregarPedido(id: number, codigoPresentado: string): Promise<Pedido> {
    const actual = await this.buscarPedido(id);
    return this.guardarTransicion(actual, pedidos.entregar(actual, codigoPresentado));
  }

  private async guardarTransicion(antes: Pedido, despues: Pedido): Promise<Pedido> {
    if (!(await this.pedidos.actualizarEstado(despues, antes.estado))) {
      throw new TransicionEstadoInvalidaError(PEDIDO_CAMBIADO);
    }
    return despues;
  }

  private async codigoLibre(): Promise<string> {
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
      const candidato = this.generarCodigo();
      if (!(await this.pedidos.existeCodigoRetiro(candidato))) {
        return candidato;
      }
    }
    throw new PersistenciaError();
  }

  private async buscarCliente(codigo: string): Promise<Cliente> {
    const c = normalizarCodigo(codigo);
    const cliente = c ? await this.clientes.buscarPorCodigo(c) : null;
    if (!cliente) {
      throw new EntidadNoEncontradaError(CLIENTE_NO_EXISTE);
    }
    return cliente;
  }

  private async productosDe(carrito: Carrito): Promise<Map<string, Producto>> {
    if (carrito.length === 0) {
      return new Map();
    }
    const lista = await this.productos.buscarVarios(carrito.map((l) => l.codigo));
    return new Map(lista.map((p) => [p.codigo, p]));
  }

  private async productoDisponible(codigo: string): Promise<Producto> {
    const c = normalizarCodigo(codigo);
    const producto = c ? await this.productos.buscarPorCodigo(c) : null;
    if (!producto) {
      throw new EntidadNoEncontradaError(PRODUCTO_NO_EXISTE);
    }
    this.exigirDisponible(producto);
    return producto;
  }

  private exigirDisponible(producto: Producto): void {
    if (!producto.disponible) {
      throw new ProductoNoDisponibleError(`El producto ${producto.nombre} no está disponible.`);
    }
  }
}
