import Link from "next/link";
import { CoffeeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Logotipo: taza y nombre en tipografía serif. */
export function Marca({ href = "/", subtitulo = "Universitaria", className }: { href?: string; subtitulo?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-full border border-caramelo/50 text-caramelo transition group-hover:bg-caramelo/10">
        <CoffeeIcon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="leading-none">
        <span className="font-display block text-[1.45rem] font-semibold tracking-tight">Cafetería</span>
        <span className="mt-0.5 block text-[0.6rem] font-semibold tracking-[0.28em] text-caramelo uppercase">{subtitulo}</span>
      </span>
    </Link>
  );
}
