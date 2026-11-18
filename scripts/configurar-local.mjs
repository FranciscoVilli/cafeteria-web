#!/usr/bin/env node
/**
 * Deja listo el entorno local en un solo paso (después de `npm run db:iniciar`):
 *   1. Lee la URL y las claves del Supabase local (contenedores Docker) y escribe `.env.local`.
 *   2. Crea las cuentas de demostración (cliente y personal) si todavía no existen.
 *
 * Uso:  npm run configurar
 *
 * Solo para desarrollo local: las claves del Supabase local son las mismas para todos
 * y no sirven fuera de su computadora.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEMO = {
  cliente: {
    correo: "cliente@cafeteria.local",
    clave: "ClienteDemo2026",
    nombre: "María",
    apellido: "Andrade",
    cedula: "1712345678",
    celular: "0991234567",
  },
  personal: { correo: "cajero@cafeteria.local", clave: "MostradorSeguro2026", nombre: "Rosa Cajas" },
};

// 1. Claves del Supabase local
let salida;
try {
  salida = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  console.error("✖ Supabase local no está corriendo. Encienda Docker Desktop y ejecute: npm run db:iniciar");
  process.exit(1);
}
const valor = (nombre) => salida.match(new RegExp(`^${nombre}="?([^"\\r\\n]+)"?`, "m"))?.[1];
const url = valor("API_URL");
const anon = valor("ANON_KEY");
const servicio = valor("SERVICE_ROLE_KEY");
if (!url || !anon || !servicio) {
  console.error("✖ No se pudieron leer las claves de `supabase status`. ¿Terminó de iniciar?");
  process.exit(1);
}

const contenido = `# Generado por scripts/configurar-local.mjs para el Supabase local (Docker).
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${servicio}
`;
if (existsSync(".env.local") && !readFileSync(".env.local", "utf8").includes("configurar-local.mjs")) {
  writeFileSync(".env.local.respaldo", readFileSync(".env.local"));
  console.log("• Su .env.local anterior se guardó como .env.local.respaldo");
}
writeFileSync(".env.local", contenido, "utf8");
console.log("✔ .env.local listo");

// 2. Cuentas de demostración
const db = createClient(url, servicio, { auth: { autoRefreshToken: false, persistSession: false } });

async function crearCuenta(correo, clave, nombre) {
  const { data, error } = await db.auth.admin.createUser({
    email: correo,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return null; // ya existe
    throw new Error(`${correo}: ${error.message}`);
  }
  return data.user.id;
}

try {
  const { cliente, personal } = DEMO;

  const idCliente = await crearCuenta(cliente.correo, cliente.clave, `${cliente.nombre} ${cliente.apellido}`);
  if (idCliente) {
    const { error } = await db.rpc("registrar_cliente", {
      p_usuario_id: idCliente,
      p_nombre: cliente.nombre,
      p_apellido: cliente.apellido,
      p_cedula: cliente.cedula,
      p_celular: cliente.celular,
      p_correo: cliente.correo,
    });
    if (error) {
      await db.auth.admin.deleteUser(idCliente);
      throw new Error(`cliente: ${error.message}`);
    }
  }
  console.log(`✔ Cliente:  ${cliente.correo} / ${cliente.clave}${idCliente ? "" : " (ya existía)"}`);

  const idPersonal = await crearCuenta(personal.correo, personal.clave, personal.nombre);
  if (idPersonal) {
    const { error } = await db
      .from("perfil")
      .upsert({ usuario_id: idPersonal, rol: "personal", nombre: personal.nombre, activo: true });
    if (error) {
      await db.auth.admin.deleteUser(idPersonal);
      throw new Error(`personal: ${error.message}`);
    }
  }
  console.log(`✔ Personal: ${personal.correo} / ${personal.clave}${idPersonal ? "" : " (ya existía)"}`);
} catch (e) {
  console.error(`✖ No se pudieron crear las cuentas de demostración: ${e.message}`);
  process.exit(1);
}

console.log("\nListo. Ejecute `npm run dev` y abra http://localhost:3000");
