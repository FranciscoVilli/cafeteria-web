"use client";
import { MinusIcon, PlusIcon } from "lucide-react";
import { CANTIDAD_MAXIMA } from "@/lib/dominio/carrito";
import { cn } from "@/lib/utils";

interface Props {
  valor: string;
  onCambio: (valor: string) => void;
  /** Se llama al confirmar un valor escrito a mano (al salir del campo o con Enter). */
  onConfirmar?: (valor: string) => void;
  deshabilitado?: boolean;
  pequeno?: boolean;
  etiqueta: string;
}

/**
 * Selector de cantidad con botones − y +. Deja escribir cualquier texto: la validación la
 * hace el dominio en el servidor y su mensaje se muestra tal cual (HU-02, escenario 3).
 */
export function SelectorCantidad({ valor, onCambio, onConfirmar, deshabilitado, pequeno, etiqueta }: Props) {
  const numero = Number.parseInt(valor, 10);
  const cambiar = (delta: number) => {
    const base = Number.isNaN(numero) ? 1 : numero;
    const nuevo = String(Math.min(CANTIDAD_MAXIMA, Math.max(1, base + delta)));
    onCambio(nuevo);
    onConfirmar?.(nuevo);
  };
  const boton = cn(
    "grid place-items-center text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40",
    pequeno ? "size-7" : "size-9",
  );
  return (
    <div className={cn("inline-flex items-center rounded-full border bg-muted/60", deshabilitado && "opacity-60")}>
      <button type="button" className={cn(boton, "rounded-l-full")} onClick={() => cambiar(-1)} disabled={deshabilitado || numero <= 1} aria-label="Restar uno">
        <MinusIcon className="size-3.5" />
      </button>
      <input
        value={valor}
        inputMode="numeric"
        aria-label={etiqueta}
        disabled={deshabilitado}
        onChange={(e) => onCambio(e.target.value)}
        onBlur={(e) => onConfirmar?.(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onConfirmar?.(e.currentTarget.value)}
        className={cn("bg-transparent text-center font-semibold tabular-nums outline-none", pequeno ? "w-7 text-sm" : "w-9")}
      />
      <button type="button" className={cn(boton, "rounded-r-full")} onClick={() => cambiar(1)} disabled={deshabilitado || numero >= CANTIDAD_MAXIMA} aria-label="Sumar uno">
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}
