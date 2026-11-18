import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioRegistro } from "@/components/cuenta/formulario-registro";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Crear cuenta" };

/** P-C1 · Registro del cliente (HU-11). */
export default async function PaginaRegistro({ searchParams }: PageProps<"/registro">) {
  const { siguiente } = await searchParams;
  const destino = typeof siguiente === "string" ? siguiente : "";
  if (await obtenerSesion()) {
    redirect("/menu");
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="tarjeta-elevada rounded-3xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo una vez. Recibirás un código de cliente y podrás seguir tus pedidos.
        </p>
        <FormularioRegistro siguiente={destino} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={destino ? `/ingresar?siguiente=${encodeURIComponent(destino)}` : "/ingresar"}
            className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-primary"
          >
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  );
}
