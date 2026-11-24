/**
 * Sesión del usuario actual y control de acceso por rol (SUP-15). Cada Server Action debe
 * llamar a {@link exigirCliente} o {@link exigirPersonal}: el proxy no basta, porque las
 * Server Actions se pueden invocar con un POST directo.
 *
 * @module sesion
 */
import "server-only";
import { cache } from "react";
import type { Cliente } from "@/lib/dominio/cliente";
import { NoAutorizadoError } from "@/lib/dominio/errores";
import { crearClienteAdmin, crearClienteServidor } from "@/lib/infraestructura/supabase/clientes";
import { servicios } from "@/lib/servicios";

/** Rol de una cuenta. */
export type Rol = "cliente" | "personal";

/** Usuario con sesión iniciada. */
export interface Sesion {
  usuarioId: string;
  correo: string;
  rol: Rol;
  nombre: string;
  /** Datos del cliente si el rol es «cliente». */
  cliente: Cliente | null;
}

/**
 * Devuelve la sesión actual, o `null` si no hay usuario o su perfil está inactivo. Se
 * calcula una sola vez por petición.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data: perfil } = await crearClienteAdmin()
    .from("perfil")
    .select("rol, nombre, activo")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!perfil?.activo || (perfil.rol !== "cliente" && perfil.rol !== "personal")) {
    return null;
  }
  const cliente = perfil.rol === "cliente" ? await servicios().clientes.buscarPorUsuario(user.id) : null;
  return { usuarioId: user.id, correo: user.email ?? "", rol: perfil.rol, nombre: perfil.nombre, cliente };
});

/**
 * Exige una sesión de cliente.
 *
 * @returns el cliente identificado
 * @throws Lanza {@link NoAutorizadoError} si no hay sesión de cliente
 */
export async function exigirCliente(): Promise<Cliente> {
  const sesion = await obtenerSesion();
  if (!sesion?.cliente) {
    throw new NoAutorizadoError("Inicia sesión como cliente para continuar.");
  }
  return sesion.cliente;
}

/**
 * Exige una sesión del personal de la cafetería.
 *
 * @returns la sesión
 * @throws Lanza {@link NoAutorizadoError} si no hay sesión del personal
 */
export async function exigirPersonal(): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (sesion?.rol !== "personal") {
    throw new NoAutorizadoError("Esta acción es solo para el personal de la cafetería.");
  }
  return sesion;
}
