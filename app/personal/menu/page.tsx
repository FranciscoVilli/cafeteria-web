import type { Metadata } from "next";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { FotoProducto } from "@/components/foto-producto";
import { FormularioProducto } from "@/components/personal/formulario-producto";
import { InterruptorDisponibilidad } from "@/components/personal/interruptor-disponibilidad";
import { buttonVariants } from "@/components/ui/button";
import { aTexto } from "@/lib/dominio/dinero";
import { NOMBRE_CATEGORIA } from "@/lib/dominio/producto";
import { dolares } from "@/lib/formato";
import { servicios } from "@/lib/servicios";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Gestión del menú" };

/** P-P1 · Gestión del menú: todos los productos, alta, edición y disponibilidad (HU-06, HU-07). */
export default async function GestionMenu({ searchParams }: PageProps<"/personal/menu">) {
  const { editar } = await searchParams;
  const productos = await servicios().menu.listarTodosLosProductos();
  const enEdicion = typeof editar === "string" ? productos.find((p) => p.codigo === editar.toUpperCase()) : undefined;
  const disponibles = productos.filter((p) => p.disponible).length;

  return (
    <div className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Gestión del menú</h1>
          <p className="text-sm text-muted-foreground">
            {disponibles} de {productos.length} productos disponibles para los clientes.
          </p>
        </div>
        {enEdicion && (
          <Link href="/personal/menu" className={cn(buttonVariants(), "rounded-full")}>
            <PlusIcon /> Nuevo producto
          </Link>
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
        <section className="tarjeta-elevada overflow-hidden rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Producto</th>
                  <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                  <th className="px-4 py-3 text-right font-semibold">Precio</th>
                  <th className="px-4 py-3 text-center font-semibold">Disponible</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.codigo} className={cn("border-b last:border-0", enEdicion?.codigo === p.codigo && "bg-accent/60")}>
                    <td className={cn("px-4 py-3", !p.disponible && "opacity-55")}>
                      <span className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                          <FotoProducto producto={p} sizes="48px" />
                        </span>
                        <span>
                          <span className="block font-semibold">{p.nombre}</span>
                          <span className="text-xs text-muted-foreground">{p.codigo}</span>
                        </span>
                      </span>
                    </td>
                    <td className={cn("px-4 py-3", !p.disponible && "opacity-55")}>{NOMBRE_CATEGORIA[p.categoria]}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", !p.disponible && "opacity-55")}>
                      {dolares(p.precioCentavos)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <InterruptorDisponibilidad codigo={p.codigo} nombre={p.nombre} disponible={p.disponible} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/personal/menu?editar=${p.codigo}`}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        <PencilIcon className="size-3.5" /> Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <FormularioProducto
          key={enEdicion?.codigo ?? "nuevo"}
          inicial={
            enEdicion
              ? {
                  codigo: enEdicion.codigo,
                  nombre: enEdicion.nombre,
                  categoria: enEdicion.categoria,
                  precio: aTexto(enEdicion.precioCentavos),
                  disponible: enEdicion.disponible,
                  descripcion: enEdicion.descripcion,
                  imagenUrl: enEdicion.imagenUrl,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
