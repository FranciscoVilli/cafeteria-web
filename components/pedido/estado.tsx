import { BellRingIcon, CheckCheckIcon, FlameIcon, HourglassIcon, type LucideIcon } from "lucide-react";
import { ESTADOS, NOMBRE_ESTADO, type EstadoPedido } from "@/lib/dominio/estado-pedido";
import { cn } from "@/lib/utils";

/** Estilo visual de cada estado. */
export const ESTILO_ESTADO: Record<EstadoPedido, { icono: LucideIcon; insignia: string; icono_fondo: string }> = {
  PENDIENTE: {
    icono: HourglassIcon,
    insignia: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    icono_fondo: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  EN_PREPARACION: {
    icono: FlameIcon,
    insignia: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
    icono_fondo: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  LISTO_PARA_RETIRAR: {
    icono: BellRingIcon,
    insignia: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
    icono_fondo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  ENTREGADO: {
    icono: CheckCheckIcon,
    insignia: "bg-stone-200 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300",
    icono_fondo: "bg-stone-200 text-stone-600 dark:bg-stone-400/15 dark:text-stone-300",
  },
};

/** Insignia con el estado del pedido. */
export function InsigniaEstado({ estado, className }: { estado: EstadoPedido; className?: string }) {
  const { icono: Icono, insignia } = ESTILO_ESTADO[estado];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", insignia, className)}>
      <Icono className="size-3.5" />
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}

/** Línea de avance Pendiente → En preparación → Listo → Entregado. */
export function LineaAvance({ estado }: { estado: EstadoPedido }) {
  const actual = ESTADOS.indexOf(estado);
  return (
    <ol className="grid grid-cols-4" aria-label={`Estado: ${NOMBRE_ESTADO[estado]}`}>
      {ESTADOS.map((paso, i) => {
        const Icono = ESTILO_ESTADO[paso].icono;
        const hecho = i <= actual;
        return (
          <li key={paso} className="relative flex flex-col items-center text-center" aria-current={i === actual ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn("absolute top-[18px] right-1/2 h-[3px] w-full -translate-y-1/2", hecho ? "bg-exito" : "bg-border")}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-9 place-items-center rounded-full border-[3px] transition-colors",
                hecho ? "border-exito bg-exito text-exito-foreground" : "border-border bg-card text-muted-foreground",
                i === actual && "ring-4 ring-exito/20",
              )}
            >
              <Icono className="size-4" />
            </span>
            <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", hecho ? "font-semibold" : "text-muted-foreground")}>
              {NOMBRE_ESTADO[paso]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
