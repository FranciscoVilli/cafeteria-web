"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BellRingIcon, CheckIcon, FlameIcon, Loader2Icon, PackageCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avanzarPedido, entregarPedido } from "@/lib/acciones/pedidos";
import { NOMBRE_ESTADO, type EstadoPedido } from "@/lib/dominio/estado-pedido";

/**
 * Acciones permitidas según el estado: avanzar (HU-09) o entregar con el código (HU-10).
 * Solo se muestra la acción que corresponde; las reglas las valida el servidor.
 */
export function AccionesPedido({ id, estado }: { id: number; estado: EstadoPedido }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const avanzar = () =>
    iniciar(async () => {
      const r = await avanzarPedido(id);
      if (r.ok) toast.success(`Pedido: ${NOMBRE_ESTADO[r.datos.estado]}`);
      else toast.error(r.error);
      router.refresh();
    });

  const entregar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = await entregarPedido(id, codigo);
      if (r.ok) {
        toast.success("Pedido entregado");
        setCodigo("");
      } else {
        setError(r.error);
      }
      router.refresh();
    });
  };

  return (
    <aside className="tarjeta-elevada rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Acciones</h2>

      {estado === "PENDIENTE" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">El pedido espera ser atendido.</p>
          <Button onClick={avanzar} disabled={pendiente} className="mt-4 h-12 w-full rounded-xl text-base font-semibold">
            {pendiente ? <Loader2Icon className="animate-spin" /> : <FlameIcon />} Iniciar preparación
          </Button>
        </>
      )}

      {estado === "EN_PREPARACION" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Cuando termines, márcalo como listo: el cliente lo verá en su pantalla.</p>
          <Button onClick={avanzar} disabled={pendiente} className="mt-4 h-12 w-full rounded-xl bg-exito text-base font-semibold text-exito-foreground hover:bg-exito/90">
            {pendiente ? <Loader2Icon className="animate-spin" /> : <BellRingIcon />} Marcar listo para retirar
          </Button>
        </>
      )}

      {estado === "LISTO_PARA_RETIRAR" && (
        <form onSubmit={entregar} className="mt-2 grid gap-3">
          <p className="text-sm text-muted-foreground">Pide al cliente su código de retiro y digítalo para entregar.</p>
          <Label htmlFor="codigo-entrega">Código que presenta el cliente</Label>
          <Input
            id="codigo-entrega"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setError(null);
            }}
            maxLength={6}
            required
            autoFocus
            autoComplete="off"
            placeholder="······"
            aria-invalid={!!error}
            className="texto-codigo h-14 text-center text-2xl font-bold uppercase"
          />
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pendiente} className="h-12 rounded-xl bg-exito text-base font-semibold text-exito-foreground hover:bg-exito/90">
            {pendiente ? <Loader2Icon className="animate-spin" /> : <PackageCheckIcon />} Verificar y entregar
          </Button>
        </form>
      )}

      {estado === "ENTREGADO" && (
        <div className="py-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-exito text-exito-foreground ring-8 ring-exito/15">
            <CheckIcon className="size-7" strokeWidth={3} />
          </span>
          <p className="mt-4 font-semibold">Pedido entregado</p>
          <p className="text-sm text-muted-foreground">No hay más acciones para este pedido.</p>
        </div>
      )}
    </aside>
  );
}
