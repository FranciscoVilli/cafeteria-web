import Image from "next/image";
import { IconoProducto } from "@/components/icono-producto";
import type { Producto } from "@/lib/dominio/producto";
import { cn } from "@/lib/utils";

interface Props {
  producto: Pick<Producto, "nombre" | "categoria" | "imagenUrl">;
  className?: string;
  /** Ancho aproximado en pantalla, para que el navegador descargue el tamaño justo. */
  sizes?: string;
  prioridad?: boolean;
  calidad?: 75 | 85;
}

/**
 * Foto de un producto. Ocupa el contenedor (que debe tener tamaño y `position: relative`) y,
 * si el producto no tiene foto, muestra una ilustración según su categoría.
 */
export function FotoProducto({ producto, className, sizes = "300px", prioridad, calidad = 75 }: Props) {
  if (!producto.imagenUrl) {
    return <IconoProducto categoria={producto.categoria} className={cn("absolute inset-0", className)} />;
  }
  return (
    <Image
      src={producto.imagenUrl}
      alt={producto.nombre}
      fill
      sizes={sizes}
      quality={calidad}
      priority={prioridad}
      className={cn("object-cover", className)}
    />
  );
}
