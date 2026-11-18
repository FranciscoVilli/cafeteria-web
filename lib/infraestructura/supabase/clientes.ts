/**
 * Clientes de Supabase. Hay dos, y no son intercambiables:
 *
 * - {@link crearClienteServidor}: usa las cookies de la petición y la clave pública. Solo
 *   sirve para leer y modificar la **sesión** del usuario (login, logout, usuario actual).
 * - {@link crearClienteAdmin}: usa la clave de servicio y **se salta RLS**. Lo usan los
 *   repositorios después de que cada Server Action verificó la sesión y el rol.
 *
 * @module infraestructura/supabase/clientes
 */
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revise .env.local (ver .env.example).`);
  }
  return valor;
}

/** Cliente con la sesión del usuario (cookies). */
export async function crearClienteServidor(): Promise<SupabaseClient> {
  const almacen = await cookies();
  return createServerClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(aEscribir) {
        try {
          aEscribir.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: las cookies las renueva proxy.ts.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/** Cliente con la clave de servicio. Nunca debe llegar al navegador. */
export function crearClienteAdmin(): SupabaseClient {
  admin ??= createClient(variable("NEXT_PUBLIC_SUPABASE_URL"), variable("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return admin;
}
