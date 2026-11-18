#!/usr/bin/env node
/**
 * Crea (o reactiva) una cuenta del personal de la cafetería.
 *
 * Uso:
 *   node --env-file=.env.local scripts/crear-personal.mjs <correo> <contraseña> "<Nombre Apellido>"
 *
 * Las cuentas del personal no se crean desde la web: así nadie puede darse acceso al panel.
 */
import { createClient } from "@supabase/supabase-js";

const [correo, contrasena, ...nombrePartes] = process.argv.slice(2);
const nombre = nombrePartes.join(" ").trim();

if (!correo || !contrasena || !nombre) {
  console.error('Uso: node --env-file=.env.local scripts/crear-personal.mjs <correo> <contraseña> "<Nombre Apellido>"');
  process.exit(1);
}
if (contrasena.length < 10) {
  console.error("La contraseña del personal debe tener al menos 10 caracteres.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}

const db = createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await db.auth.admin.createUser({
  email: correo.toLowerCase(),
  password: contrasena,
  email_confirm: true,
  user_metadata: { nombre },
});
if (error) {
  console.error(`No se pudo crear la cuenta: ${error.message}`);
  process.exit(1);
}

const { error: errorPerfil } = await db
  .from("perfil")
  .upsert({ usuario_id: data.user.id, rol: "personal", nombre, activo: true });
if (errorPerfil) {
  await db.auth.admin.deleteUser(data.user.id);
  console.error(`No se pudo crear el perfil: ${errorPerfil.message}`);
  process.exit(1);
}

console.log(`✔ Cuenta del personal creada: ${correo} (${nombre})`);
