import Link from "next/link";
import { BotonCarrito } from "@/components/carrito/boton-carrito";
import { BotonTema } from "@/components/boton-tema";
import { Marca } from "@/components/marca";
import { MenuUsuario } from "@/components/menu-usuario";
import { NavEnlace } from "@/components/nav-enlace";
import type { Sesion } from "@/lib/sesion";
import { cn } from "@/lib/utils";

/**
 * Barra superior del sitio. Con `transparente` se superpone a la portada (sin fondo propio).
 */
export function Encabezado({ sesion, transparente = false }: { sesion: Sesion | null; transparente?: boolean }) {
  return (
    <header
      className={cn(
        "z-40 w-full text-cafe-foreground",
        transparente ? "absolute top-0" : "sticky top-0 border-b border-white/8 bg-cafe/90 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Marca />
        <nav className="ml-8 hidden items-center gap-1 lg:flex" aria-label="Principal">
          <NavEnlace href="/" exacto>
            Inicio
          </NavEnlace>
          <NavEnlace href="/menu">Menú</NavEnlace>
          <NavEnlace href="/seguimiento">Seguimiento</NavEnlace>
          {sesion?.rol === "personal" && <NavEnlace href="/personal">Panel del personal</NavEnlace>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <BotonCarrito />
          </div>
          <div className="sm:hidden">
            <BotonCarrito compacto />
          </div>
          {sesion ? (
            <MenuUsuario
              nombre={sesion.nombre}
              rol={sesion.rol}
              detalle={sesion.cliente ? `Cliente ${sesion.cliente.codigo}` : "Personal de la cafetería"}
            />
          ) : (
            <>
              <Link
                href="/ingresar"
                className="hidden h-9 items-center rounded-full border border-caramelo/60 px-4 text-sm font-medium text-caramelo transition hover:bg-caramelo/10 sm:inline-flex"
              >
                Ingresar
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-9 items-center rounded-full bg-caramelo px-3 text-sm font-semibold whitespace-nowrap text-cafe transition hover:brightness-110 sm:px-4"
              >
                Crear cuenta
              </Link>
            </>
          )}
          <BotonTema className="text-cafe-foreground/80 hover:bg-white/10 hover:text-cafe-foreground" />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Principal móvil">
        <NavEnlace href="/" exacto>
          Inicio
        </NavEnlace>
        <NavEnlace href="/menu">Menú</NavEnlace>
        <NavEnlace href="/seguimiento">Seguimiento</NavEnlace>
        {sesion?.rol === "personal" && <NavEnlace href="/personal">Panel</NavEnlace>}
        {!sesion && (
          <NavEnlace href="/ingresar">Ingresar</NavEnlace>
        )}
      </nav>
    </header>
  );
}
