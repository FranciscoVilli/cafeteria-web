/**
 * Repositorios sobre Supabase (PostgreSQL). Implementan los puertos de la capa de aplicación
 * y traducen los errores de la base a errores del dominio.
 *
 * @module infraestructura/supabase/repositorios
 */
import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  ClienteRepositorio,
  PedidoRepositorio,
  ProductoRepositorio,
  ProveedorCuentas,
} from "@/lib/aplicacion/puertos";
import type { Cliente, DatosCliente } from "@/lib/dominio/cliente";
import { CodigoRetiroDuplicadoError, EntidadDuplicadaError, PersistenciaError } from "@/lib/dominio/errores";
import { ESTADOS, esEstado, type EstadoPedido } from "@/lib/dominio/estado-pedido";
import type { Pedido } from "@/lib/dominio/pedido";
import { aCategoria, type Producto } from "@/lib/dominio/producto";

/** Máximo de pedidos que se muestran a la vez en la bandeja (RNF-02). */
export const LIMITE_BANDEJA = 300;

// ------------------------------------------------------------------ Traducción de errores

/** Restricciones UNIQUE que tienen un significado de negocio. */
const DUPLICADOS: Record<string, () => Error> = {
  pedido_codigo_retiro_key: () => new CodigoRetiroDuplicadoError(),
  cliente_cedula_key: () => new EntidadDuplicadaError("La cédula ya está registrada."),
  cliente_correo_institucional_key: () => new EntidadDuplicadaError("El correo ya está registrado."),
  producto_pkey: () => new EntidadDuplicadaError("Ya existe un producto con ese código."),
  perfil_pkey: () => new EntidadDuplicadaError("La cuenta ya tiene un perfil."),
};

/**
 * Convierte un error de PostgREST en un error del dominio.
 *
 * @param error error devuelto por Supabase
 * @returns error de negocio si corresponde a una restricción conocida; si no, de persistencia
 */
export function traducirError(error: PostgrestError): Error {
  if (error.code === "23505") {
    const restriccion = Object.keys(DUPLICADOS).find((r) => error.message.includes(r));
    if (restriccion) {
      return DUPLICADOS[restriccion]();
    }
  }
  return new PersistenciaError(undefined, { cause: error });
}

function exigir<T>(resultado: { data: T; error: PostgrestError | null }): T {
  if (resultado.error) {
    throw traducirError(resultado.error);
  }
  return resultado.data;
}

// ------------------------------------------------------------------ Filas

interface FilaProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  precio_centavos: number;
  disponible: boolean;
  descripcion: string;
  imagen_url: string | null;
}

interface FilaCliente {
  codigo: string;
  nombre: string;
  apellido: string;
  cedula: string;
  celular: string;
  correo_institucional: string;
}

interface FilaPedido {
  id: number;
  codigo_retiro: string;
  estado: string;
  fecha_registro: string;
  cliente: FilaCliente;
  detalle_pedido: {
    orden: number;
    cantidad: number;
    precio_unitario_centavos: number;
    producto: Pick<FilaProducto, "codigo" | "nombre" | "categoria" | "imagen_url">;
  }[];
}

const COLUMNAS_PRODUCTO = "codigo, nombre, categoria, precio_centavos, disponible, descripcion, imagen_url";
const COLUMNAS_CLIENTE = "codigo, nombre, apellido, cedula, celular, correo_institucional";
const COLUMNAS_PEDIDO = `id, codigo_retiro, estado, fecha_registro,
  cliente:cliente_codigo (${COLUMNAS_CLIENTE}),
  detalle_pedido (orden, cantidad, precio_unitario_centavos, producto:producto_codigo (codigo, nombre, categoria, imagen_url))`;

const aProducto = (f: FilaProducto): Producto => ({
  codigo: f.codigo,
  nombre: f.nombre,
  categoria: aCategoria(f.categoria),
  precioCentavos: f.precio_centavos,
  disponible: f.disponible,
  descripcion: f.descripcion ?? "",
  imagenUrl: f.imagen_url ?? null,
});

const aCliente = (f: FilaCliente): Cliente => ({
  codigo: f.codigo,
  nombre: f.nombre,
  apellido: f.apellido,
  cedula: f.cedula,
  celular: f.celular,
  correoInstitucional: f.correo_institucional,
});

function aPedido(f: FilaPedido): Pedido {
  if (!esEstado(f.estado)) {
    throw new PersistenciaError(`Estado desconocido: ${f.estado}`);
  }
  return {
    id: Number(f.id),
    codigoRetiro: f.codigo_retiro,
    cliente: aCliente(f.cliente),
    estado: f.estado,
    fechaRegistro: new Date(f.fecha_registro),
    detalles: [...f.detalle_pedido]
      .sort((a, b) => a.orden - b.orden)
      .map((d) => ({
        producto: {
          codigo: d.producto.codigo,
          nombre: d.producto.nombre,
          categoria: aCategoria(d.producto.categoria),
          imagenUrl: d.producto.imagen_url ?? null,
        },
        cantidad: d.cantidad,
        precioUnitarioCentavos: d.precio_unitario_centavos,
      })),
  };
}

// ------------------------------------------------------------------ Productos

/** Productos en la tabla `producto`. */
export class ProductosSupabase implements ProductoRepositorio {
  constructor(private readonly db: SupabaseClient) {}

  async guardar(p: Producto) {
    exigir(
      await this.db.from("producto").upsert({
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_centavos: p.precioCentavos,
        disponible: p.disponible,
        descripcion: p.descripcion,
        imagen_url: p.imagenUrl,
      }),
    );
  }

  async buscarPorCodigo(codigo: string) {
    const fila = exigir(await this.db.from("producto").select(COLUMNAS_PRODUCTO).eq("codigo", codigo).maybeSingle());
    return fila ? aProducto(fila as FilaProducto) : null;
  }

  async buscarVarios(codigos: readonly string[]) {
    if (codigos.length === 0) return [];
    const filas = exigir(await this.db.from("producto").select(COLUMNAS_PRODUCTO).in("codigo", [...codigos]));
    return (filas as FilaProducto[]).map(aProducto);
  }

  async listarDisponibles() {
    return this.listar(true);
  }

  async listarTodos() {
    return this.listar(false);
  }

  private async listar(soloDisponibles: boolean) {
    let consulta = this.db.from("producto").select(COLUMNAS_PRODUCTO);
    if (soloDisponibles) consulta = consulta.eq("disponible", true);
    const filas = exigir(await consulta.order("categoria").order("nombre"));
    return (filas as FilaProducto[]).map(aProducto);
  }
}

// ------------------------------------------------------------------ Clientes

/** Clientes en las tablas `cliente` y `perfil`. */
export class ClientesSupabase implements ClienteRepositorio {
  constructor(private readonly db: SupabaseClient) {}

  async registrar(datos: DatosCliente, usuarioId: string) {
    const codigo = exigir(
      await this.db.rpc("registrar_cliente", {
        p_usuario_id: usuarioId,
        p_nombre: datos.nombre,
        p_apellido: datos.apellido,
        p_cedula: datos.cedula,
        p_celular: datos.celular,
        p_correo: datos.correoInstitucional,
      }),
    ) as string;
    return { codigo, ...datos };
  }

  async buscarPorCodigo(codigo: string) {
    return this.buscarUno("codigo", codigo);
  }

  async buscarPorUsuario(usuarioId: string) {
    return this.buscarUno("usuario_id", usuarioId);
  }

  async existePorCedula(cedula: string) {
    return (await this.buscarUno("cedula", cedula)) !== null;
  }

  async existePorCorreo(correo: string) {
    return (await this.buscarUno("correo_institucional", correo)) !== null;
  }

  private async buscarUno(columna: string, valor: string) {
    const fila = exigir(await this.db.from("cliente").select(COLUMNAS_CLIENTE).eq(columna, valor).maybeSingle());
    return fila ? aCliente(fila as FilaCliente) : null;
  }
}

/** Cuentas de acceso de Supabase Auth. */
export class CuentasSupabase implements ProveedorCuentas {
  constructor(private readonly db: SupabaseClient) {}

  async crearCuentaCliente(correo: string, contrasena: string, nombre: string) {
    const { data, error } = await this.db.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error) {
      if (error.code === "email_exists" || error.status === 422) {
        throw new EntidadDuplicadaError("El correo ya está registrado.");
      }
      if (error.code === "weak_password") {
        throw new EntidadDuplicadaError("La contraseña es demasiado débil. Use una más larga o con más variedad.");
      }
      throw new PersistenciaError(undefined, { cause: error });
    }
    return data.user.id;
  }

  async eliminarCuenta(usuarioId: string) {
    await this.db.auth.admin.deleteUser(usuarioId);
  }
}

// ------------------------------------------------------------------ Pedidos

/** Pedidos en las tablas `pedido` y `detalle_pedido`. */
export class PedidosSupabase implements PedidoRepositorio {
  constructor(private readonly db: SupabaseClient) {}

  async guardar(p: Pedido) {
    const id = exigir(
      await this.db.rpc("crear_pedido", {
        p_codigo_retiro: p.codigoRetiro,
        p_cliente_codigo: p.cliente.codigo,
        p_fecha: p.fechaRegistro.toISOString(),
        p_detalles: p.detalles.map((d) => ({
          producto_codigo: d.producto.codigo,
          cantidad: d.cantidad,
          precio_unitario_centavos: d.precioUnitarioCentavos,
        })),
      }),
    ) as number;
    return { ...p, id: Number(id) };
  }

  async actualizarEstado(p: Pedido, estadoAnterior: EstadoPedido) {
    const filas = exigir(
      await this.db.from("pedido").update({ estado: p.estado }).eq("id", p.id).eq("estado", estadoAnterior).select("id"),
    );
    return (filas as unknown[]).length === 1;
  }

  async buscarPorId(id: number) {
    return this.buscarUno("id", id);
  }

  async buscarPorCodigoRetiro(codigo: string) {
    return this.buscarUno("codigo_retiro", codigo);
  }

  async listarPorEstado(estado: EstadoPedido | null) {
    let consulta = this.db.from("pedido").select(COLUMNAS_PEDIDO);
    if (estado) consulta = consulta.eq("estado", estado);
    // Los más recientes hasta el límite, devueltos por orden de llegada (SUP-14).
    const filas = exigir(await consulta.order("fecha_registro", { ascending: false }).order("id", { ascending: false }).limit(LIMITE_BANDEJA));
    return (filas as unknown as FilaPedido[]).map(aPedido).reverse();
  }

  async listarPorCliente(codigoCliente: string) {
    const filas = exigir(
      await this.db
        .from("pedido")
        .select(COLUMNAS_PEDIDO)
        .eq("cliente_codigo", codigoCliente)
        .order("fecha_registro", { ascending: false })
        .order("id", { ascending: false })
        .limit(100),
    );
    return (filas as unknown as FilaPedido[]).map(aPedido);
  }

  async contarPorEstado() {
    const filas = exigir(await this.db.rpc("contar_pedidos_por_estado")) as { estado: string; cantidad: number }[];
    const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoPedido, number>;
    for (const f of filas ?? []) {
      if (esEstado(f.estado)) conteo[f.estado] = Number(f.cantidad);
    }
    return conteo;
  }

  async existeCodigoRetiro(codigo: string) {
    const { count, error } = await this.db.from("pedido").select("id", { count: "exact", head: true }).eq("codigo_retiro", codigo);
    if (error) throw traducirError(error);
    return (count ?? 0) > 0;
  }

  private async buscarUno(columna: "id" | "codigo_retiro", valor: number | string) {
    const fila = exigir(await this.db.from("pedido").select(COLUMNAS_PEDIDO).eq(columna, valor).maybeSingle());
    return fila ? aPedido(fila as unknown as FilaPedido) : null;
  }
}
