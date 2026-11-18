"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImagePlusIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FotoProducto } from "@/components/foto-producto";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  actualizarProducto,
  registrarProducto,
  subirFotoProducto,
  type FormularioProducto as Datos,
} from "@/lib/acciones/menu";
import { CATEGORIAS, MAX_DESCRIPCION, NOMBRE_CATEGORIA, aCategoria } from "@/lib/dominio/producto";
import { cn } from "@/lib/utils";

const VACIO: Datos = { codigo: "", nombre: "", categoria: "BEBIDA", precio: "", disponible: true, descripcion: "", imagenUrl: null };

/** Alta (HU-06) y edición (HU-07) de un producto, con descripción y foto. */
export function FormularioProducto({ inicial }: { inicial: Datos | null }) {
  const router = useRouter();
  const edicion = inicial !== null;
  const [datos, setDatos] = useState<Datos>(inicial ?? VACIO);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [subiendo, iniciarSubida] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);

  const campo = <K extends keyof Datos>(k: K, v: Datos[K]) => {
    setDatos((d) => ({ ...d, [k]: v }));
    setError(null);
  };

  const subir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const foto = e.target.files?.[0];
    e.target.value = "";
    if (!foto) return;
    const formulario = new FormData();
    formulario.set("foto", foto);
    iniciarSubida(async () => {
      const r = await subirFotoProducto(formulario);
      if (r.ok) {
        campo("imagenUrl", r.datos.url);
        toast.success("Foto lista. Guarda el producto para aplicarla.");
      } else {
        setError(r.error);
      }
    });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = edicion ? await actualizarProducto(datos) : await registrarProducto(datos);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(edicion ? `${r.datos.nombre} actualizado` : `${r.datos.nombre} registrado`);
      if (edicion) {
        router.push("/personal/menu");
      } else {
        setDatos(VACIO);
      }
      router.refresh();
    });
  };

  let categoriaVista;
  try {
    categoriaVista = aCategoria(datos.categoria);
  } catch {
    categoriaVista = "BEBIDA" as const;
  }

  return (
    <form onSubmit={enviar} className="tarjeta-elevada grid gap-4 rounded-3xl border bg-card p-5 xl:sticky xl:top-24">
      <div>
        <h2 className="text-3xl font-semibold">{edicion ? "Editar producto" : "Nuevo producto"}</h2>
        <p className="text-sm text-muted-foreground">
          {edicion ? "Los pedidos ya confirmados conservan su precio." : "Aparecerá en el menú si está disponible."}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border bg-muted">
          <FotoProducto producto={{ nombre: datos.nombre || "Producto", categoria: categoriaVista, imagenUrl: datos.imagenUrl }} sizes="96px" />
          {subiendo && (
            <span className="absolute inset-0 grid place-items-center bg-black/50">
              <Loader2Icon className="size-6 animate-spin text-white" />
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <input ref={archivo} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subir} aria-label="Foto del producto" />
          <Button type="button" variant="outline" disabled={subiendo} onClick={() => archivo.current?.click()} className="rounded-full">
            <ImagePlusIcon /> {datos.imagenUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
          {datos.imagenUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => campo("imagenUrl", null)} className="justify-start text-muted-foreground">
              <Trash2Icon /> Quitar foto
            </Button>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 4 MB · se recorta cuadrada</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.6fr] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            value={datos.codigo}
            onChange={(e) => campo("codigo", e.target.value.toUpperCase())}
            readOnly={edicion}
            required
            maxLength={20}
            placeholder="POS-006"
            className={cn("h-10 uppercase", edicion && "bg-muted")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={datos.nombre} onChange={(e) => campo("nombre", e.target.value)} required maxLength={80} placeholder="Flan de caramelo" className="h-10" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          value={datos.descripcion}
          onChange={(e) => campo("descripcion", e.target.value)}
          maxLength={MAX_DESCRIPCION}
          rows={2}
          placeholder="Una frase que antoje: ingredientes, sabor, tamaño…"
        />
        <p className="text-right text-xs text-muted-foreground">
          {datos.descripcion.length}/{MAX_DESCRIPCION}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <select
            id="categoria"
            value={datos.categoria}
            onChange={(e) => campo("categoria", e.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c} className="bg-popover">
                {NOMBRE_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="precio">Precio (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
            <Input id="precio" value={datos.precio} onChange={(e) => campo("precio", e.target.value)} required inputMode="decimal" placeholder="1.25" className="h-10 pl-6" />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={datos.disponible} onCheckedChange={(v) => campo("disponible", v)} />
        Disponible para los clientes
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pendiente || subiendo} className="h-10 flex-1 rounded-full font-semibold">
          {pendiente ? <Loader2Icon className="animate-spin" /> : edicion ? <SaveIcon /> : <PlusIcon />}
          {edicion ? "Guardar cambios" : "Registrar producto"}
        </Button>
        {edicion && (
          <Link href="/personal/menu" className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full")}>
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
