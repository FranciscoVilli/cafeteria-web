import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PhoneIcon } from "lucide-react";
import { AccionesPedido } from "@/components/personal/acciones-pedido";
import { FotoProducto } from "@/components/foto-producto";
import { InsigniaEstado, LineaAvance } from "@/components/pedido/estado";
import { nombreCompleto } from "@/lib/dominio/cliente";
import { EntidadNoEncontradaError } from "@/lib/dominio/errores";
import { calcularTotal, subtotal } from "@/lib/dominio/pedido";
import { dolares, fechaYHora, haceCuanto } from "@/lib/formato";
import { servicios } from "@/lib/servicios";

export const metadata: Metadata = { title: "Detalle del pedido" };

/** P-P3 · Detalle del pedido con las acciones de avanzar y entregar (HU-08, HU-09, HU-10). */
export default async function DetallePedido({ params }: PageProps<"/personal/pedidos/[id]">) {
  const { id } = await params;
  const pedido = await servicios()
    .pedidos.buscarPedido(Number(id))
    .catch((e) => {
      if (e instanceof EntidadNoEncontradaError) notFound();
      throw e;
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/personal" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline dark:text-primary">
        <ArrowLeftIcon className="size-4" /> Volver a la bandeja
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <section className="tarjeta-elevada rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Pedido</p>
                <p className="texto-codigo text-3xl font-extrabold">{pedido.codigoRetiro}</p>
              </div>
              <InsigniaEstado estado={pedido.estado} className="px-3 py-1.5 text-sm" />
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Cliente</dt>
                <dd className="font-semibold">{nombreCompleto(pedido.cliente)}</dd>
                <dd className="flex items-center gap-1 text-muted-foreground">
                  {pedido.cliente.codigo} · <PhoneIcon className="size-3" /> {pedido.cliente.celular}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registrado</dt>
                <dd className="font-semibold">{fechaYHora(pedido.fechaRegistro)}</dd>
                <dd className="text-muted-foreground">{haceCuanto(pedido.fechaRegistro)}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <LineaAvance estado={pedido.estado} />
            </div>
          </section>

          <section className="tarjeta-elevada overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  <th className="px-5 py-3 text-left font-semibold">Producto</th>
                  <th className="px-3 py-3 text-center font-semibold">Cant.</th>
                  <th className="px-3 py-3 text-right font-semibold">P. unit.</th>
                  <th className="px-5 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedido.detalles.map((d) => (
                  <tr key={d.producto.codigo} className="border-b">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                          <FotoProducto producto={d.producto} sizes="40px" />
                        </span>
                        <span className="font-medium">{d.producto.nombre}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-base font-bold">{d.cantidad}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{dolares(d.precioUnitarioCentavos)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{dolares(subtotal(d))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3} className="px-3 py-4 text-right">
                    Total a cobrar
                  </th>
                  <td className="px-5 py-4 text-right text-xl font-extrabold tabular-nums">{dolares(calcularTotal(pedido))}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>

        <AccionesPedido id={pedido.id!} estado={pedido.estado} />
      </div>
    </div>
  );
}
