import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** HU-05, escenario 2: código de retiro inexistente. */
export default function PedidoNoEncontrado() {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <SearchXIcon className="size-12 text-primary" />
      <h1 className="mt-3 text-xl font-bold">No se encontró un pedido con ese código.</h1>
      <p className="mt-1 text-muted-foreground">Revisa que esté bien escrito: son 6 letras o números.</p>
      <Link href="/seguimiento" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full px-6")}>
        Buscar otro código
      </Link>
    </div>
  );
}
