"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarPorCodigo } from "@/lib/acciones/pedidos";

/** Formulario para consultar un pedido por su código de retiro (HU-05). */
export function BuscadorCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = await buscarPorCodigo(codigo);
      if (r.ok) {
        router.push(`/pedido/${r.datos.codigoRetiro}`);
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <section className="tarjeta-elevada rounded-3xl border bg-card p-6 text-center sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-amber-700 dark:text-primary">
        <SearchIcon className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">¿Cómo va mi pedido?</h1>
      <p className="text-muted-foreground">Escribe tu código de retiro de 6 caracteres.</p>
      <form onSubmit={buscar} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
        <Input
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase());
            setError(null);
          }}
          maxLength={6}
          required
          autoComplete="off"
          autoFocus
          placeholder="K7M2QX"
          aria-label="Código de retiro"
          aria-invalid={!!error}
          className="texto-codigo h-12 text-center text-xl font-bold uppercase"
        />
        <Button type="submit" disabled={pendiente} className="h-12 rounded-xl px-6 font-semibold">
          {pendiente && <Loader2Icon className="animate-spin" />} Consultar
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
