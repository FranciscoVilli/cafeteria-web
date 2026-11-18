import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Interceptor global (en Next.js 16 reemplaza a middleware.ts):
 * 1. Limita los intentos de ingreso y registro por IP (mejor esfuerzo, en memoria).
 * 2. Renueva las cookies de sesión de Supabase.
 * 3. Envía a /ingresar a quien entra a /personal sin sesión.
 *
 * No reemplaza la verificación de cada Server Action: solo es una primera barrera.
 */

// Límite en memoria por instancia: no es global ni sobrevive reinicios. Suficiente para
// frenar abusos simples; Supabase Auth aplica además sus propios límites de ingreso.
const intentos = new Map<string, { cantidad: number; reinicio: number }>();
const LIMITE = 10;
const VENTANA_MS = 60_000;

function excedeLimite(ip: string): boolean {
  const ahora = Date.now();
  const registro = intentos.get(ip);
  if (!registro || ahora > registro.reinicio) {
    intentos.set(ip, { cantidad: 1, reinicio: ahora + VENTANA_MS });
    if (intentos.size > 5000) intentos.clear();
    return false;
  }
  registro.cantidad++;
  return registro.cantidad > LIMITE;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "POST" && (pathname === "/ingresar" || pathname === "/registro")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "local";
    if (excedeLimite(ip)) {
      return new NextResponse("Demasiados intentos. Espera un minuto.", { status: 429 });
    }
  }

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aEscribir) {
        aEscribir.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        aEscribir.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/personal") && !user) {
    const url = new URL("/ingresar", request.url);
    url.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
