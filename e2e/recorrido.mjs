#!/usr/bin/env node
/**
 * Recorrido de extremo a extremo con un navegador real (Chrome del sistema + playwright-core).
 * Cubre PN-01 (cliente: registro → menú → carrito → confirmación → seguimiento) y PN-02
 * (personal: bandeja → avanzar → entregar con código → gestión del menú). Guarda capturas.
 *
 * Requisitos: la app corriendo (npm run dev o npm start) con una base que tenga el menú de
 * ejemplo y una cuenta del personal.
 *
 * Uso:
 *   E2E_PERSONAL_CORREO=... E2E_PERSONAL_CLAVE=... node e2e/recorrido.mjs [url] [carpeta-capturas]
 */
import { mkdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
// La carpeta de capturas se limita a e2e/ para que un argumento como «../../» no permita
// escribir fuera del proyecto (recorrido de rutas, señalado por SonarQube).
const RAIZ_E2E = resolve("e2e");
const CAPTURAS = resolve(RAIZ_E2E, process.argv[3] ?? "capturas");
if (CAPTURAS !== RAIZ_E2E && !CAPTURAS.startsWith(RAIZ_E2E + sep)) {
  console.error("✖ La carpeta de capturas debe estar dentro de e2e/.");
  process.exit(1);
}
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PERSONAL = { correo: process.env.E2E_PERSONAL_CORREO, clave: process.env.E2E_PERSONAL_CLAVE };
mkdirSync(CAPTURAS, { recursive: true });

const sufijo = Date.now().toString().slice(-8);
const cliente = {
  nombre: "Ana",
  apellido: "Pérez",
  cedula: `17${sufijo}`,
  celular: "0991234567",
  correo: `ana.${sufijo}@epn.edu.ec`,
  clave: "CafeSeguro2026",
};

let pasos = 0;
const ok = (texto) => console.log(`  ✔ ${String(++pasos).padStart(2, "0")} ${texto}`);
/** Recorre la página (para cargar fotos diferidas), espera las animaciones y captura. */
async function captura(pagina, nombre) {
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await pagina.waitForLoadState("networkidle").catch(() => {});
  await pagina.waitForTimeout(1200);
  await pagina.screenshot({ path: join(CAPTURAS, `${nombre}.png`), fullPage: true });
}
function esperar(condicion, mensaje) {
  if (!condicion) throw new Error(`Falló: ${mensaje}`);
}

const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  // ------------------------------------------------------------------ PN-01 · Cliente
  console.log("PN-01 · Cliente");
  const ctxCliente = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-EC", colorScheme: "light" });
  const p = await ctxCliente.newPage();

  await p.goto(BASE);
  await p.getByRole("heading", { name: /Pide antes/ }).waitFor();
  await captura(p, "01-portada");
  ok("Portada");

  await p.goto(`${BASE}/menu`);
  await p.getByText("Café americano").first().waitFor();
  esperar(!(await p.getByText("Ensalada de frutas").count()), "el menú no debe mostrar productos no disponibles (HU-01 esc. 1)");
  await captura(p, "02-menu");
  ok("HU-01 · El menú muestra solo productos disponibles");

  await p.getByRole("button", { name: "Capuchino, $2.00" }).click();
  await p.getByRole("heading", { level: 2, name: "Capuchino" }).waitFor();
  await p.getByRole("tab", { name: "Postres" }).click();
  await p.getByRole("button", { name: "Cheesecake, $2.75" }).click();
  await p.getByRole("heading", { level: 2, name: "Cheesecake" }).waitFor();
  await captura(p, "02b-selector-postres");
  ok("Selector: elegir un producto del arco y cambiar a Postres");

  await p.goto(`${BASE}/registro`);
  const llenarRegistro = async (cedula) => {
    await p.getByLabel("Nombre", { exact: true }).fill(cliente.nombre);
    await p.getByLabel("Apellido").fill(cliente.apellido);
    await p.getByLabel("Cédula").fill(cedula);
    await p.getByLabel("Celular").fill(cliente.celular);
    await p.getByLabel("Correo institucional").fill(cliente.correo);
    await p.getByLabel("Contraseña", { exact: true }).fill(cliente.clave);
    await p.getByLabel("Repite la contraseña").fill(cliente.clave);
    await p.getByRole("button", { name: "Crear mi cuenta" }).click();
  };
  await llenarRegistro("1234567890".slice(0, 9));
  await p.getByRole("alert").filter({ hasText: "La cédula debe tener 10 dígitos." }).waitFor();
  esperar((await p.getByLabel("Nombre", { exact: true }).inputValue()) === "Ana", "el formulario conserva lo escrito");
  await captura(p, "03-registro-error");
  ok("HU-11 esc. 3 · Cédula inválida rechazada y el formulario conserva los datos");

  await llenarRegistro(cliente.cedula);
  await p.waitForURL(/\/menu\?bienvenida=CLI-\d{3}/);
  await p.getByText("¡Cuenta creada!").waitFor();
  const codigoCliente = new URL(p.url()).searchParams.get("bienvenida");
  await captura(p, "04-menu-bienvenida");
  ok(`HU-11 esc. 1 · Registro exitoso con código ${codigoCliente}`);

  const tarjeta = (nombre) => p.locator("article").filter({ hasText: nombre });
  await tarjeta("Café americano").getByRole("button", { name: "Sumar uno" }).click();
  await tarjeta("Café americano").getByRole("button", { name: "Agregar" }).click();
  await p.getByText("Café americano se agregó a tu pedido").waitFor();
  await tarjeta("Sánduche de pollo").getByRole("button", { name: "Agregar" }).click();
  await p.getByText("Sánduche de pollo se agregó a tu pedido").waitFor();
  await tarjeta("Café americano").getByText("2 en tu pedido").waitFor();
  ok("HU-02 esc. 1 · Agregar productos al carrito");

  await tarjeta("Empanada de queso").getByLabel("Cantidad de Empanada de queso").fill("abc");
  await tarjeta("Empanada de queso").getByRole("button", { name: "Agregar" }).click();
  await p.getByText("La cantidad debe ser un número entero mayor que cero.").waitFor();
  ok("HU-02 esc. 3 · Cantidad inválida rechazada con el mensaje del dominio");
  await captura(p, "05-menu-con-pedido");

  await p.goto(`${BASE}/carrito`);
  await p.getByText("Total", { exact: true }).waitFor();
  await p.locator("aside").getByText("$5.50").waitFor();
  await captura(p, "06-carrito");
  ok("HU-03 esc. 1 · Total del carrito = $5.50");

  await p.getByRole("button", { name: "Confirmar pedido" }).click();
  await p.getByRole("button", { name: "Sí, confirmar" }).click();
  await p.waitForURL(/\/pedido\/[A-Z2-9]{6}\?nuevo=1/);
  const codigoRetiro = p.url().match(/\/pedido\/([A-Z2-9]{6})/)[1];
  await p.getByText("¡Pedido confirmado!").waitFor();
  await captura(p, "07-pedido-confirmado");
  ok(`HU-04 esc. 1 · Pedido confirmado con código ${codigoRetiro}`);

  await p.goto(`${BASE}/seguimiento`);
  await p.getByText(codigoRetiro).waitFor();
  await p.getByLabel("Código de retiro").fill("ZZZZZZ");
  await p.getByRole("button", { name: "Consultar" }).click();
  await p.getByText("No se encontró un pedido con ese código.").waitFor();
  await captura(p, "08-seguimiento");
  ok("HU-05 esc. 2-3 · Mis pedidos y código inexistente");

  // ------------------------------------------------------------------ Seguridad
  console.log("Seguridad");
  const anonimo = await navegador.newPage();
  await anonimo.goto(`${BASE}/personal`);
  esperar(anonimo.url().includes("/ingresar"), "un anónimo no entra al panel del personal");
  ok("Sin sesión, /personal redirige a /ingresar");
  await p.goto(`${BASE}/personal`);
  await p.getByText("Esta sección es solo para el personal de la cafetería.").waitFor();
  ok("Un cliente no puede entrar al panel del personal");
  await anonimo.close();

  // ------------------------------------------------------------------ PN-02 · Personal
  console.log("PN-02 · Personal");
  esperar(PERSONAL.correo && PERSONAL.clave, "defina E2E_PERSONAL_CORREO y E2E_PERSONAL_CLAVE");
  const ctxPersonal = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-EC" });
  const s = await ctxPersonal.newPage();
  await s.goto(`${BASE}/ingresar`);
  await s.getByLabel("Correo").fill(PERSONAL.correo);
  await s.getByLabel("Contraseña").fill("incorrecta");
  await s.getByRole("button", { name: "Ingresar" }).click();
  await s.getByText("Correo o contraseña incorrectos.").waitFor();
  await s.getByLabel("Contraseña").fill(PERSONAL.clave);
  await s.getByRole("button", { name: "Ingresar" }).click();
  await s.waitForURL(/\/personal$/);
  await s.getByText(codigoRetiro).waitFor();
  await captura(s, "09-bandeja");
  ok("Ingreso del personal y bandeja con el pedido nuevo (HU-08)");

  await s.locator("tr").filter({ hasText: codigoRetiro }).getByRole("link", { name: "Atender" }).click();
  await s.waitForURL(/\/personal\/pedidos\/\d+/);
  await s.getByRole("button", { name: "Iniciar preparación" }).click();
  await s.getByRole("button", { name: "Marcar listo para retirar" }).waitFor();
  ok("HU-09 esc. 1 · Pendiente → En preparación");
  await s.getByRole("button", { name: "Marcar listo para retirar" }).click();
  await s.getByLabel("Código que presenta el cliente").waitFor();
  ok("HU-09 esc. 2 · En preparación → Listo para retirar");

  await p.goto(`${BASE}/pedido/${codigoRetiro}`);
  await p.getByText("¡Tu pedido está listo!").waitFor();
  await captura(p, "10-cliente-pedido-listo");
  ok("HU-05 esc. 4 · El cliente ve «Listo para retirar»");

  await s.getByLabel("Código que presenta el cliente").fill("XXXXXX");
  await s.getByRole("button", { name: "Verificar y entregar" }).click();
  await s.getByRole("alert").filter({ hasText: "El código de retiro no coincide con el pedido." }).waitFor();
  await captura(s, "11-entrega-codigo-incorrecto");
  ok("HU-10 esc. 2 · Código incorrecto rechazado");
  await s.getByLabel("Código que presenta el cliente").fill(codigoRetiro.toLowerCase());
  await s.getByRole("button", { name: "Verificar y entregar" }).click();
  await s.getByText("No hay más acciones para este pedido.").waitFor();
  await captura(s, "12-entregado");
  ok("HU-10 esc. 1 · Entrega con el código correcto (sin distinguir mayúsculas)");

  await s.goto(`${BASE}/personal/menu`);
  const codigoProducto = `BEB-${sufijo.slice(-3)}`;
  await s.getByLabel("Código").fill(codigoProducto);
  await s.getByLabel("Nombre").fill("Té helado");
  await s.getByLabel("Precio (USD)").fill("1,25");
  await s.getByRole("button", { name: "Registrar producto" }).click();
  await s.getByText("Té helado registrado").waitFor();
  await s.getByLabel("Código").fill(codigoProducto);
  await s.getByLabel("Nombre").fill("Otro");
  await s.getByLabel("Precio (USD)").fill("1");
  await s.getByRole("button", { name: "Registrar producto" }).click();
  await s.getByRole("alert").filter({ hasText: "Ya existe un producto con ese código." }).waitFor();
  await captura(s, "13-gestion-menu");
  ok("HU-06 esc. 1-2 · Registro de producto y código repetido rechazado");

  await s.getByRole("link", { name: "Editar" }).first().waitFor();
  await s.goto(`${BASE}/personal/menu?editar=${codigoProducto}`);
  await s.getByLabel("Foto del producto").setInputFiles("public/productos/latte-helado.webp");
  await s.getByText("Foto lista. Guarda el producto para aplicarla.").waitFor();
  await s.getByLabel("Descripción").fill("Té negro frío con limón.");
  await s.getByRole("button", { name: "Guardar cambios" }).click();
  await s.getByText("Té helado actualizado").waitFor();
  await s.waitForURL(/\/personal\/menu$/);
  await p.goto(`${BASE}/menu`);
  const fotoSubida = p.locator("article").filter({ hasText: "Té helado" }).locator("img");
  await fotoSubida.waitFor();
  esperar(decodeURIComponent((await fotoSubida.getAttribute("src")) ?? "").includes("/storage/v1/object/public/productos/"), "la foto se sirve desde Supabase Storage");
  await p.getByText("Té negro frío con limón.").first().waitFor();
  ok("HU-07 · Subir foto (Supabase Storage) y descripción de un producto");

  await s.getByRole("switch", { name: "Disponibilidad de Té helado" }).first().click();
  await s.getByText("Té helado ya no está disponible").waitFor();
  await p.goto(`${BASE}/menu`);
  await p.getByText("Café americano").first().waitFor();
  esperar(!(await p.getByText("Té helado").count()), "un producto deshabilitado desaparece del menú (HU-07)");
  ok("HU-07 esc. 1 · Deshabilitar un producto lo quita del menú");

  // ------------------------------------------------------------------ Móvil y tema oscuro
  console.log("Móvil y tema oscuro");
  const movil = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "es-EC",
    storageState: await ctxCliente.storageState(),
  });
  const m = await movil.newPage();
  await m.goto(`${BASE}/menu`);
  await m.getByText("Café americano").first().waitFor();
  await captura(m, "14-movil-menu");
  await m.goto(`${BASE}/pedido/${codigoRetiro}`);
  await m.getByText(codigoRetiro).first().waitFor();
  await captura(m, "15-movil-pedido");
  const anchoDesborde = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  esperar(anchoDesborde <= 0, `sin desplazamiento horizontal en móvil (sobran ${anchoDesborde}px)`);
  ok("Vista móvil sin desplazamiento horizontal");

  const oscuro = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "es-EC", storageState: await ctxPersonal.storageState() });
  const o = await oscuro.newPage();
  await o.goto(`${BASE}/menu`);
  await o.getByText("Café americano").first().waitFor();
  await captura(o, "16-oscuro-menu");
  await o.goto(`${BASE}/personal`);
  await o.getByText("Bandeja de pedidos").waitFor();
  await captura(o, "17-oscuro-bandeja");
  ok("Tema oscuro");

  console.log(`\n✔ Recorrido completo: ${pasos} verificaciones. Capturas en ${CAPTURAS}`);
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exitCode = 1;
  let n = 0;
  for (const contexto of navegador.contexts()) {
    for (const pagina of contexto.pages()) {
      const archivo = join(CAPTURAS, `fallo-${++n}.png`);
      await pagina.screenshot({ path: archivo }).catch(() => {});
      console.error(`  captura del fallo: ${archivo} (${pagina.url()})`);
    }
  }
} finally {
  await navegador.close();
}
