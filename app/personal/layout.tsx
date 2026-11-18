import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlertIcon } from "lucide-react";
import { BotonTema } from "@/components/boton-tema";
import { Marca } from "@/components/marca";
import { MenuUsuario } from "@/components/menu-usuario";
import { NavEnlace } from "@/components/nav-enlace";
import { buttonVariants } from "@/components/ui/button";
import { obtenerSesion } from "@/lib/sesion";
import { cn } from "@/lib/utils";

/** Área del personal: exige sesión con rol «personal» (SUP-15). */
export default async function LayoutPersonal({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/ingresar?siguiente=/personal");
  }
  if (sesion.rol !== "personal") {
    return (
      <main className="grid flex-1 place-items-center px-4 text-center">
        <div>
          <ShieldAlertIcon className="mx-auto size-12 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Esta sección es solo para el personal de la cafetería.</h1>
          <Link href="/menu" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full px-6")}>
            Ir al menú
          </Link>
        </div>
      </main>
    );
  }
  return (
    <>
      <header className="sticky top-0 z-40 bg-cafe text-cafe-foreground shadow-[0_6px_20px_-12px_rgb(0_0_0/0.6)]">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Marca href="/personal" subtitulo="Mostrador" />
          <nav className="ml-4 hidden gap-1 sm:flex" aria-label="Personal">
            <NavEnlace href="/personal">Pedidos</NavEnlace>
            <NavEnlace href="/personal/menu">Gestión del menú</NavEnlace>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <MenuUsuario nombre={sesion.nombre} rol="personal" detalle={sesion.correo} />
            <BotonTema className="text-cafe-foreground hover:bg-white/10 hover:text-cafe-foreground" />
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-2 sm:hidden" aria-label="Personal móvil">
          <NavEnlace href="/personal">Pedidos</NavEnlace>
          <NavEnlace href="/personal/menu">Menú</NavEnlace>
        </nav>
      </header>
      <main className="flex-1 bg-muted/40">{children}</main>
    </>
  );
}
