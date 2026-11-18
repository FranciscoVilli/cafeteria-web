"use client";
import { useActionState } from "react";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { registrarse, type EstadoFormulario } from "@/lib/acciones/cuenta";

/** Formulario de registro del cliente. Conserva lo escrito si hay un error. */
export function FormularioRegistro({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoFormulario, FormData>(registrarse, {});
  const v = estado.valores ?? {};
  return (
    <form action={accion} className="mt-6 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="siguiente" value={siguiente} />
      <Campo nombre="nombre" etiqueta="Nombre" required autoComplete="given-name" defaultValue={v.nombre} maxLength={60} />
      <Campo nombre="apellido" etiqueta="Apellido" required autoComplete="family-name" defaultValue={v.apellido} maxLength={60} />
      <Campo nombre="cedula" etiqueta="Cédula" required inputMode="numeric" maxLength={10} placeholder="10 dígitos" defaultValue={v.cedula} />
      <Campo nombre="celular" etiqueta="Celular" required inputMode="tel" maxLength={10} placeholder="09XXXXXXXX" autoComplete="tel" defaultValue={v.celular} />
      <Campo
        className="sm:col-span-2"
        nombre="correo"
        etiqueta="Correo institucional"
        type="email"
        required
        autoComplete="email"
        placeholder="nombre.apellido@universidad.edu.ec"
        defaultValue={v.correo}
      />
      <Campo nombre="contrasena" etiqueta="Contraseña" type="password" required minLength={8} autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
      <Campo nombre="confirmacion" etiqueta="Repite la contraseña" type="password" required minLength={8} autoComplete="new-password" />
      {estado.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive sm:col-span-2">
          {estado.error}
        </p>
      )}
      <Button type="submit" disabled={pendiente} className="h-11 rounded-full text-base font-semibold sm:col-span-2">
        {pendiente ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} Crear mi cuenta
      </Button>
      <p className="text-center text-xs text-muted-foreground sm:col-span-2">
        Solo guardamos los datos necesarios para identificar tus pedidos.
      </p>
    </form>
  );
}
