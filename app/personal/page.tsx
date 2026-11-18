import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, InboxIcon, RefreshCwIcon } from "lucide-react";
import { AutoRefresco } from "@/components/auto-refresco";
import { ESTILO_ESTADO, InsigniaEstado } from "@/components/pedido/estado";
import { ESTADOS, NOMBRE_ESTADO, esEstado } from "@/lib/dominio/estado-pedido";
import { nombreCompleto } from "@/lib/dominio/cliente";
import { calcularTotal } from "@/lib/dominio/pedido";
import { dia, dolares, haceCuanto, soloHora } from "@/lib/formato";
import { servicios } from "@/lib/servicios";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

/** P-P2 · Bandeja de pedidos: filtro por estado y orden de llegada (HU-08). */
export default async function Bandeja({ searchParams }: PageProps<"/personal">) {
  const { estado } = await searchParams;
  const filtro = esEstado(estado) ? estado : null;
  const pedidosServicio = servicios().pedidos;
  const [pedidos, conteo] = await Promise.all([pedidosServicio.listarPedidos(filtro), pedidosServicio.contarPorEstado()]);
  const total = Object.values(conteo).reduce((a, b) => a + b, 0);
  const ahora = new Date();

  return (
    <div className="px-4 py-6 lg:px-6">
      <AutoRefresco segundos={15} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bandeja de pedidos</h1>
          <p className="text-sm text-muted-foreground">Por orden de llegada: el primero en llegar es el primero en atenderse.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCwIcon className="size-3.5" /> Se actualiza cada 15 s
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {ESTADOS.map((e) => {
          const { icono: Icono, icono_fondo } = ESTILO_ESTADO[e];
          return (
            <Link
              key={e}
              href={filtro === e ? "/personal" : `/personal?estado=${e}`}
              aria-current={filtro === e ? "true" : undefined}
              className={cn(
                "tarjeta-elevada flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5",
                filtro === e && "ring-2 ring-primary",
              )}
            >
              <span className={cn("grid size-11 place-items-center rounded-xl", icono_fondo)}>
                <Icono className="size-5" />
              </span>
              <span>
                <span className="block text-2xl leading-none font-extrabold tabular-nums">{conteo[e]}</span>
                <span className="text-sm text-muted-foreground">{NOMBRE_ESTADO[e]}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <section className="tarjeta-elevada overflow-hidden rounded-2xl border bg-card">
        <nav className="flex flex-wrap gap-2 border-b p-3" aria-label="Filtrar por estado">
          <FiltroEstado href="/personal" activo={!filtro}>
            Todos <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-xs">{total}</span>
          </FiltroEstado>
          {ESTADOS.map((e) => (
            <FiltroEstado key={e} href={`/personal?estado=${e}`} activo={filtro === e}>
              {NOMBRE_ESTADO[e]}
            </FiltroEstado>
          ))}
        </nav>

        {pedidos.length === 0 ? (
          <div className="grid place-items-center py-16 text-center text-muted-foreground">
            <InboxIcon className="size-10 text-primary" />
            <p className="mt-2 font-medium">No hay pedidos en este estado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Código</th>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Productos</th>
                  <th className="px-4 py-3 text-left font-semibold">Llegada</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="texto-codigo rounded-lg bg-accent px-2 py-1 font-bold">{p.codigoRetiro}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{nombreCompleto(p.cliente)}</div>
                      <div className="text-xs text-muted-foreground">{p.cliente.codigo}</div>
                    </td>
                    <td className="hidden max-w-xs px-4 py-3 text-muted-foreground lg:table-cell">
                      {p.detalles.map((d) => `${d.cantidad}× ${d.producto.nombre}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{soloHora(p.fechaRegistro)}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.estado === "ENTREGADO" ? dia(p.fechaRegistro) : haceCuanto(p.fechaRegistro, ahora)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InsigniaEstado estado={p.estado} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{dolares(calcularTotal(p))}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/personal/pedidos/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        Atender <ChevronRightIcon className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FiltroEstado({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
        activo ? "border-cafe bg-cafe text-cafe-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground" : "hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}
