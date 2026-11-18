import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ClockIcon, LayoutGridIcon, ReceiptTextIcon, RefreshCwIcon } from "lucide-react";
import { AutoRefresco } from "@/components/auto-refresco";
import { BotonCopiar } from "@/components/pedido/boton-copiar";
import { InsigniaEstado, LineaAvance } from "@/components/pedido/estado";
import { buttonVariants } from "@/components/ui/button";
import { EntidadNoEncontradaError } from "@/lib/dominio/errores";
import type { EstadoPedido } from "@/lib/dominio/estado-pedido";
import { calcularTotal, subtotal } from "@/lib/dominio/pedido";
import { dolares, fechaYHora } from "@/lib/formato";
import { servicios } from "@/lib/servicios";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi pedido" };

const MENSAJE: Record<EstadoPedido, string> = {
  PENDIENTE: "Recibimos tu pedido. Pronto empezaremos a prepararlo.",
  EN_PREPARACION: "Estamos preparando tu pedido.",
  LISTO_PARA_RETIRAR: "¡Tu pedido está listo! Acércate al mostrador con tu código.",
  ENTREGADO: "Pedido entregado. ¡Buen provecho!",
};

/**
 * P-C4 / P-C5 · Resumen con código de retiro y estado del pedido (HU-04, HU-05). Se accede
 * con el código; no muestra datos personales del cliente.
 */
export default async function PaginaPedido({ params, searchParams }: PageProps<"/pedido/[codigo]">) {
  const [{ codigo }, { nuevo }] = await Promise.all([params, searchParams]);
  const pedido = await servicios()
    .pedidos.consultarPorCodigoRetiro(decodeURIComponent(codigo))
    .catch((e) => {
      if (e instanceof EntidadNoEncontradaError) notFound();
      throw e;
    });
  const terminado = pedido.estado === "ENTREGADO";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {!terminado && <AutoRefresco segundos={15} />}
      {nuevo && (
        <div className="mb-6 text-center animate-in fade-in slide-in-from-bottom-2">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-exito text-exito-foreground ring-8 ring-exito/15">
            <CheckIcon className="size-8" strokeWidth={3} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">¡Pedido confirmado!</h1>
          <p className="text-muted-foreground">Presenta este código en el mostrador para retirarlo.</p>
        </div>
      )}

      <section className="tarjeta-elevada overflow-hidden rounded-3xl border bg-card">
        <div className="bg-[radial-gradient(500px_200px_at_50%_0%,var(--accent),transparent_70%)] px-6 py-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Código de retiro</p>
          <p className="texto-codigo mt-2 pl-[0.2em] text-5xl font-extrabold sm:text-6xl">{pedido.codigoRetiro}</p>
          <BotonCopiar texto={pedido.codigoRetiro} />
          <div className="mt-5 flex flex-col items-center gap-2">
            <InsigniaEstado estado={pedido.estado} className="px-3 py-1.5 text-sm" />
            <p className="font-medium">{MENSAJE[pedido.estado]}</p>
          </div>
        </div>
        <div className="border-t px-4 py-6 sm:px-8">
          <LineaAvance estado={pedido.estado} />
        </div>
      </section>

      <section className="tarjeta-elevada mt-5 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Detalle</h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5" /> {fechaYHora(pedido.fechaRegistro)}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Producto</th>
              <th className="py-2 text-center font-medium">Cant.</th>
              <th className="py-2 text-right font-medium">P. unit.</th>
              <th className="py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.detalles.map((d) => (
              <tr key={d.producto.codigo} className="border-b last:border-0">
                <td className="py-2.5">{d.producto.nombre}</td>
                <td className="py-2.5 text-center">{d.cantidad}</td>
                <td className="py-2.5 text-right tabular-nums">{dolares(d.precioUnitarioCentavos)}</td>
                <td className="py-2.5 text-right tabular-nums">{dolares(subtotal(d))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3} className="pt-3 text-right">Total a pagar</th>
              <td className="pt-3 text-right text-xl font-extrabold tabular-nums text-amber-700 dark:text-primary">
                {dolares(calcularTotal(pedido))}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/menu" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5")}>
          <LayoutGridIcon /> Volver al menú
        </Link>
        <Link href="/seguimiento" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-5")}>
          <ReceiptTextIcon /> Mis pedidos
        </Link>
      </div>
      {!terminado && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCwIcon className="size-3.5" /> Esta página se actualiza sola.
        </p>
      )}
    </div>
  );
}
