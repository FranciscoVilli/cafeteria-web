"use client";
import Link from "next/link";
import { LogOutIcon, ReceiptTextIcon, StoreIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { salir } from "@/lib/acciones/cuenta";

interface Props {
  nombre: string;
  detalle: string;
  rol: "cliente" | "personal";
}

/** Menú de la cuenta con sesión iniciada. */
export function MenuUsuario({ nombre, detalle, rol }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 rounded-full pr-3 pl-1" />}>
        <span className="grid size-7 place-items-center rounded-full bg-primary/20 text-xs font-bold uppercase">
          {nombre.slice(0, 1)}
        </span>
        <span className="max-w-28 truncate">{nombre.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="text-sm font-semibold text-foreground">{nombre}</div>
            <div className="font-normal">{detalle}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {rol === "cliente" ? (
          <DropdownMenuItem render={<Link href="/seguimiento" />}>
            <ReceiptTextIcon /> Mis pedidos
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem render={<Link href="/personal" />}>
            <StoreIcon /> Panel del personal
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => salir()}>
          <LogOutIcon /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Botón para ingresar cuando no hay sesión. */
export function BotonIngresar() {
  return (
    <Link href="/ingresar" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-current/25 px-3 text-sm font-medium hover:bg-white/10">
      <UserRoundIcon className="size-4" /> Ingresar
    </Link>
  );
}
