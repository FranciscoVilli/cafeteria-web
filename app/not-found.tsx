import Link from "next/link";
import { SignpostIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Página no encontrada. */
export default function NoEncontrada() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <SignpostIcon className="mx-auto size-12 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold">No encontramos esa página</h1>
        <p className="mt-1 text-muted-foreground">Revisa la dirección o vuelve al inicio.</p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full px-6")}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
