"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BanknoteIcon, CheckCircle2Icon, Loader2Icon, PlusIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FotoProducto } from "@/components/foto-producto";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cambiarCantidad, confirmarPedido, resumirCarrito } from "@/lib/acciones/pedidos";
import type { ResumenCarrito } from "@/lib/aplicacion/pedido-servicio";
import { quitar } from "@/lib/dominio/carrito";
import { dolares } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { SelectorCantidad } from "./selector-cantidad";
import { useCarrito } from "./proveedor-carrito";

/** Contenido de «Mi pedido». Los precios y el total siempre los calcula el servidor. */
export function VistaCarrito({ esCliente, haySesion }: { esCliente: boolean; haySesion: boolean }) {
  const router = useRouter();
  const { carrito, listo, reemplazar, vaciar } = useCarrito();
  const [resumen, setResumen] = useState<ResumenCarrito | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [confirmando, iniciarConfirmacion] = useTransition();
  const [actualizando, iniciarActualizacion] = useTransition();
  const clave = JSON.stringify(carrito);

  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    resumirCarrito(carrito).then((r) => {
      if (!vigente) return;
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.datos.retirados.length > 0) {
        toast.warning(`Se quitó de tu pedido porque ya no está disponible: ${r.datos.retirados.join(", ")}.`);
        reemplazar(r.datos.carrito);
      }
      setResumen(r.datos);
      setCantidades(Object.fromEntries(r.datos.lineas.map((l) => [l.producto.codigo, String(l.cantidad)])));
    }).catch(() => {
      // Falla de red o del servidor: se avisa en lugar de dejar la promesa sin gestionar.
      if (vigente) toast.error("No se pudo actualizar el carrito. Revise su conexión y recargue la página.");
    });
    return () => {
      vigente = false;
    };
    // `clave` representa el contenido del carrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, listo]);

  const confirmarCantidad = (codigo: string, valor: string) => {
    const linea = resumen?.lineas.find((l) => l.producto.codigo === codigo);
    if (!linea || String(linea.cantidad) === valor) return;
    iniciarActualizacion(async () => {
      const r = await cambiarCantidad(carrito, codigo, valor);
      if (r.ok) {
        reemplazar(r.datos);
      } else {
        toast.error(r.error);
        setCantidades((c) => ({ ...c, [codigo]: String(linea.cantidad) }));
      }
    });
  };

  const confirmar = () =>
    iniciarConfirmacion(async () => {
      const r = await confirmarPedido(carrito);
      if (r.ok) {
        vaciar();
        router.push(`/pedido/${r.datos.codigoRetiro}?nuevo=1`);
      } else {
        toast.error(r.error);
        router.refresh();
      }
    });

  if (!listo || (resumen === null && carrito.length > 0)) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const lineas = carrito.length === 0 ? [] : (resumen?.lineas ?? []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <ShoppingBagIcon className="size-7" /> Mi pedido
        </h1>
        <Link href="/menu" className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
          <PlusIcon /> Agregar más
        </Link>
      </div>

      {lineas.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed py-20 text-center">
          <ShoppingBagIcon className="size-12 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Tu pedido está vacío</h2>
          <p className="text-muted-foreground">Agrega productos desde el menú para ver el total.</p>
          <Link href="/menu" className={cn(buttonVariants({ size: "lg" }), "mt-5 rounded-full px-6")}>
            Ver el menú
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <ul className="tarjeta-elevada divide-y overflow-hidden rounded-2xl border bg-card">
            {lineas.map((l) => (
              <li key={l.producto.codigo} className="flex flex-wrap items-center gap-4 p-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                  <FotoProducto producto={l.producto} sizes="64px" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.producto.nombre}</p>
                  <p className="text-sm text-muted-foreground">{dolares(l.producto.precioCentavos)} c/u</p>
                </div>
                <SelectorCantidad
                  pequeno
                  etiqueta={`Cantidad de ${l.producto.nombre}`}
                  valor={cantidades[l.producto.codigo] ?? String(l.cantidad)}
                  onCambio={(v) => setCantidades((c) => ({ ...c, [l.producto.codigo]: v }))}
                  onConfirmar={(v) => confirmarCantidad(l.producto.codigo, v)}
                  deshabilitado={actualizando || confirmando}
                />
                <span className="w-20 text-right font-bold tabular-nums">{dolares(l.subtotalCentavos)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${l.producto.nombre}`}
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  disabled={confirmando}
                  onClick={() => reemplazar(quitar(carrito, l.producto.codigo))}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>

          <aside className="tarjeta-elevada rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Resumen</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {lineas.map((l) => (
                <div key={l.producto.codigo} className="flex justify-between gap-3">
                  <dt className="truncate">
                    {l.cantidad} × {l.producto.nombre}
                  </dt>
                  <dd className="tabular-nums">{dolares(l.subtotalCentavos)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t pt-4">
              <span className="font-semibold">Total</span>
              <span className={cn("text-3xl font-extrabold tabular-nums text-amber-700 dark:text-primary", actualizando && "opacity-50")}>
                {dolares(resumen?.totalCentavos ?? 0)}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <BanknoteIcon className="size-3.5" /> Pagas al retirar, en el mostrador.
            </p>

            {esCliente ? (
              <AlertDialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
                <AlertDialogTrigger
                  render={<Button className="mt-5 h-12 w-full rounded-full text-base font-semibold" />}
                  disabled={confirmando || actualizando}
                >
                  {confirmando ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />}
                  Confirmar pedido
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar tu pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Total {dolares(resumen?.totalCentavos ?? 0)}. Recibirás un código de retiro para presentarlo en el
                      mostrador. Una vez confirmado, el pedido no se puede modificar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Revisar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setDialogoAbierto(false);
                        confirmar();
                      }}
                    >
                      Sí, confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : haySesion ? (
              <p className="mt-5 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                Tu cuenta es del personal. Para hacer un pedido ingresa con una cuenta de cliente.
              </p>
            ) : (
              <div className="mt-5 grid gap-2">
                <Link href="/ingresar?siguiente=/carrito" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full text-base font-semibold")}>
                  Ingresar para confirmar
                </Link>
                <Link href="/registro?siguiente=/carrito" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-full")}>
                  Crear cuenta
                </Link>
                <p className="text-center text-xs text-muted-foreground">Tu pedido se conserva mientras ingresas.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
