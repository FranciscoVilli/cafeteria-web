"use client";
import { Loader2Icon, ShoppingBagIcon } from "lucide-react";
import { FotoProducto } from "@/components/foto-producto";
import { cantidadDe } from "@/lib/dominio/carrito";
import { NOMBRE_CATEGORIA, type Producto } from "@/lib/dominio/producto";
import { dolares } from "@/lib/formato";
import { SelectorCantidad } from "./selector-cantidad";
import { useCarrito } from "./proveedor-carrito";
import { useAgregar } from "./use-agregar";

/** Tarjeta del catálogo: foto, nombre, descripción, precio y «Agregar» (HU-01, HU-02). */
export function TarjetaProducto({ producto }: { producto: Producto }) {
  const { carrito } = useCarrito();
  const { cantidad, setCantidad, agregar, pendiente } = useAgregar(producto);
  const enPedido = cantidadDe(carrito, producto.codigo);

  return (
    <article className="tarjeta-elevada group flex flex-col overflow-hidden rounded-3xl border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 transition duration-700 group-hover:scale-105">
          <FotoProducto producto={producto} sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 95vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-white uppercase backdrop-blur">
          {NOMBRE_CATEGORIA[producto.categoria]}
        </span>
        {enPedido > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-exito px-2.5 py-0.5 text-xs font-semibold text-exito-foreground">
            {enPedido} en tu pedido
          </span>
        )}
        <span className="font-display absolute right-4 bottom-2 text-3xl font-semibold text-white drop-shadow">
          {dolares(producto.precioCentavos)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl leading-tight font-semibold">{producto.nombre}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{producto.descripcion || producto.codigo}</p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <SelectorCantidad valor={cantidad} onCambio={setCantidad} deshabilitado={pendiente} etiqueta={`Cantidad de ${producto.nombre}`} />
          <button
            onClick={agregar}
            disabled={pendiente}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {pendiente ? <Loader2Icon className="size-4 animate-spin" /> : <ShoppingBagIcon className="size-4" />}
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
