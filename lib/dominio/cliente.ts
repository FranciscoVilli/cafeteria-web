/**
 * Clientes: estudiantes o docentes que registran pedidos (HU-11). El código «CLI-001» lo
 * asigna el sistema al registrarse (SUP-01).
 *
 * @module dominio/cliente
 */
import { DatoInvalidoError } from "./errores";

/** Cliente registrado. */
export interface Cliente {
  /** Código asignado por el sistema, por ejemplo «CLI-001». */
  readonly codigo: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly cedula: string;
  readonly celular: string;
  readonly correoInstitucional: string;
}

/** Datos de un cliente todavía sin código. */
export type DatosCliente = Omit<Cliente, "codigo">;

/**
 * Formato básico de correo: `usuario@dominio.ext`, sin espacios y con una sola arroba.
 * Se valida sin expresión regular para evitar el retroceso excesivo (ReDoS) que señaló el
 * análisis estático (SonarQube, regla S5852).
 */
function esCorreo(correo: string): boolean {
  if (/\s/.test(correo)) return false;
  const arroba = correo.indexOf("@");
  if (arroba < 1 || arroba !== correo.lastIndexOf("@")) return false;
  // El dominio debe tener un punto con texto antes y después.
  return correo.slice(arroba + 1).slice(1, -1).includes(".");
}

/**
 * Valida y normaliza los datos de un cliente nuevo (SUP-12).
 *
 * @param datos datos del formulario
 * @returns los datos normalizados
 * @throws Lanza {@link DatoInvalidoError} con el mensaje del primer campo inválido
 */
export function validarCliente(datos: DatosCliente): DatosCliente {
  const nombre = obligatorio(datos.nombre, "El nombre es obligatorio.");
  const apellido = obligatorio(datos.apellido, "El apellido es obligatorio.");
  const cedula = digitos(datos.cedula, "La cédula debe tener 10 dígitos.");
  const celular = digitos(datos.celular, "El celular debe tener 10 dígitos.");
  const correoInstitucional = (datos.correoInstitucional ?? "").trim().toLowerCase();
  if (!esCorreo(correoInstitucional)) {
    throw new DatoInvalidoError("El correo electrónico no tiene un formato válido.");
  }
  return { nombre, apellido, cedula, celular, correoInstitucional };
}

/**
 * Valida la contraseña de la cuenta del cliente (SUP-15).
 *
 * @param contrasena contraseña escrita
 * @throws Lanza {@link DatoInvalidoError} si tiene menos de 8 caracteres
 */
export function validarContrasena(contrasena: string): void {
  if ((contrasena ?? "").length < 8) {
    throw new DatoInvalidoError("La contraseña debe tener al menos 8 caracteres.");
  }
}

/**
 * Devuelve nombre y apellido.
 *
 * @param c cliente
 * @returns por ejemplo «Ana Pérez»
 */
export function nombreCompleto(c: Pick<Cliente, "nombre" | "apellido">): string {
  return `${c.nombre} ${c.apellido}`;
}

function obligatorio(valor: string, mensaje: string): string {
  const v = (valor ?? "").trim();
  if (!v) {
    throw new DatoInvalidoError(mensaje);
  }
  if (v.length > 60) {
    throw new DatoInvalidoError(mensaje.replace("es obligatorio", "no puede tener más de 60 caracteres"));
  }
  return v;
}

function digitos(valor: string, mensaje: string): string {
  const v = (valor ?? "").trim();
  if (!/^\d{10}$/.test(v)) {
    throw new DatoInvalidoError(mensaje);
  }
  return v;
}
