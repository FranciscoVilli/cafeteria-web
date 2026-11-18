import { Encabezado } from "@/components/encabezado";
import { Pie } from "@/components/pie";
import { obtenerSesion } from "@/lib/sesion";

/** Estructura de las páginas del cliente: encabezado, contenido y pie. */
export default async function LayoutSitio({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  return (
    <>
      <Encabezado sesion={sesion} />
      <main className="flex-1">{children}</main>
      <Pie />
    </>
  );
}
