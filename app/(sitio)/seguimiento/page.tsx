import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, ReceiptTextIcon } from "lucide-react";
import { BuscadorCodigo } from "@/components/pedido/buscador-codigo";
import { InsigniaEstado } from "@/components/pedido/estado";
import { calcularTotal } from "@/lib/dominio/pedido";
import { dolares, fechaYHora } from "@/lib/formato";
import { servicios } from "@/lib/servicios";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Seguimiento" };

/** P-C5 · Seguimiento por código de retiro y lista de «Mis pedidos» (HU-05). */
export default async function PaginaSeguimiento() {
  const sesion = await obtenerSesion();
  const misPedidos = sesion?.cliente ? await servicios().pedidos.consultarPedidosDeCliente(sesion.cliente.codigo) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BuscadorCodigo />

      {misPedidos ? (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Mis pedidos</h2>
            <span className="text-sm text-muted-foreground">{misPedidos.length} en total</span>
          </div>
          {misPedidos.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
              <ReceiptTextIcon className="size-8 text-primary" />
              <p className="mt-2">Todavía no tienes pedidos.</p>
            </div>
          ) : (
            <ul className="grid gap-2.5">
              {misPedidos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pedido/${p.codigoRetiro}`}
                    className="tarjeta-elevada flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card p-4 transition hover:border-primary"
                  >
                    <span className="texto-codigo rounded-lg bg-accent px-2.5 py-1 text-sm font-bold">{p.codigoRetiro}</span>
                    <span className="min-w-40 flex-1 text-sm text-muted-foreground">
                      {fechaYHora(p.fechaRegistro)} · {p.detalles.reduce((s, d) => s + d.cantidad, 0)} producto(s)
                    </span>
                    <InsigniaEstado estado={p.estado} />
                    <span className="w-16 text-right font-bold tabular-nums">{dolares(calcularTotal(p))}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        !sesion && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/ingresar?siguiente=/seguimiento" className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-primary">
              Ingresa con tu cuenta
            </Link>{" "}
            para ver todos tus pedidos.
          </p>
        )
      )}
    </div>
  );
}
