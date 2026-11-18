"use client";
import Link from "next/link";
import { ArrowRightIcon, ShoppingBagIcon } from "lucide-react";
import { useCarrito } from "./proveedor-carrito";

/** Acceso flotante a «Mi pedido» cuando hay productos en el carrito. */
export function BarraPedidoFlotante() {
  const { unidades, listo } = useCarrito();
  if (!listo || unidades === 0) return null;
  return (
    <Link
      href="/carrito"
      className="fixed bottom-5 left-1/2 z-30 flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between rounded-full border border-caramelo/30 bg-cafe/95 px-6 py-3.5 font-semibold text-cafe-foreground shadow-2xl shadow-black/40 backdrop-blur animate-in fade-in slide-in-from-bottom-3"
    >
      <span className="inline-flex items-center gap-2">
        <ShoppingBagIcon className="size-5 text-caramelo" />
        {unidades} {unidades === 1 ? "producto" : "productos"} en tu pedido
      </span>
      <span className="inline-flex items-center gap-1 text-caramelo">
        Ver pedido <ArrowRightIcon className="size-4" />
      </span>
    </Link>
  );
}
