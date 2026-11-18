import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioIngreso } from "@/components/cuenta/formulario-ingreso";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ingresar" };

/** P-C1 · Ingreso con correo y contraseña, para clientes y personal. */
export default async function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  const { siguiente } = await searchParams;
  const destino = typeof siguiente === "string" ? siguiente : "";
  const sesion = await obtenerSesion();
  if (sesion) {
    redirect(sesion.rol === "personal" ? "/personal" : destino.startsWith("/") ? destino : "/menu");
  }
  return (
    <div className="mx-auto grid max-w-md px-4 py-10">
      <div className="tarjeta-elevada rounded-3xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">Ingresar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Con el correo y la contraseña de tu cuenta.</p>
        <FormularioIngreso siguiente={destino} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Primera vez?{" "}
          <Link
            href={destino ? `/registro?siguiente=${encodeURIComponent(destino)}` : "/registro"}
            className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-primary"
          >
            Crea tu cuenta de cliente
          </Link>
        </p>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Las cuentas del personal las crea la administración de la cafetería.
      </p>
    </div>
  );
}
