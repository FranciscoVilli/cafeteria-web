/**
 * Casos de uso del menú: consulta del cliente (HU-01) y mantenimiento por el personal
 * (HU-06, HU-07).
 *
 * @module aplicacion/menu-servicio
 */
import type { Centavos } from "../dominio/dinero";
import { EntidadDuplicadaError, EntidadNoEncontradaError } from "../dominio/errores";
import {
  actualizarProducto,
  cambiarDisponibilidad,
  crearProducto,
  normalizarCodigo,
  type DatosProducto,
  type ExtrasProducto,
  type Producto,
} from "../dominio/producto";
import type { ProductoRepositorio } from "./puertos";

/** Mensaje cuando el producto buscado no existe. */
export const PRODUCTO_NO_EXISTE = "El producto no existe.";

/** Servicio del menú. */
export class MenuServicio {
  constructor(private readonly productos: ProductoRepositorio) {}

  /** Menú del cliente: solo productos disponibles (SUP-09). */
  listarMenuCliente(): Promise<Producto[]> {
    return this.productos.listarDisponibles();
  }

  /** Todos los productos, con su disponibilidad, para el personal (SUP-09). */
  listarTodosLosProductos(): Promise<Producto[]> {
    return this.productos.listarTodos();
  }

  /**
   * Registra un producto nuevo (HU-06).
   *
   * @throws Lanza {@link dominio/errores!DatoInvalidoError | DatoInvalidoError} si algún dato es inválido
   * @throws Lanza {@link EntidadDuplicadaError} si ya existe un producto con ese código
   */
  async registrarProducto(datos: DatosProducto): Promise<Producto> {
    const nuevo = crearProducto(datos);
    if (await this.productos.buscarPorCodigo(nuevo.codigo)) {
      throw new EntidadDuplicadaError("Ya existe un producto con ese código.");
    }
    await this.productos.guardar(nuevo);
    return nuevo;
  }

  /**
   * Cambia nombre, categoría, precio y, si se indican, descripción y foto (HU-07). Los
   * pedidos confirmados conservan su precio.
   *
   * @throws Lanza {@link EntidadNoEncontradaError} si el producto no existe
   * @throws Lanza {@link dominio/errores!DatoInvalidoError | DatoInvalidoError} si algún dato es inválido
   */
  async actualizarProducto(
    codigo: string,
    nombre: string,
    categoria: string,
    precioCentavos: Centavos,
    extras?: ExtrasProducto,
  ): Promise<Producto> {
    const actualizado = actualizarProducto(await this.buscar(codigo), nombre, categoria, precioCentavos, extras);
    await this.productos.guardar(actualizado);
    return actualizado;
  }

  /**
   * Habilita o deshabilita un producto (HU-07).
   *
   * @throws Lanza {@link EntidadNoEncontradaError} si el producto no existe
   */
  async cambiarDisponibilidad(codigo: string, disponible: boolean): Promise<Producto> {
    const actualizado = cambiarDisponibilidad(await this.buscar(codigo), disponible);
    await this.productos.guardar(actualizado);
    return actualizado;
  }

  private async buscar(codigo: string): Promise<Producto> {
    const c = normalizarCodigo(codigo);
    const producto = c ? await this.productos.buscarPorCodigo(c) : null;
    if (!producto) {
      throw new EntidadNoEncontradaError(PRODUCTO_NO_EXISTE);
    }
    return producto;
  }
}
