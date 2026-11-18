/**
 * Resultado de una Server Action: los errores de negocio viajan como mensaje para mostrarse
 * tal cual; los fallos técnicos se registran y se muestran con un mensaje genérico.
 *
 * @module acciones/resultado
 */
import "server-only";
import { unstable_rethrow } from "next/navigation";
import { MENSAJE_PERSISTENCIA, PersistenciaError, ReglaNegocioError } from "@/lib/dominio/errores";

/** Resultado de una acción. */
export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string };

/**
 * Ejecuta una acción y convierte sus errores en un {@link Resultado}. Deja pasar los
 * `redirect()` y `notFound()` de Next.js.
 *
 * @param accion trabajo a ejecutar
 * @returns el resultado
 */
export async function ejecutar<T>(accion: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await accion() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ReglaNegocioError) {
      return { ok: false, error: e.message };
    }
    console.error("[accion]", e);
    if (e instanceof PersistenciaError) {
      return { ok: false, error: MENSAJE_PERSISTENCIA };
    }
    return { ok: false, error: "Ocurrió un error inesperado. Intente de nuevo." };
  }
}
