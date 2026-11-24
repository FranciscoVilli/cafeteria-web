/**
 * Productos del menú (bebidas, alimentos y postres). Los productos no se eliminan: se marcan
 * como no disponibles para conservar el historial de los pedidos (SUP-08).
 *
 * @module dominio/producto
 */
import type { Centavos } from "./dinero";
import { DatoInvalidoError } from "./errores";

/** Categorías de producto (SUP-13, ampliada con POSTRE). */
export const CATEGORIAS = ["BEBIDA", "ALIMENTO", "POSTRE"] as const;

/** Categoría de un producto. */
export type Categoria = (typeof CATEGORIAS)[number];

/** Nombre legible de cada categoría. */
export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  BEBIDA: "Bebida",
  ALIMENTO: "Alimento",
  POSTRE: "Postre",
};

/** Nombre en plural, para secciones y filtros. */
export const NOMBRE_CATEGORIA_PLURAL: Record<Categoria, string> = {
  BEBIDA: "Bebidas",
  ALIMENTO: "Alimentos",
  POSTRE: "Postres",
};

/** Longitud máxima de la descripción. */
export const MAX_DESCRIPCION = 200;

/** Artículo del menú. */
export interface Producto {
  /** Código único en mayúsculas, por ejemplo «BEB-001». */
  readonly codigo: string;
  readonly nombre: string;
  readonly categoria: Categoria;
  /** Precio vigente en centavos; mayor que cero. */
  readonly precioCentavos: Centavos;
  /** Si puede incluirse en nuevos pedidos (RN-NEG-02). */
  readonly disponible: boolean;
  /** Descripción corta para el menú; puede estar vacía. */
  readonly descripcion: string;
  /** Dirección de la foto (URL o ruta del sitio), o `null` si no tiene. */
  readonly imagenUrl: string | null;
}

/** Datos para crear un producto, tal como llegan del formulario. */
export interface DatosProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  precioCentavos: Centavos;
  disponible: boolean;
  descripcion?: string;
  imagenUrl?: string | null;
}

/** Datos opcionales al actualizar: si se omiten, se conservan los actuales. */
export interface ExtrasProducto {
  descripcion?: string;
  imagenUrl?: string | null;
}

const FORMATO_CODIGO = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const FORMATO_IMAGEN = /^(https?:\/\/\S+|\/[A-Za-z0-9/_.-]+)$/;

/**
 * Normaliza un código: sin espacios laterales y en mayúsculas.
 *
 * @param codigo código escrito por el usuario
 * @returns el código normalizado
 */
export function normalizarCodigo(codigo: string | null | undefined): string {
  return (codigo ?? "").trim().toUpperCase();
}

/**
 * Convierte un texto en categoría, sin distinguir mayúsculas.
 *
 * @param texto «BEBIDA», «ALIMENTO» o «POSTRE»
 * @returns la categoría
 * @throws Lanza {@link DatoInvalidoError} si el texto no es una categoría válida
 */
export function aCategoria(texto: string | null | undefined): Categoria {
  const valor = (texto ?? "").trim().toUpperCase();
  if (!valor) {
    throw new DatoInvalidoError("La categoría es obligatoria.");
  }
  if (!(CATEGORIAS as readonly string[]).includes(valor)) {
    throw new DatoInvalidoError("La categoría debe ser BEBIDA, ALIMENTO o POSTRE.");
  }
  return valor as Categoria;
}

/**
 * Crea un producto validando sus datos (HU-06).
 *
 * @param datos datos del formulario
 * @returns el producto normalizado
 * @throws Lanza {@link DatoInvalidoError} si algún dato está vacío o es inválido
 */
export function crearProducto(datos: DatosProducto): Producto {
  const codigo = normalizarCodigo(datos.codigo);
  if (!codigo) {
    throw new DatoInvalidoError("El código es obligatorio.");
  }
  if (!FORMATO_CODIGO.test(codigo)) {
    throw new DatoInvalidoError("El código solo puede tener letras, números y guiones, por ejemplo BEB-003.");
  }
  return {
    codigo,
    ...validarDatos(datos.nombre, datos.categoria, datos.precioCentavos),
    disponible: datos.disponible,
    descripcion: validarDescripcion(datos.descripcion),
    imagenUrl: validarImagen(datos.imagenUrl),
  };
}

/**
 * Cambia nombre, categoría, precio y, si se indican, descripción y foto. Los pedidos ya
 * confirmados no se ven afectados porque guardan su propio precio (RN-NEG-04).
 *
 * @param producto producto actual
 * @param nombre nuevo nombre
 * @param categoria nueva categoría
 * @param precioCentavos nuevo precio
 * @param extras descripción y foto nuevas (opcional)
 * @returns el producto actualizado
 * @throws Lanza {@link DatoInvalidoError} si algún dato es inválido
 */
export function actualizarProducto(
  producto: Producto,
  nombre: string,
  categoria: string,
  precioCentavos: Centavos,
  extras: ExtrasProducto = {},
): Producto {
  return {
    ...producto,
    ...validarDatos(nombre, categoria, precioCentavos),
    descripcion: extras.descripcion === undefined ? producto.descripcion : validarDescripcion(extras.descripcion),
    imagenUrl: extras.imagenUrl === undefined ? producto.imagenUrl : validarImagen(extras.imagenUrl),
  };
}

/**
 * Habilita o deshabilita un producto para nuevos pedidos.
 *
 * @param producto producto actual
 * @param disponible nuevo valor
 * @returns el producto con la disponibilidad cambiada
 */
export function cambiarDisponibilidad(producto: Producto, disponible: boolean): Producto {
  return { ...producto, disponible };
}

function validarDatos(nombre: string, categoria: string, precioCentavos: Centavos) {
  const n = (nombre ?? "").trim();
  if (!n) {
    throw new DatoInvalidoError("El nombre es obligatorio.");
  }
  if (n.length > 80) {
    throw new DatoInvalidoError("El nombre no puede tener más de 80 caracteres.");
  }
  const c = aCategoria(categoria);
  if (!Number.isInteger(precioCentavos) || precioCentavos <= 0) {
    throw new DatoInvalidoError("El precio debe ser mayor que cero.");
  }
  return { nombre: n, categoria: c, precioCentavos };
}

function validarDescripcion(descripcion: string | undefined): string {
  const d = (descripcion ?? "").trim().replace(/\s+/g, " ");
  if (d.length > MAX_DESCRIPCION) {
    throw new DatoInvalidoError(`La descripción no puede tener más de ${MAX_DESCRIPCION} caracteres.`);
  }
  return d;
}

function validarImagen(imagenUrl: string | null | undefined): string | null {
  const url = (imagenUrl ?? "").trim();
  if (!url) {
    return null;
  }
  if (url.length > 500 || !FORMATO_IMAGEN.test(url)) {
    throw new DatoInvalidoError("La dirección de la foto no es válida.");
  }
  return url;
}
