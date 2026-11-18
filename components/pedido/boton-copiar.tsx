"use client";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia el código de retiro al portapapeles. */
export function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-3 rounded-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el código sigue visible en pantalla.
        }
      }}
    >
      {copiado ? <CheckIcon /> : <CopyIcon />}
      {copiado ? "Copiado" : "Copiar código"}
    </Button>
  );
}
