"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Enlace de navegación que se resalta en la sección actual. */
export function NavEnlace({ href, children, exacto = false }: { href: string; children: React.ReactNode; exacto?: boolean }) {
  const ruta = usePathname();
  const activo = exacto
    ? ruta === href
    : href === "/personal"
      ? ruta === href || ruta.startsWith("/personal/pedidos")
      : ruta.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-current/70 transition-colors hover:text-current",
        activo && "text-caramelo hover:text-caramelo",
      )}
    >
      {children}
      {activo && <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-px bg-caramelo/70" />}
    </Link>
  );
}
