"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { agregarAlCarrito } from "@/lib/acciones/pedidos";
import type { Producto } from "@/lib/dominio/producto";
import { useCarrito } from "./proveedor-carrito";

/**
 * Lógica de «Agregar al pedido» (HU-02): la cantidad escrita se valida en el servidor y su
 * mensaje se muestra tal cual.
 */
export function useAgregar(producto: Pick<Producto, "codigo" | "nombre">) {
  const { carrito, reemplazar } = useCarrito();
  const [cantidad, setCantidad] = useState("1");
  const [pendiente, iniciar] = useTransition();

  const agregar = () =>
    iniciar(async () => {
      const r = await agregarAlCarrito(carrito, producto.codigo, cantidad);
      if (r.ok) {
        reemplazar(r.datos);
        setCantidad("1");
        toast.success(`${producto.nombre} se agregó a tu pedido`, { duration: 2000 });
      } else {
        toast.error(r.error);
      }
    });

  return { cantidad, setCantidad, agregar, pendiente };
}
