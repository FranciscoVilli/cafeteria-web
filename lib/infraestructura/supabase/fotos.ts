/**
 * Fotos de productos en Supabase Storage (bucket público «productos»). Toda foto se normaliza
 * a 900×900 WebP antes de guardarse: tamaño uniforme en el menú y archivos livianos.
 *
 * @module infraestructura/supabase/fotos
 */
import "server-only";
import sharp from "sharp";
import { DatoInvalidoError, PersistenciaError } from "@/lib/dominio/errores";
import { crearClienteAdmin } from "./clientes";

const BUCKET = "productos";
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
/** Tamaño máximo del archivo original. */
export const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Valida, normaliza y sube una foto.
 *
 * @param archivo archivo recibido del formulario
 * @returns la dirección pública de la foto
 * @throws Lanza {@link DatoInvalidoError} si no es una imagen JPG, PNG o WebP de hasta 4 MB
 */
export async function subirFoto(archivo: File): Promise<string> {
  if (!TIPOS.includes(archivo.type)) {
    throw new DatoInvalidoError("La foto debe ser JPG, PNG o WebP.");
  }
  if (archivo.size === 0 || archivo.size > MAX_BYTES) {
    throw new DatoInvalidoError("La foto debe pesar como máximo 4 MB.");
  }
  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await archivo.arrayBuffer()))
      .rotate()
      .resize(900, 900, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new DatoInvalidoError("No se pudo leer la imagen. Pruebe con otro archivo.");
  }
  const ruta = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.webp`;
  const almacen = crearClienteAdmin().storage.from(BUCKET);
  const { error } = await almacen.upload(ruta, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) {
    throw new PersistenciaError(undefined, { cause: error });
  }
  return almacen.getPublicUrl(ruta).data.publicUrl;
}
