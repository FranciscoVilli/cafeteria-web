/**
 * Implementaciones en memoria de los puertos, para probar los servicios sin base de datos.
 * Reproducen las garantías de la base real que importan a las reglas: códigos de cliente
 * correlativos, UNIQUE del código de retiro y de la cédula, y transacciones atómicas.
 */
import type { Cliente, DatosCliente } from "../../dominio/cliente";
import { CodigoRetiroDuplicadoError, EntidadDuplicadaError, PersistenciaError } from "../../dominio/errores";
import { ESTADOS, type EstadoPedido } from "../../dominio/estado-pedido";
import type { Pedido } from "../../dominio/pedido";
import type { Producto } from "../../dominio/producto";
import { ClienteServicio } from "../cliente-servicio";
import { MenuServicio } from "../menu-servicio";
import { PedidoServicio } from "../pedido-servicio";
import type { ClienteRepositorio, PedidoRepositorio, ProductoRepositorio, ProveedorCuentas } from "../puertos";

const ordenar = (a: Producto, b: Producto) =>
  a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre);

export class ProductosEnMemoria implements ProductoRepositorio {
  readonly filas = new Map<string, Producto>();
  async guardar(p: Producto) {
    this.filas.set(p.codigo, { ...p });
  }
  async buscarPorCodigo(codigo: string) {
    return this.filas.get(codigo) ?? null;
  }
  async buscarVarios(codigos: readonly string[]) {
    return codigos.map((c) => this.filas.get(c)).filter((p): p is Producto => !!p);
  }
  async listarDisponibles() {
    return [...this.filas.values()].filter((p) => p.disponible).sort(ordenar);
  }
  async listarTodos() {
    return [...this.filas.values()].sort(ordenar);
  }
}

export class ClientesEnMemoria implements ClienteRepositorio {
  readonly filas: (Cliente & { usuarioId: string })[] = [];
  falloAlRegistrar = false;
  async registrar(datos: DatosCliente, usuarioId: string) {
    if (this.falloAlRegistrar) throw new PersistenciaError();
    if (this.filas.some((c) => c.cedula === datos.cedula)) {
      throw new EntidadDuplicadaError("La cédula ya está registrada.");
    }
    const cliente: Cliente = { codigo: `CLI-${String(this.filas.length + 1).padStart(3, "0")}`, ...datos };
    this.filas.push({ ...cliente, usuarioId });
    return cliente;
  }
  async buscarPorCodigo(codigo: string) {
    return this.sinUsuario(this.filas.find((c) => c.codigo === codigo));
  }
  async buscarPorUsuario(usuarioId: string) {
    return this.sinUsuario(this.filas.find((c) => c.usuarioId === usuarioId));
  }
  async existePorCedula(cedula: string) {
    return this.filas.some((c) => c.cedula === cedula);
  }
  async existePorCorreo(correo: string) {
    return this.filas.some((c) => c.correoInstitucional === correo);
  }
  private sinUsuario(c?: Cliente & { usuarioId: string }): Cliente | null {
    if (!c) return null;
    return {
      codigo: c.codigo,
      nombre: c.nombre,
      apellido: c.apellido,
      cedula: c.cedula,
      celular: c.celular,
      correoInstitucional: c.correoInstitucional,
    };
  }
}

export class CuentasEnMemoria implements ProveedorCuentas {
  readonly cuentas = new Map<string, string>();
  async crearCuentaCliente(correo: string) {
    if ([...this.cuentas.values()].includes(correo)) {
      throw new EntidadDuplicadaError("El correo ya está registrado.");
    }
    const id = `usuario-${this.cuentas.size + 1}`;
    this.cuentas.set(id, correo);
    return id;
  }
  async eliminarCuenta(id: string) {
    this.cuentas.delete(id);
  }
}

export class PedidosEnMemoria implements PedidoRepositorio {
  readonly filas: Pedido[] = [];
  /** Si se define, `guardar` lo lanza (simula un fallo a mitad de la transacción). */
  falloAlGuardar: Error | null = null;
  /** Simula que otro usuario cambió el pedido entre la lectura y la escritura. */
  cambiadoPorOtro = false;
  private siguienteId = 1;

  async guardar(p: Pedido) {
    if (this.falloAlGuardar) throw this.falloAlGuardar;
    if (this.filas.some((f) => f.codigoRetiro === p.codigoRetiro)) {
      throw new CodigoRetiroDuplicadoError();
    }
    const guardado = { ...p, id: this.siguienteId++ };
    this.filas.push(guardado);
    return guardado;
  }
  async actualizarEstado(p: Pedido, anterior: EstadoPedido) {
    const i = this.filas.findIndex((f) => f.id === p.id);
    if (i < 0 || this.cambiadoPorOtro || this.filas[i].estado !== anterior) return false;
    this.filas[i] = { ...this.filas[i], estado: p.estado };
    return true;
  }
  async buscarPorId(id: number) {
    return this.filas.find((f) => f.id === id) ?? null;
  }
  async buscarPorCodigoRetiro(codigo: string) {
    return this.filas.find((f) => f.codigoRetiro === codigo) ?? null;
  }
  async listarPorEstado(estado: EstadoPedido | null) {
    return this.filas
      .filter((f) => estado === null || f.estado === estado)
      .sort((a, b) => a.fechaRegistro.getTime() - b.fechaRegistro.getTime() || a.id! - b.id!);
  }
  async listarPorCliente(codigo: string) {
    return this.filas
      .filter((f) => f.cliente.codigo === codigo)
      .sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime() || b.id! - a.id!);
  }
  async contarPorEstado() {
    const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoPedido, number>;
    this.filas.forEach((f) => conteo[f.estado]++);
    return conteo;
  }
  async existeCodigoRetiro(codigo: string) {
    return this.filas.some((f) => f.codigoRetiro === codigo);
  }
}

/** Generador que entrega códigos predefinidos y luego correlativos A00001, A00002… */
export class GeneradorSecuencia {
  private readonly cola: string[] = [];
  private correlativo = 0;
  llamadas = 0;
  encolar(...codigos: string[]) {
    this.cola.push(...codigos);
  }
  readonly generar = () => {
    this.llamadas++;
    return this.cola.shift() ?? `A${String(++this.correlativo).padStart(5, "0")}`;
  };
}

/** Reloj que avanza un minuto en cada llamada, desde el 20/11/2026 10:00. */
export function relojDePrueba() {
  let t = new Date("2026-11-20T15:00:00Z").getTime();
  return () => new Date((t += 60_000));
}

/** Arma los tres servicios con repositorios en memoria. */
export function crearEntorno() {
  const productos = new ProductosEnMemoria();
  const clientes = new ClientesEnMemoria();
  const cuentas = new CuentasEnMemoria();
  const pedidos = new PedidosEnMemoria();
  const generador = new GeneradorSecuencia();
  return {
    productos,
    clientes,
    cuentas,
    pedidos,
    generador,
    menu: new MenuServicio(productos),
    clienteServicio: new ClienteServicio(clientes, cuentas),
    pedidoServicio: new PedidoServicio({
      pedidos,
      productos,
      clientes,
      generarCodigo: generador.generar,
      reloj: relojDePrueba(),
    }),
  };
}

export type Entorno = ReturnType<typeof crearEntorno>;

/** BEB-001 Café americano 1.50, ALI-001 Sánduche de pollo 2.50 y ALI-003 Ensalada (no disponible). */
export async function cargarMenuBase(e: Entorno) {
  await e.productos.guardar({ codigo: "BEB-001", nombre: "Café americano", categoria: "BEBIDA", precioCentavos: 150, disponible: true, descripcion: "", imagenUrl: null });
  await e.productos.guardar({ codigo: "ALI-001", nombre: "Sánduche de pollo", categoria: "ALIMENTO", precioCentavos: 250, disponible: true, descripcion: "", imagenUrl: null });
  await e.productos.guardar({ codigo: "ALI-003", nombre: "Ensalada de frutas", categoria: "ALIMENTO", precioCentavos: 200, disponible: false, descripcion: "", imagenUrl: null });
}

export const ANA = {
  nombre: "Ana",
  apellido: "Pérez",
  cedula: "1712345678",
  celular: "0991234567",
  correoInstitucional: "ana.perez@epn.edu.ec",
};

export const LUIS = {
  nombre: "Luis",
  apellido: "Mora",
  cedula: "1723456789",
  celular: "0987654321",
  correoInstitucional: "luis.mora@epn.edu.ec",
};
