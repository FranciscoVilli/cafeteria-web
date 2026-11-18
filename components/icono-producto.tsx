import { CakeSliceIcon, CroissantIcon, CupSodaIcon, type LucideIcon } from "lucide-react";
import type { Categoria } from "@/lib/dominio/producto";
import { cn } from "@/lib/utils";

const ESTILO: Record<Categoria, { icono: LucideIcon; clases: string }> = {
  BEBIDA: { icono: CupSodaIcon, clases: "from-amber-900/70 to-stone-900 text-amber-200" },
  ALIMENTO: { icono: CroissantIcon, clases: "from-orange-900/60 to-stone-900 text-orange-200" },
  POSTRE: { icono: CakeSliceIcon, clases: "from-rose-900/60 to-stone-900 text-rose-200" },
};

/** Ilustración de respaldo cuando un producto no tiene foto. */
export function IconoProducto({ categoria, className }: { categoria: Categoria; className?: string }) {
  const { icono: Icono, clases } = ESTILO[categoria];
  return (
    <span className={cn("grid place-items-center bg-gradient-to-br", clases, className)}>
      <Icono className="size-[42%]" strokeWidth={1.4} />
    </span>
  );
}
