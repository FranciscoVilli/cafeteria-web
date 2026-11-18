"use client";
import { useEffect } from "react";
import { ConstructionIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error inesperado: mensaje amable y opción de reintentar. El detalle va a la consola. */
export default function ErrorGeneral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <ConstructionIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold">Algo salió mal</h1>
        <p className="mt-1 text-muted-foreground">No pudimos cargar esta página. Intenta de nuevo en unos segundos.</p>
        {error.digest && <p className="mt-1 text-xs text-muted-foreground">Referencia: {error.digest}</p>}
        <Button onClick={reset} size="lg" className="mt-6 rounded-full px-6">
          Reintentar
        </Button>
      </div>
    </main>
  );
}
