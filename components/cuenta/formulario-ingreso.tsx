"use client";
import { useActionState } from "react";
import { Loader2Icon, LogInIcon } from "lucide-react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { ingresar, type EstadoFormulario } from "@/lib/acciones/cuenta";

/** Formulario de ingreso. */
export function FormularioIngreso({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoFormulario, FormData>(ingresar, {});
  return (
    <form action={accion} className="mt-6 grid gap-4">
      <input type="hidden" name="siguiente" value={siguiente} />
      <Campo nombre="correo" etiqueta="Correo" type="email" autoComplete="email" required defaultValue={estado.valores?.correo} autoFocus />
      <Campo nombre="contrasena" etiqueta="Contraseña" type="password" autoComplete="current-password" required />
      {estado.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {estado.error}
        </p>
      )}
      <Button type="submit" disabled={pendiente} className="h-11 rounded-full text-base font-semibold">
        {pendiente ? <Loader2Icon className="animate-spin" /> : <LogInIcon />} Ingresar
      </Button>
    </form>
  );
}
