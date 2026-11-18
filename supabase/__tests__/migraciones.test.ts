/**
 * Pruebas de la base de datos: aplican las migraciones reales sobre PostgreSQL (PGlite, en
 * memoria) y verifican las garantías que el diseño delega en la base: transacciones
 * atómicas, UNIQUE del código de retiro y de la cédula, restricciones CHECK y permisos.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const CARPETA = join(__dirname, "..", "migrations");

// Lo que Supabase ya trae y un PostgreSQL normal no: el esquema auth y los roles de la API.
const ENTORNO_SUPABASE = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
`;

let db: PGlite;

async function nuevaBase() {
  const base = new PGlite();
  await base.exec(ENTORNO_SUPABASE);
  for (const archivo of readdirSync(CARPETA).filter((f) => f.endsWith(".sql")).sort()) {
    await base.exec(readFileSync(join(CARPETA, archivo), "utf8"));
  }
  await base.exec(readFileSync(join(__dirname, "..", "seed.sql"), "utf8"));
  return base;
}

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

async function registrar(usuario: string, cedula: string, correo: string) {
  await db.query("insert into auth.users (id) values ($1) on conflict do nothing", [usuario]);
  const r = await db.query<{ codigo: string }>(
    "select public.registrar_cliente($1, 'Ana', 'Pérez', $2, '0991234567', $3) as codigo",
    [usuario, cedula, correo],
  );
  return r.rows[0].codigo;
}

const lineas = (...l: [string, number, number][]) =>
  JSON.stringify(l.map(([producto_codigo, cantidad, precio_unitario_centavos]) => ({ producto_codigo, cantidad, precio_unitario_centavos })));

async function crearPedido(codigo: string, cliente: string, detalles: string) {
  const r = await db.query<{ id: number }>("select public.crear_pedido($1, $2, now(), $3::jsonb) as id", [codigo, cliente, detalles]);
  return Number(r.rows[0].id);
}

async function contar(tabla: string) {
  const r = await db.query<{ n: number }>(`select count(*)::int as n from public.${tabla}`);
  return r.rows[0].n;
}

beforeEach(async () => {
  db = await nuevaBase();
});

afterAll(async () => {
  await db?.close();
});

describe("Migraciones · clientes", () => {
  it("registrar_cliente asigna códigos correlativos y crea el perfil en la misma transacción", async () => {
    expect(await registrar(U1, "1712345678", "ana@epn.edu.ec")).toBe("CLI-001");
    expect(await registrar(U2, "1723456789", "luis@epn.edu.ec")).toBe("CLI-002");
    const perfil = await db.query<{ rol: string }>("select rol from public.perfil where usuario_id = $1", [U1]);
    expect(perfil.rows[0].rol).toBe("cliente");
  });

  it("una cédula repetida aborta todo: no queda perfil huérfano (UNIQUE)", async () => {
    await registrar(U1, "1712345678", "ana@epn.edu.ec");
    await expect(registrar(U2, "1712345678", "otra@epn.edu.ec")).rejects.toThrow(/cliente_cedula_key/);
    expect(await contar("perfil")).toBe(1);
    expect(await contar("cliente")).toBe(1);
  });

  it("CHECK rechaza cédulas, celulares y correos con formato inválido", async () => {
    await db.query("insert into auth.users (id) values ($1)", [U1]);
    await expect(
      db.query("select public.registrar_cliente($1, 'A', 'B', '123', '0991234567', 'a@b.ec')", [U1]),
    ).rejects.toThrow(/check/);
    await expect(
      db.query("select public.registrar_cliente($1, 'A', 'B', '1712345678', '0991234567', 'A@B.EC')", [U1]),
    ).rejects.toThrow(/check/);
  });
});

describe("Migraciones · pedidos", () => {
  let cliente: string;
  beforeEach(async () => {
    cliente = await registrar(U1, "1712345678", "ana@epn.edu.ec");
  });

  it("crear_pedido guarda cabecera y líneas, calcula el total y respeta el orden", async () => {
    const id = await crearPedido("K7M2QX", cliente, lineas(["BEB-001", 2, 150], ["ALI-001", 1, 250]));
    const p = await db.query<{ estado: string; importe_total_centavos: number }>(
      "select estado, importe_total_centavos from public.pedido where id = $1",
      [id],
    );
    expect(p.rows[0]).toEqual({ estado: "PENDIENTE", importe_total_centavos: 550 });
    const d = await db.query<{ producto_codigo: string }>(
      "select producto_codigo from public.detalle_pedido where pedido_id = $1 order by orden",
      [id],
    );
    expect(d.rows.map((r) => r.producto_codigo)).toEqual(["BEB-001", "ALI-001"]);
  });

  it("un código de retiro repetido se rechaza (UNIQUE) y no deja un pedido parcial", async () => {
    await crearPedido("K7M2QX", cliente, lineas(["BEB-001", 1, 150]));
    await expect(crearPedido("K7M2QX", cliente, lineas(["BEB-001", 1, 150]))).rejects.toThrow(/pedido_codigo_retiro_key/);
    expect(await contar("pedido")).toBe(1);
    expect(await contar("detalle_pedido")).toBe(1);
  });

  it("si falla la segunda línea se revierte todo (atomicidad, RNF-03)", async () => {
    await expect(crearPedido("P4T9RB", cliente, lineas(["BEB-001", 1, 150], ["NO-EXISTE", 1, 100]))).rejects.toThrow(
      /foreign key/,
    );
    expect(await contar("pedido")).toBe(0);
    expect(await contar("detalle_pedido")).toBe(0);
  });

  it("un pedido sin líneas se rechaza", async () => {
    await expect(crearPedido("P4T9RB", cliente, "[]")).rejects.toThrow(/al menos una línea/);
  });

  it.each([
    ["código con O y 0", "KO0000", lineas(["BEB-001", 1, 150])],
    ["cantidad 0", "P4T9RB", lineas(["BEB-001", 0, 150])],
    ["cantidad 51", "P4T9RB", lineas(["BEB-001", 51, 150])],
    ["precio 0", "P4T9RB", lineas(["BEB-001", 1, 0])],
  ])("CHECK rechaza %s", async (_caso, codigo, detalles) => {
    await expect(crearPedido(codigo, cliente, detalles)).rejects.toThrow(/check/);
    expect(await contar("pedido")).toBe(0);
  });

  it("CHECK rechaza estados inválidos y cuenta pedidos por estado", async () => {
    const id = await crearPedido("K7M2QX", cliente, lineas(["BEB-001", 1, 150]));
    await crearPedido("P4T9RB", cliente, lineas(["BEB-001", 1, 150]));
    await expect(db.query("update public.pedido set estado = 'CANCELADO' where id = $1", [id])).rejects.toThrow(/check/);
    await db.query("update public.pedido set estado = 'EN_PREPARACION' where id = $1", [id]);
    const r = await db.query<{ estado: string; cantidad: number }>(
      "select estado, cantidad::int as cantidad from public.contar_pedidos_por_estado() order by estado",
    );
    expect(r.rows).toEqual([
      { estado: "EN_PREPARACION", cantidad: 1 },
      { estado: "PENDIENTE", cantidad: 1 },
    ]);
  });
});

describe("Migraciones · productos y permisos", () => {
  it.each([
    ["precio 0", "('BEB-009', 'Té', 'BEBIDA', 0, true)"],
    ["categoría inválida", "('BEB-009', 'Té', 'TORTA', 100, true)"],
    ["código en minúsculas", "('beb-009', 'Té', 'BEBIDA', 100, true)"],
    ["nombre vacío", "('BEB-009', '  ', 'BEBIDA', 100, true)"],
  ])("CHECK rechaza %s", async (_caso, valores) => {
    await expect(
      db.query(`insert into public.producto (codigo, nombre, categoria, precio_centavos, disponible) values ${valores}`),
    ).rejects.toThrow(/check/);
  });

  it("los usuarios anónimos no pueden leer ni escribir tablas ni ejecutar funciones", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.producto")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.contar_pedidos_por_estado()")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await db.exec("set role authenticated");
    await expect(db.query("delete from public.pedido")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("el menú de ejemplo se carga con fotos y no se duplica al repetir el seed", async () => {
    await db.exec(readFileSync(join(__dirname, "..", "seed.sql"), "utf8"));
    expect(await contar("producto")).toBe(17);
    const sinFoto = await db.query<{ n: number }>("select count(*)::int as n from public.producto where imagen_url is null");
    expect(sinFoto.rows[0].n).toBe(0);
  });

  it("acepta la categoría POSTRE y valida descripción y foto (migración 2)", async () => {
    await db.query(
      "insert into public.producto (codigo, nombre, categoria, precio_centavos, descripcion, imagen_url) values ('POS-099', 'Flan', 'POSTRE', 150, 'Casero', 'https://x.supabase.co/a.webp')",
    );
    await expect(
      db.query(`insert into public.producto (codigo, nombre, categoria, precio_centavos, descripcion) values ('POS-098', 'Flan', 'POSTRE', 150, '${"x".repeat(201)}')`),
    ).rejects.toThrow(/producto_descripcion_check/);
    await expect(
      db.query("insert into public.producto (codigo, nombre, categoria, precio_centavos, imagen_url) values ('POS-097', 'Flan', 'POSTRE', 150, 'javascript:alert(1)')"),
    ).rejects.toThrow(/producto_imagen_url_check/);
  });
});
