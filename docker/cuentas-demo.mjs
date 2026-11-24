// Crea las cuentas de demostración dentro del contenedor (equivale a `npm run configurar`).
const CLAVE = process.env.SERVICE_KEY;
const cabeceras = { apikey: CLAVE, Authorization: `Bearer ${CLAVE}`, "Content-Type": "application/json" };

async function crearCuenta(correo, clave, nombre) {
  const r = await fetch("http://127.0.0.1:9999/admin/users", {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ email: correo, password: clave, email_confirm: true, user_metadata: { nombre } }),
  });
  const cuerpo = await r.json();
  if (r.ok) return cuerpo.id;
  if (/already|registered|exists/i.test(JSON.stringify(cuerpo))) return null;
  throw new Error(`${correo}: ${JSON.stringify(cuerpo)}`);
}

async function rest(ruta, cuerpo, extra = {}) {
  const r = await fetch(`http://127.0.0.1:3002${ruta}`, {
    method: "POST",
    headers: { ...cabeceras, ...extra },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`${ruta}: ${await r.text()}`);
}

const idCliente = await crearCuenta("cliente@cafeteria.local", "ClienteDemo2026", "María Andrade");
if (idCliente) {
  await rest("/rpc/registrar_cliente", {
    p_usuario_id: idCliente,
    p_nombre: "María",
    p_apellido: "Andrade",
    p_cedula: "1712345678",
    p_celular: "0991234567",
    p_correo: "cliente@cafeteria.local",
  });
}
console.log("[cafeteria] ✔ Cuenta cliente@cafeteria.local");

const idPersonal = await crearCuenta("cajero@cafeteria.local", "MostradorSeguro2026", "Rosa Cajas");
if (idPersonal) {
  await rest(
    "/perfil",
    { usuario_id: idPersonal, rol: "personal", nombre: "Rosa Cajas", activo: true },
    { Prefer: "resolution=merge-duplicates" },
  );
}
console.log("[cafeteria] ✔ Cuenta cajero@cafeteria.local");
