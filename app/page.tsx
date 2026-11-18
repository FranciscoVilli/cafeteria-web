import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CheckIcon,
  CoffeeIcon,
  QrCodeIcon,
  SearchIcon,
  TimerIcon,
  UtensilsCrossedIcon,
  BellRingIcon,
} from "lucide-react";
import { Encabezado } from "@/components/encabezado";
import { FotoProducto } from "@/components/foto-producto";
import { Pie } from "@/components/pie";
import { dolares } from "@/lib/formato";
import { servicios } from "@/lib/servicios";
import { obtenerSesion } from "@/lib/sesion";

const VENTAJAS = [
  { icono: CoffeeIcon, texto: "Café de altura" },
  { icono: TimerIcon, texto: "Listo en minutos" },
  { icono: BanknoteIcon, texto: "Pagas al retirar" },
];

const PASOS = [
  { icono: UtensilsCrossedIcon, titulo: "Elige del menú", texto: "Precios claros y solo lo que está disponible ahora." },
  { icono: QrCodeIcon, titulo: "Recibe tu código", texto: "Confirma tu pedido y obtén un código de retiro único." },
  { icono: BellRingIcon, titulo: "Retira sin fila", texto: "Te avisamos en pantalla cuando está listo." },
];

/** Portada del sitio. */
export default async function Portada() {
  const [sesion, menu] = await Promise.all([obtenerSesion(), servicios().menu.listarMenuCliente()]);
  const postres = menu.filter((p) => p.categoria === "POSTRE").slice(0, 4);

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      {/* ------------------------------------------------------------ Portada */}
      <section className="fondo-espresso relative overflow-hidden">
        <Encabezado sesion={sesion} transparente />
        <Image
          src="/productos/granos.webp"
          alt=""
          width={700}
          height={440}
          className="pointer-events-none absolute -top-10 -left-40 w-[560px] rotate-12 opacity-[0.12] blur-[1px] select-none"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-32 pb-16 sm:px-6 lg:min-h-[92svh] lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="font-display text-xl text-caramelo italic">Rico · Rápido · Sin filas</p>
            <h1 className="mt-3 text-[3.4rem] leading-[0.95] font-semibold sm:text-7xl lg:text-[5.4rem]">
              Pide antes,
              <br />
              retira sin
              <br />
              <span className="text-caramelo">hacer fila.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/70">
              El café y los antojos de la cafetería universitaria, listos cuando sales de clase.
              Arma tu pedido desde el celular y recógelo con tu código.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="brillo-caramelo inline-flex h-12 items-center gap-2 rounded-full bg-caramelo px-7 font-semibold text-cafe transition hover:brightness-110"
              >
                Ver el menú <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/seguimiento"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-7 font-semibold transition hover:border-caramelo/60 hover:text-caramelo"
              >
                <SearchIcon className="size-4" /> Tengo un código
              </Link>
            </div>
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
              {VENTAJAS.map(({ icono: Icono, texto }) => (
                <li key={texto} className="flex items-center gap-3 text-sm text-foreground/80">
                  <span className="grid size-10 place-items-center rounded-full border border-caramelo/40 text-caramelo">
                    <Icono className="size-[18px]" strokeWidth={1.7} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[600px] animate-in fade-in zoom-in-95 duration-1000">
            <div aria-hidden className="absolute inset-[12%] rounded-full bg-caramelo/25 blur-3xl" />
            <Image
              src="/productos/portada-cafe.webp"
              alt="Taza de café con arte latte"
              fill
              priority
              quality={85}
              sizes="(min-width: 1024px) 600px, 90vw"
              className="foto-fundida object-cover"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Más que un café */}
      <section className="border-t border-white/5 bg-[oklch(0.12_0.01_55)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10">
            <Image
              src="/productos/cafeteria-interior.webp"
              alt="Interior acogedor de una cafetería"
              fill
              sizes="(min-width: 1024px) 600px, 95vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
            <span className="absolute bottom-5 left-5 rounded-full bg-black/55 px-4 py-2 text-sm backdrop-blur">
              Abierto en los recesos · Bloque central
            </span>
          </div>
          <div>
            <p className="font-display text-xl text-caramelo italic">Sobre nosotros</p>
            <h2 className="mt-2 text-5xl leading-[1.02] font-semibold sm:text-6xl">
              Más que
              <br />
              un café
            </h2>
            <p className="mt-6 max-w-lg text-foreground/70">
              En la cafetería preparamos cada día bebidas, sánduches y postres para la comunidad
              universitaria. Con los pedidos anticipados aprovechas tu receso: nada de filas,
              solo pasas, muestras tu código y listo.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Productos frescos cada mañana", "Café ecuatoriano de altura", "Pedidos sin filas", "Pagas en el mostrador"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-caramelo/15 text-caramelo">
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/menu"
              className="mt-9 inline-flex h-11 items-center gap-2 rounded-full bg-caramelo px-6 font-semibold text-cafe transition hover:brightness-110"
            >
              Explorar el menú <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Postres */}
      {postres.length > 0 && (
        <section className="fondo-espresso border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-display text-xl text-caramelo italic">Para el antojo</p>
                <h2 className="mt-2 text-5xl font-semibold">Dulces momentos</h2>
              </div>
              <Link href="/menu?categoria=POSTRE#catalogo" className="inline-flex items-center gap-2 font-semibold text-caramelo hover:underline">
                Ver todos los postres <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {postres.map((p) => (
                <Link key={p.codigo} href="/menu?categoria=POSTRE#catalogo" className="group text-center">
                  <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-full border border-white/10 transition duration-500 group-hover:scale-[1.03] group-hover:border-caramelo/50">
                    <FotoProducto producto={p} sizes="240px" />
                  </div>
                  <h3 className="font-display mt-4 text-2xl font-semibold">{p.nombre}</h3>
                  <p className="text-caramelo">{dolares(p.precioCentavos)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Cómo funciona */}
      <section className="border-t border-white/5 bg-[oklch(0.12_0.01_55)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="font-display text-center text-xl text-caramelo italic">Así de simple</p>
          <h2 className="mt-2 text-center text-5xl font-semibold">Cómo funciona</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
              <li key={titulo} className="relative rounded-3xl border border-white/8 bg-white/[0.03] p-7">
                <span className="font-display absolute top-5 right-6 text-6xl font-semibold text-white/[0.06]">{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-full bg-caramelo text-cafe">
                  <Icono className="size-5" />
                </span>
                <h3 className="font-display mt-5 text-2xl font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm text-foreground/65">{texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link
              href="/menu"
              className="brillo-caramelo inline-flex h-12 items-center gap-2 rounded-full bg-caramelo px-7 font-semibold text-cafe transition hover:brightness-110"
            >
              Empezar mi pedido <ArrowRightIcon className="size-4" />
            </Link>
            {!sesion && (
              <Link href="/ingresar?siguiente=/personal" className="inline-flex h-12 items-center rounded-full px-5 text-sm text-foreground/60 hover:text-caramelo">
                ¿Eres del personal? Ingresa al panel
              </Link>
            )}
          </div>
        </div>
      </section>

      <Pie />
    </div>
  );
}
