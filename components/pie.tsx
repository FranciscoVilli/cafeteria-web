import Link from "next/link";
import { Marca } from "@/components/marca";

/** Pie de página. */
export function Pie() {
  return (
    <footer className="border-t border-white/8 bg-cafe text-cafe-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-12 pb-28 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] md:pb-12">
        <div>
          <Marca />
          <p className="mt-4 max-w-xs text-sm text-cafe-foreground/60">
            Pedidos anticipados para la comunidad universitaria. El pago se realiza en el mostrador al retirar.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-display text-lg font-semibold text-caramelo">Explora</p>
          <ul className="mt-3 grid gap-2 text-cafe-foreground/70">
            <li><Link href="/menu" className="hover:text-caramelo">Menú</Link></li>
            <li><Link href="/seguimiento" className="hover:text-caramelo">Seguir mi pedido</Link></li>
            <li><Link href="/registro" className="hover:text-caramelo">Crear cuenta</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-display text-lg font-semibold text-caramelo">Horario</p>
          <p className="mt-3 text-cafe-foreground/70">Lunes a viernes · 07:00 a 18:00</p>
          <p className="mt-4 text-xs text-cafe-foreground/45">
            Fotos con licencia Creative Commons ·{" "}
            <a href="/productos/creditos.json" className="underline-offset-2 hover:underline">créditos</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
