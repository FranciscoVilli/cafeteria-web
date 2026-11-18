"use client";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCarrito } from "./proveedor-carrito";

/** Acceso a «Mi pedido» con el número de unidades. */
export function BotonCarrito({ compacto = false }: { compacto?: boolean }) {
  const { unidades, listo } = useCarrito();
  return (
    <Link
      href="/carrito"
      aria-label={`Mi pedido: ${unidades} unidades`}
      className={cn(
        "relative inline-flex h-9 items-center gap-2 rounded-full border border-white/15 text-sm font-medium transition hover:border-caramelo/60 hover:text-caramelo",
        compacto ? "w-9 justify-center" : "px-3.5",
      )}
    >
      <ShoppingBagIcon className="size-4" />
      {!compacto && <span>Mi pedido</span>}
      {listo && unidades > 0 && (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full bg-caramelo px-1.5 text-[11px] leading-5 font-bold text-cafe",
            compacto && "absolute -top-1.5 -right-1.5",
          )}
        >
          {unidades}
        </span>
      )}
    </Link>
  );
}
