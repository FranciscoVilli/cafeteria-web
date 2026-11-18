"use server";
/**
 * Acciones de gestión del menú (HU-06, HU-07). Solo personal.
 *
 * @module acciones/menu
 */
import { revalidatePath } from "next/cache";
import { aCentavos } from "@/lib/dominio/dinero";
import { DatoInvalidoError } from "@/lib/dominio/errores";
import { subirFoto } from "@/lib/infraestructura/supabase/fotos";
import { servicios } from "@/lib/servicios";
import { exigirPersonal } from "@/lib/sesion";
import { ejecutar, type Resultado } from "./resultado";

/** Datos del formulario de producto. */
export interface FormularioProducto {
  codigo: string;
  nombre: string;
  categoria: string;
  precio: string;
  disponible: boolean;
  descripcion: string;
  imagenUrl: string | null;
}

function revalidarMenu() {
  revalidatePath("/menu");
  revalidatePath("/");
  revalidatePath("/personal/menu");
}

/** Registra un producto nuevo (HU-06). */
export async function registrarProducto(datos: FormularioProducto): Promise<Resultado<{ nombre: string }>> {
  return ejecutar(async () => {
    await exigirPersonal();
    const p = await servicios().menu.registrarProducto({
      codigo: datos.codigo,
      nombre: datos.nombre,
      categoria: datos.categoria,
      precioCentavos: aCentavos(datos.precio),
      disponible: datos.disponible,
      descripcion: datos.descripcion,
      imagenUrl: datos.imagenUrl,
    });
    revalidarMenu();
    return { nombre: p.nombre };
  });
}

/** Actualiza nombre, categoría, precio, descripción, foto y disponibilidad (HU-07). */
export async function actualizarProducto(datos: FormularioProducto): Promise<Resultado<{ nombre: string }>> {
  return ejecutar(async () => {
    await exigirPersonal();
    const menu = servicios().menu;
    await menu.actualizarProducto(datos.codigo, datos.nombre, datos.categoria, aCentavos(datos.precio), {
      descripcion: datos.descripcion,
      imagenUrl: datos.imagenUrl,
    });
    const p = await menu.cambiarDisponibilidad(datos.codigo, datos.disponible);
    revalidarMenu();
    return { nombre: p.nombre };
  });
}

/** Habilita o deshabilita un producto con un clic (HU-07). */
export async function cambiarDisponibilidad(codigo: string, disponible: boolean): Promise<Resultado<{ nombre: string; disponible: boolean }>> {
  return ejecutar(async () => {
    await exigirPersonal();
    const p = await servicios().menu.cambiarDisponibilidad(codigo, disponible);
    revalidarMenu();
    return { nombre: p.nombre, disponible: p.disponible };
  });
}

/**
 * Sube la foto de un producto y devuelve su dirección. La foto queda asociada al producto
 * recién cuando se guarda el formulario.
 */
export async function subirFotoProducto(formulario: FormData): Promise<Resultado<{ url: string }>> {
  return ejecutar(async () => {
    await exigirPersonal();
    const archivo = formulario.get("foto");
    if (!(archivo instanceof File)) {
      throw new DatoInvalidoError("Seleccione una foto.");
    }
    return { url: await subirFoto(archivo) };
  });
}
