import type { Metadata } from "next";
import { VistaCarrito } from "@/components/carrito/vista-carrito";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mi pedido" };

/** P-C3 · Mi pedido: líneas, subtotales, total y confirmación (HU-02, HU-03, HU-04). */
export default async function PaginaCarrito() {
  const sesion = await obtenerSesion();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <VistaCarrito esCliente={!!sesion?.cliente} haySesion={!!sesion} />
    </div>
  );
}
