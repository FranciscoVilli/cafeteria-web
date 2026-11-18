"use server";
/**
 * Acciones de cuenta: ingresar, registrarse (HU-11) y salir.
 *
 * @module acciones/cuenta
 */
import { redirect } from "next/navigation";
import { ReglaNegocioError } from "@/lib/dominio/errores";
import { crearClienteAdmin, crearClienteServidor } from "@/lib/infraestructura/supabase/clientes";
import { servicios } from "@/lib/servicios";

/** Estado de un formulario de cuenta: error a mostrar y valores escritos para conservarlos. */
export interface EstadoFormulario {
  error?: string;
  valores?: Record<string, string>;
}

const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "");

/** Solo se permite volver a rutas internas (evita redirecciones a otros sitios). */
function destinoSeguro(valor: string, porDefecto: string): string {
  return valor.startsWith("/") && !valor.startsWith("//") ? valor : porDefecto;
}

/**
 * Inicia sesión con correo y contraseña. Lleva al personal a su bandeja y al cliente a la
 * página de la que venía.
 */
export async function ingresar(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const correo = texto(f, "correo").trim().toLowerCase();
  const contrasena = texto(f, "contrasena");
  const siguiente = texto(f, "siguiente");
  if (!correo || !contrasena) {
    return { error: "Escribe tu correo y tu contraseña.", valores: { correo } };
  }
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data.user) {
    return {
      error: error?.status === 429 ? "Demasiados intentos. Espera unos minutos." : "Correo o contraseña incorrectos.",
      valores: { correo },
    };
  }
  const { data: perfil } = await crearClienteAdmin()
    .from("perfil")
    .select("rol, activo")
    .eq("usuario_id", data.user.id)
    .maybeSingle();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está desactivada. Consulta con la cafetería.", valores: { correo } };
  }
  if (perfil.rol === "personal") {
    redirect(siguiente.startsWith("/personal") ? destinoSeguro(siguiente, "/personal") : "/personal");
  }
  redirect(destinoSeguro(siguiente, "/menu"));
}

/** Registra un cliente nuevo (HU-11), inicia su sesión y lo lleva al menú. */
export async function registrarse(_previo: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const valores = {
    nombre: texto(f, "nombre"),
    apellido: texto(f, "apellido"),
    cedula: texto(f, "cedula"),
    celular: texto(f, "celular"),
    correo: texto(f, "correo"),
  };
  const contrasena = texto(f, "contrasena");
  if (contrasena !== texto(f, "confirmacion")) {
    return { error: "Las contraseñas no coinciden.", valores };
  }
  let codigo: string;
  try {
    const cliente = await servicios().clientes.registrarCliente(
      {
        nombre: valores.nombre,
        apellido: valores.apellido,
        cedula: valores.cedula,
        celular: valores.celular,
        correoInstitucional: valores.correo,
      },
      contrasena,
    );
    codigo = cliente.codigo;
  } catch (e) {
    if (e instanceof ReglaNegocioError) {
      return { error: e.message, valores };
    }
    console.error("[registrarse]", e);
    return { error: "No se pudo completar el registro. Intente de nuevo.", valores };
  }
  const supabase = await crearClienteServidor();
  await supabase.auth.signInWithPassword({ email: valores.correo.trim().toLowerCase(), password: contrasena });
  redirect(`${destinoSeguro(texto(f, "siguiente"), "/menu")}${texto(f, "siguiente").includes("?") ? "&" : "?"}bienvenida=${codigo}`);
}

/** Cierra la sesión. */
export async function salir(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
