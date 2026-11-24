"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, ShoppingBagIcon } from "lucide-react";
import { FotoProducto } from "@/components/foto-producto";
import { cantidadDe } from "@/lib/dominio/carrito";
import { CATEGORIAS, NOMBRE_CATEGORIA_PLURAL, type Categoria, type Producto } from "@/lib/dominio/producto";
import { dolares } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { SelectorCantidad } from "./selector-cantidad";
import { useCarrito } from "./proveedor-carrito";
import { useAgregar } from "./use-agregar";

const FRASE: Record<Categoria, { titulo: [string, string]; texto: string }> = {
  BEBIDA: { titulo: ["Grandes", "momentos."], texto: "Tu café favorito, listo cuando sales de clase." },
  ALIMENTO: { titulo: ["Recarga", "energía."], texto: "Algo rico y rápido entre una clase y otra." },
  POSTRE: { titulo: ["Dulces", "pausas."], texto: "Porque el receso también merece un antojo." },
};

/**
 * Selector destacado del menú: el producto elegido en grande y los demás en arco. Se recorre
 * con clic, flechas del teclado o deslizando el dedo.
 */
export function SelectorProductos({ productos, inicial }: { productos: Producto[]; inicial?: Categoria }) {
  const categorias = CATEGORIAS.filter((c) => productos.some((p) => p.categoria === c));
  const [categoria, setCategoria] = useState<Categoria>(inicial && categorias.includes(inicial) ? inicial : (categorias[0] ?? "BEBIDA"));
  const lista = useMemo(() => productos.filter((p) => p.categoria === categoria), [productos, categoria]);
  // Se empieza por el producto del centro para que el arco quede simétrico.
  const centro = (de: Categoria) => Math.floor((productos.filter((p) => p.categoria === de).length - 1) / 2);
  const [indice, setIndice] = useState(() => centro(categoria));
  const elegido = lista[Math.min(indice, lista.length - 1)];
  const total = lista.length;
  const zonaFoto = useRef<HTMLDivElement>(null);

  // Deslizar el dedo sobre la foto es un atajo táctil; la forma accesible de recorrer el
  // carrusel son los botones «anterior / siguiente» (clic, toque o flechas del teclado).
  useEffect(() => {
    const zona = zonaFoto.current;
    if (!zona || total === 0) return;
    let inicio: number | null = null;
    const alPresionar = (e: PointerEvent) => {
      inicio = e.clientX;
    };
    const alSoltar = (e: PointerEvent) => {
      if (inicio === null) return;
      const dx = e.clientX - inicio;
      inicio = null;
      if (Math.abs(dx) > 40) {
        const delta = dx < 0 ? 1 : -1;
        setIndice((i) => (i + delta + total) % total);
      }
    };
    zona.addEventListener("pointerdown", alPresionar);
    zona.addEventListener("pointerup", alSoltar);
    return () => {
      zona.removeEventListener("pointerdown", alPresionar);
      zona.removeEventListener("pointerup", alSoltar);
    };
  }, [total]);

  if (!elegido) return null;

  const cambiarCategoria = (c: Categoria) => {
    setCategoria(c);
    setIndice(centro(c));
  };

  const mover = (delta: number) => setIndice((i) => (i + delta + total) % total);
  const frase = FRASE[categoria];
  // Con el foco en un botón del carrusel, las flechas también cambian de producto.
  const conFlechas = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      mover(e.key === "ArrowRight" ? 1 : -1);
    }
  };

  return (
    <section
      className="relative mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6"
      aria-roledescription="carrusel"
      aria-label={`${NOMBRE_CATEGORIA_PLURAL[categoria]} destacados`}
    >
      {/* Pestañas de categoría */}
      <div className="flex justify-center gap-2 lg:justify-start" role="tablist" aria-label="Categoría">
        {categorias.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={c === categoria}
            onClick={() => cambiarCategoria(c)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm font-medium transition",
              c === categoria ? "border-caramelo bg-caramelo text-cafe" : "border-white/15 text-cafe-foreground/75 hover:border-caramelo/50 hover:text-caramelo",
            )}
          >
            {NOMBRE_CATEGORIA_PLURAL[c]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-center gap-6 lg:grid-cols-[1fr_1.15fr_1fr]">
        {/* Frase */}
        <div className="hidden lg:block">
          <h1 key={categoria} className="text-7xl leading-[0.95] font-semibold animate-in fade-in slide-in-from-left-3 duration-500">
            {frase.titulo[0]}
            <br />
            <span className="text-caramelo">{frase.titulo[1]}</span>
          </h1>
          <p className="mt-4 max-w-xs text-cafe-foreground/65">{frase.texto}</p>
        </div>

        {/* Foto grande */}
        <div ref={zonaFoto} className="relative mx-auto aspect-square w-full max-w-[440px] touch-pan-y">
          <div aria-hidden className="absolute inset-[14%] rounded-full bg-caramelo/30 blur-3xl" />
          <div key={elegido.codigo} className="absolute inset-0 animate-in fade-in zoom-in-95 duration-500">
            <FotoProducto producto={elegido} sizes="(min-width: 1024px) 440px, 85vw" calidad={85} prioridad className="foto-fundida" />
          </div>
          <button
            onClick={() => mover(-1)}
            onKeyDown={conFlechas}
            aria-label="Producto anterior"
            className="absolute top-1/2 left-0 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/30 backdrop-blur transition hover:border-caramelo hover:text-caramelo lg:-left-4"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            onClick={() => mover(1)}
            onKeyDown={conFlechas}
            aria-label="Producto siguiente"
            className="absolute top-1/2 right-0 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/30 backdrop-blur transition hover:border-caramelo hover:text-caramelo lg:-right-4"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        {/* Panel del elegido */}
        <PanelElegido key={elegido.codigo} producto={elegido} />
      </div>

      <Arco lista={lista} indice={indice} onElegir={setIndice} />
    </section>
  );
}

function PanelElegido({ producto }: { producto: Producto }) {
  const { carrito } = useCarrito();
  const { cantidad, setCantidad, agregar, pendiente } = useAgregar(producto);
  const enPedido = cantidadDe(carrito, producto.codigo);
  return (
    <div className="animate-in fade-in slide-in-from-right-3 text-center duration-500 lg:border-l lg:border-caramelo/40 lg:pl-8 lg:text-left">
      <p className="text-xs font-semibold tracking-[0.25em] text-caramelo uppercase">Elegido</p>
      <h2 className="mt-2 text-5xl leading-none font-semibold">{producto.nombre}</h2>
      {producto.descripcion && <p className="mx-auto mt-3 max-w-sm text-cafe-foreground/65 lg:mx-0">{producto.descripcion}</p>}
      <p className="font-display mt-4 text-5xl font-semibold text-caramelo">{dolares(producto.precioCentavos)}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
        <SelectorCantidad valor={cantidad} onCambio={setCantidad} deshabilitado={pendiente} etiqueta={`Cantidad de ${producto.nombre}`} />
        <button
          onClick={agregar}
          disabled={pendiente}
          className="brillo-caramelo inline-flex h-11 items-center gap-2 rounded-full bg-caramelo px-6 font-semibold text-cafe transition hover:brightness-110 disabled:opacity-60"
        >
          {pendiente ? <Loader2Icon className="size-4 animate-spin" /> : <ShoppingBagIcon className="size-4" />}
          Agregar al pedido
        </button>
      </div>
      {enPedido > 0 && <p className="mt-3 text-sm text-exito">Ya tienes {enPedido} en tu pedido</p>}
    </div>
  );
}

/** Productos dispuestos en arco: el elegido abajo al centro, los demás subiendo hacia los lados. */
function Arco({ lista, indice, onElegir }: { lista: Producto[]; indice: number; onElegir: (i: number) => void }) {
  const n = lista.length;
  const mitad = Math.floor(n / 2);
  return (
    <div
      className="relative mt-4 h-52 overflow-hidden sm:mt-2"
      aria-label="Elegir producto"
      style={{ "--paso-arco": "clamp(88px, 13vw, 150px)" } as React.CSSProperties}
    >
      {lista.map((p, i) => {
        let o = i - indice;
        if (n > 3) {
          if (o > mitad) o -= n;
          if (o < -mitad) o += n;
        }
        const d = Math.abs(o);
        const visible = d <= 3;
        return (
          <button
            key={p.codigo}
            onClick={() => onElegir(i)}
            tabIndex={visible ? 0 : -1}
            aria-label={`${p.nombre}, ${dolares(p.precioCentavos)}`}
            aria-current={o === 0 ? "true" : undefined}
            className="group absolute top-0 left-1/2 flex w-28 flex-col items-center transition-all duration-500 ease-out"
            style={{
              transform: `translateX(calc(-50% + ${o} * var(--paso-arco))) translateY(${(3 - Math.min(d, 3)) * 10}px) scale(${1 - Math.min(d, 3) * 0.1})`,
              opacity: visible ? 1 - d * 0.2 : 0,
              pointerEvents: visible ? "auto" : "none",
              zIndex: 10 - d,
            }}
          >
            <span
              className={cn(
                "relative block size-20 overflow-hidden rounded-full border-2 transition sm:size-24",
                o === 0 ? "border-caramelo shadow-[0_0_30px_-6px] shadow-caramelo/60" : "border-white/10 group-hover:border-caramelo/50",
              )}
            >
              <FotoProducto producto={p} sizes="96px" />
            </span>
            <span className={cn("font-display mt-2 text-lg leading-tight font-semibold", o === 0 && "text-caramelo")}>{p.nombre}</span>
            <span className="text-sm text-cafe-foreground/60">{dolares(p.precioCentavos)}</span>
          </button>
        );
      })}
    </div>
  );
}
