"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Vuelve a pedir los datos de la página cada cierto tiempo (sin recargarla), salvo que el
 * usuario esté escribiendo o la pestaña no esté visible.
 */
export function AutoRefresco({ segundos }: { segundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      const activo = document.activeElement;
      const escribiendo = activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement;
      if (!escribiendo && document.visibilityState === "visible") {
        router.refresh();
      }
    }, segundos * 1000);
    return () => window.clearInterval(id);
  }, [router, segundos]);
  return null;
}
