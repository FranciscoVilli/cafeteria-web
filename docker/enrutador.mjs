// Enrutador del contenedor: publica todo en un solo puerto (3000), como lo hace Kong en
// Supabase. Quita el prefijo de cada servicio y deja pasar el resto a Next.js.
import http from "node:http";

const SERVICIOS = [
  ["/auth/v1", 9999], // GoTrue
  ["/rest/v1", 3002], // PostgREST
  ["/storage/v1", 5000], // Storage API
];
const NEXT = 3001;

function destino(url) {
  for (const [prefijo, puerto] of SERVICIOS) {
    if (url === prefijo || url.startsWith(prefijo + "/") || url.startsWith(prefijo + "?")) {
      const resto = url.slice(prefijo.length);
      return { puerto, ruta: resto.startsWith("/") ? resto : "/" + resto };
    }
  }
  return { puerto: NEXT, ruta: url };
}

http
  .createServer((req, res) => {
    const { puerto, ruta } = destino(req.url ?? "/");
    const salida = http.request(
      {
        host: "127.0.0.1",
        port: puerto,
        method: req.method,
        path: ruta,
        headers: { ...req.headers, "x-forwarded-host": req.headers.host, "x-forwarded-proto": "http" },
      },
      (respuesta) => {
        res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
        respuesta.pipe(res);
      },
    );
    salida.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end("Servicio no disponible todavía. Espere unos segundos y recargue.");
    });
    req.pipe(salida);
  })
  .listen(3000, () => console.log("[cafeteria] Enrutador escuchando en :3000"));
