import type { Metadata } from "next";
import Link from "next/link";
import { CoffeeIcon, PartyPopperIcon } from "lucide-react";
import { BarraPedidoFlotante } from "@/components/carrito/barra-flotante";
import { SelectorProductos } from "@/components/carrito/selector-productos";
import { TarjetaProducto } from "@/components/carrito/tarjeta-producto";
import { CATEGORIAS, NOMBRE_CATEGORIA_PLURAL, type Categoria } from "@/lib/dominio/producto";
import { servicios } from "@/lib/servicios";
import { obtenerSesion } from "@/lib/sesion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Menú" };

/** P-C2 · Menú: selector destacado y catálogo por categoría (HU-01, HU-02). */
export default async function PaginaMenu({ searchParams }: PageProps<"/menu">) {
  const { categoria, bienvenida } = await searchParams;
  const filtro = (CATEGORIAS as readonly string[]).includes(String(categoria)) ? (categoria as Categoria) : null;
  const [productos, sesion] = await Promise.all([servicios().menu.listarMenuCliente(), obtenerSesion()]);
  const secciones = CATEGORIAS.filter((c) => !filtro || c === filtro)
    .map((c) => ({ categoria: c, productos: productos.filter((p) => p.categoria === c) }))
    .filter((s) => s.productos.length > 0);

  return (
    <>
      <section className="dark fondo-espresso overflow-hidden border-b border-white/5 text-foreground">
        {productos.length > 0 ? (
          <SelectorProductos productos={productos} inicial={filtro ?? undefined} />
        ) : (
          <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
            <CoffeeIcon className="size-12 text-caramelo" />
            <h1 className="mt-3 text-4xl font-semibold">No hay productos disponibles por el momento</h1>
            <p className="mt-2 text-foreground/60">Vuelve a intentarlo en unos minutos.</p>
          </div>
        )}
      </section>

      <div id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6">
        {bienvenida && sesion?.cliente && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-exito/30 bg-exito/10 p-4">
            <PartyPopperIcon className="mt-0.5 size-5 shrink-0 text-exito" />
            <p className="text-sm">
              <strong>¡Cuenta creada!</strong> Tu código de cliente es{" "}
              <span className="texto-codigo rounded-md bg-primary/20 px-1.5 py-0.5 font-bold">{sesion.cliente.codigo}</span>.
              Ya puedes armar tu pedido.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xl text-caramelo italic">Nuestra carta</p>
            <h2 className="text-5xl font-semibold">El menú completo</h2>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Filtrar por categoría">
            <Filtro href="/menu#catalogo" activo={!filtro}>
              Todo
            </Filtro>
            {CATEGORIAS.map((c) => (
              <Filtro key={c} href={`/menu?categoria=${c}#catalogo`} activo={filtro === c}>
                {NOMBRE_CATEGORIA_PLURAL[c]}
              </Filtro>
            ))}
          </nav>
        </div>

        {secciones.map((s) => (
          <section key={s.categoria} className="mt-12" aria-labelledby={`seccion-${s.categoria}`}>
            <div className="mb-5 flex items-center gap-4">
              <h3 id={`seccion-${s.categoria}`} className="font-display text-3xl font-semibold">
                {NOMBRE_CATEGORIA_PLURAL[s.categoria]}
              </h3>
              <span className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">{s.productos.length}</span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {s.productos.map((p) => (
                <TarjetaProducto key={p.codigo} producto={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <BarraPedidoFlotante />
    </>
  );
}

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        activo ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60 hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}
