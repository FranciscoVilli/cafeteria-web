"use client";
/**
 * Carrito del navegador. Vive en memoria del cliente y se recuerda en `localStorage` para no
 * perderse al recargar. Nunca se confía en él: el servidor lo sanea y revalida en cada
 * acción (precios, disponibilidad y cantidades).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CARRITO_VACIO, sanear, unidades, type Carrito } from "@/lib/dominio/carrito";

const CLAVE = "cafeteria.carrito.v1";

interface ContextoCarrito {
  carrito: Carrito;
  unidades: number;
  /** `true` cuando ya se leyó lo guardado (evita parpadeos al hidratar). */
  listo: boolean;
  reemplazar: (nuevo: Carrito) => void;
  vaciar: () => void;
}

const Contexto = createContext<ContextoCarrito | null>(null);

function leer(): Carrito {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? sanear(JSON.parse(crudo)) : CARRITO_VACIO;
  } catch {
    return CARRITO_VACIO;
  }
}

function escribir(carrito: Carrito) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(carrito));
  } catch {
    // Sin almacenamiento (modo privado): el carrito vive solo en esta pestaña.
  }
}

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [carrito, setCarrito] = useState<Carrito>(CARRITO_VACIO);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
    setCarrito(leer());
    setListo(true);
    const alCambiarEnOtraPestana = (e: StorageEvent) => {
      if (e.key === CLAVE) setCarrito(leer());
    };
    window.addEventListener("storage", alCambiarEnOtraPestana);
    return () => window.removeEventListener("storage", alCambiarEnOtraPestana);
  }, []);

  const reemplazar = useCallback((nuevo: Carrito) => {
    setCarrito(nuevo);
    escribir(nuevo);
  }, []);

  const vaciar = useCallback(() => reemplazar(CARRITO_VACIO), [reemplazar]);

  const valor = useMemo(
    () => ({ carrito, unidades: unidades(carrito), listo, reemplazar, vaciar }),
    [carrito, listo, reemplazar, vaciar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Acceso al carrito desde componentes de cliente. */
export function useCarrito(): ContextoCarrito {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <ProveedorCarrito>");
  return ctx;
}
