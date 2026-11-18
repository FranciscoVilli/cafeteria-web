/**
 * Formatos de presentación. Las fechas se muestran siempre en la hora de Ecuador, aunque el
 * servidor de producción corra en UTC.
 *
 * @module formato
 */
export { formatearDolares as dolares } from "@/lib/dominio/dinero";

const ZONA = "America/Guayaquil";

const fechaHora = new Intl.DateTimeFormat("es-EC", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const hora = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });

const diaCorto = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, day: "2-digit", month: "short" });

/** «20/11/2026 10:15» */
export function fechaYHora(d: Date): string {
  return fechaHora.format(d).replace(",", "");
}

/** «10:15» */
export function soloHora(d: Date): string {
  return hora.format(d);
}

/** «20 nov» */
export function dia(d: Date): string {
  return diaCorto.format(d).replace(".", "");
}

/** «hace 5 min» para tiempos de espera en la bandeja. */
export function haceCuanto(d: Date, ahora: Date = new Date()): string {
  const minutos = Math.max(0, Math.round((ahora.getTime() - d.getTime()) / 60_000));
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
}
