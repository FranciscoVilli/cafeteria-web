/**
 * Casos de uso del registro e identificación del cliente (HU-11, SUP-01, SUP-15).
 *
 * @module aplicacion/cliente-servicio
 */
import { validarCliente, validarContrasena, type Cliente, type DatosCliente } from "../dominio/cliente";
import { EntidadDuplicadaError, EntidadNoEncontradaError } from "../dominio/errores";
import { normalizarCodigo } from "../dominio/producto";
import type { ClienteRepositorio, ProveedorCuentas } from "./puertos";

/** Mensaje cuando el cliente buscado no existe. */
export const CLIENTE_NO_EXISTE = "El cliente no existe.";

/** Servicio de clientes. */
export class ClienteServicio {
  constructor(
    private readonly clientes: ClienteRepositorio,
    private readonly cuentas: ProveedorCuentas,
  ) {}

  /**
   * Registra un cliente nuevo con su cuenta de acceso y le asigna un código (CLI-001).
   * Si el registro del cliente falla después de crear la cuenta, la cuenta se elimina para
   * no dejar datos a medias.
   *
   * @throws Lanza {@link dominio/errores!DatoInvalidoError | DatoInvalidoError} si algún dato es inválido
   * @throws Lanza {@link EntidadDuplicadaError} si la cédula o el correo ya están registrados
   */
  async registrarCliente(datos: DatosCliente, contrasena: string): Promise<Cliente> {
    const validos = validarCliente(datos);
    validarContrasena(contrasena);
    if (await this.clientes.existePorCedula(validos.cedula)) {
      throw new EntidadDuplicadaError("La cédula ya está registrada.");
    }
    if (await this.clientes.existePorCorreo(validos.correoInstitucional)) {
      throw new EntidadDuplicadaError("El correo ya está registrado.");
    }
    const usuarioId = await this.cuentas.crearCuentaCliente(
      validos.correoInstitucional,
      contrasena,
      `${validos.nombre} ${validos.apellido}`,
    );
    try {
      return await this.clientes.registrar(validos, usuarioId);
    } catch (e) {
      await this.cuentas.eliminarCuenta(usuarioId);
      throw e;
    }
  }

  /**
   * Busca un cliente por su código.
   *
   * @throws Lanza {@link EntidadNoEncontradaError} si no existe
   */
  async buscarPorCodigo(codigo: string): Promise<Cliente> {
    const c = normalizarCodigo(codigo);
    const cliente = c ? await this.clientes.buscarPorCodigo(c) : null;
    if (!cliente) {
      throw new EntidadNoEncontradaError(CLIENTE_NO_EXISTE);
    }
    return cliente;
  }

  /**
   * Devuelve el cliente asociado a una cuenta de acceso, o `null` si la cuenta no es de un
   * cliente (por ejemplo, del personal).
   */
  buscarPorUsuario(usuarioId: string): Promise<Cliente | null> {
    return this.clientes.buscarPorUsuario(usuarioId);
  }
}
