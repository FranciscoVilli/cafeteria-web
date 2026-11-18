"use client";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cambiarDisponibilidad } from "@/lib/acciones/menu";

/** Habilita o deshabilita un producto con un clic (HU-07). */
export function InterruptorDisponibilidad({ codigo, nombre, disponible }: { codigo: string; nombre: string; disponible: boolean }) {
  const [optimista, setOptimista] = useOptimistic(disponible);
  const [, iniciar] = useTransition();
  return (
    <Switch
      checked={optimista}
      aria-label={`Disponibilidad de ${nombre}`}
      onCheckedChange={(valor) =>
        iniciar(async () => {
          setOptimista(valor);
          const r = await cambiarDisponibilidad(codigo, valor);
          if (r.ok) toast.success(r.datos.disponible ? `${r.datos.nombre} está disponible` : `${r.datos.nombre} ya no está disponible`);
          else toast.error(r.error);
        })
      }
    />
  );
}
