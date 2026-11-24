import type { NextConfig } from "next";

/**
 * Las fotos que sube el personal se sirven desde Supabase Storage. Solo se permite optimizar
 * imágenes de ese origen. Si Supabase corre en esta máquina (desarrollo con Docker), se habilita
 * la optimización desde IP local; en producción (supabase.co) queda bloqueada.
 */
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");
const esLocal = ["127.0.0.1", "localhost"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  // En la imagen Docker se compila en modo autónomo (servidor Node mínimo, ver Dockerfile).
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Fotos de productos de hasta 4 MB (Vercel acepta como máximo 4,5 MB por petición).
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  images: {
    qualities: [75, 85],
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/productos/**", search: "" }],
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/productos/**",
      },
    ],
    dangerouslyAllowLocalIP: esLocal,
  },
};

export default nextConfig;
