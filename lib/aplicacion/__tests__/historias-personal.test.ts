/**
 * Casos de prueba de las historias del personal (HU-06 a HU-10). Cada `it` es un escenario
 * Dado–Cuando–Entonces de la Documentación de Requisitos.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  CodigoRetiroIncorrectoError,
  DatoInvalidoError,
  EntidadDuplicadaError,
  EntidadNoEncontradaError,
  ProductoNoDisponibleError,
  TransicionEstadoInvalidaError,
} from "../../dominio/errores";
import { calcularTotal, confirmar, detalleConPrecioVigente, subtotal, type Pedido } from "../../dominio/pedido";
import { PEDIDO_CAMBIADO } from "../pedido-servicio";
import { ANA, cargarMenuBase, crearEntorno, type Entorno } from "./memoria";

let e: Entorno;

beforeEach(async () => {
  e = crearEntorno();
  await cargarMenuBase(e);
});

const producto = { codigo: "BEB-003", nombre: "Té helado", categoria: "BEBIDA", precioCentavos: 125, disponible: true };

describe("HU-06 · Registrar productos del menú", () => {
  it("Esc. 1: registro exitoso: visible para el personal y en el menú del cliente", async () => {
    const creado = await e.menu.registrarProducto({ ...producto, codigo: " beb-003 " });
    expect(creado).toMatchObject({ codigo: "BEB-003", precioCentavos: 125, disponible: true });
    expect((await e.menu.listarTodosLosProductos()).map((p) => p.codigo)).toContain("BEB-003");
    expect((await e.menu.listarMenuCliente()).map((p) => p.codigo)).toContain("BEB-003");
  });

  it("Esc. 2: un código repetido se rechaza y el producto original no cambia", async () => {
    await expect(e.menu.registrarProducto({ ...producto, codigo: "beb-001", nombre: "Otro" })).rejects.toThrow(
      new EntidadDuplicadaError("Ya existe un producto con ese código."),
    );
    expect(e.productos.filas.get("BEB-001")?.nombre).toBe("Café americano");
  });

  it.each([
    [{ nombre: "" }, "El nombre es obligatorio."],
    [{ nombre: "   " }, "El nombre es obligatorio."],
    [{ precioCentavos: 0 }, "El precio debe ser mayor que cero."],
    [{ precioCentavos: -100 }, "El precio debe ser mayor que cero."],
    [{ categoria: "TORTA" }, "La categoría debe ser BEBIDA, ALIMENTO o POSTRE."],
    [{ categoria: "" }, "La categoría es obligatoria."],
    [{ codigo: "" }, "El código es obligatorio."],
    [{ codigo: "BEB 003!" }, "El código solo puede tener letras, números y guiones, por ejemplo BEB-003."],
  ])("Esc. 3: datos inválidos %o → «%s» y no se guarda nada", async (cambio, mensaje) => {
    await expect(e.menu.registrarProducto({ ...producto, ...cambio })).rejects.toThrow(new DatoInvalidoError(mensaje));
    expect(e.productos.filas.size).toBe(3);
  });

  it("Esc. 4: un producto no disponible aparece para el personal pero no en el menú", async () => {
    await e.menu.registrarProducto({ ...producto, codigo: "ALI-004", nombre: "Brownie", categoria: "ALIMENTO", disponible: false });
    expect((await e.menu.listarTodosLosProductos()).find((p) => p.codigo === "ALI-004")?.disponible).toBe(false);
    expect((await e.menu.listarMenuCliente()).some((p) => p.codigo === "ALI-004")).toBe(false);
  });
});

describe("HU-07 · Actualizar productos, precios y disponibilidad", () => {
  it("Esc. 1: marcar como no disponible lo quita del menú y bloquea agregarlo", async () => {
    await e.menu.cambiarDisponibilidad("BEB-001", false);
    expect((await e.menu.listarMenuCliente()).some((p) => p.codigo === "BEB-001")).toBe(false);
    await expect(e.pedidoServicio.agregarAlCarrito([], "BEB-001", 1)).rejects.toBeInstanceOf(ProductoNoDisponibleError);
  });

  it("Esc. 2: volver a habilitar un producto lo devuelve al menú", async () => {
    expect((await e.menu.cambiarDisponibilidad("ALI-003", true)).disponible).toBe(true);
    expect((await e.menu.listarMenuCliente()).some((p) => p.codigo === "ALI-003")).toBe(true);
  });

  it("Esc. 3: cambiar el precio no afecta los pedidos ya confirmados", async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    const p = await e.pedidoServicio.confirmarPedido([{ codigo: "BEB-001", cantidad: 1 }], "CLI-001");
    await e.menu.actualizarProducto("BEB-001", "Café americano", "BEBIDA", 175);
    expect(e.productos.filas.get("BEB-001")?.precioCentavos).toBe(175);
    expect((await e.pedidoServicio.buscarPedido(p.id!)).detalles[0].precioUnitarioCentavos).toBe(150);
    expect(await e.pedidoServicio.calcularTotal([{ codigo: "BEB-001", cantidad: 1 }])).toBe(175);
  });

  it("Esc. 4: un producto inexistente o un precio inválido se rechazan sin modificar nada", async () => {
    await expect(e.menu.cambiarDisponibilidad("XXX-999", true)).rejects.toThrow(
      new EntidadNoEncontradaError("El producto no existe."),
    );
    await expect(e.menu.actualizarProducto("", "X", "BEBIDA", 100)).rejects.toBeInstanceOf(EntidadNoEncontradaError);
    await expect(e.menu.actualizarProducto("BEB-001", "Café", "BEBIDA", 0)).rejects.toThrow(
      "El precio debe ser mayor que cero.",
    );
    expect(e.productos.filas.get("BEB-001")?.precioCentavos).toBe(150);
  });
});

/** A (PENDIENTE 10:05), B (PENDIENTE 10:01), C (EN_PREPARACION 10:00), D (ENTREGADO 09:50). */
async function cuatroPedidos() {
  const ana = await e.clienteServicio.registrarCliente(ANA, "secreta123");
  const cafe = e.productos.filas.get("BEB-001")!;
  const sanduche = e.productos.filas.get("ALI-001")!;
  const lineas = [detalleConPrecioVigente(cafe, 2), detalleConPrecioVigente(sanduche, 1)];
  const guardar = (codigo: string, hora: string) =>
    e.pedidos.guardar(confirmar(ana, lineas, codigo, new Date(`2026-11-20T${hora}:00-05:00`)));
  const a = await guardar("AAAAAA", "10:05");
  const b = await guardar("BBBBBB", "10:01");
  const c = await guardar("CCCCCC", "10:00");
  const d = await guardar("DDDDDD", "09:50");
  await e.pedidoServicio.avanzarEstado(c.id!);
  await e.pedidoServicio.avanzarEstado(d.id!);
  await e.pedidoServicio.avanzarEstado(d.id!);
  await e.pedidoServicio.entregarPedido(d.id!, "DDDDDD");
  return { a, b, c, d };
}

const codigos = (ps: Pedido[]) => ps.map((p) => p.codigoRetiro);

describe("HU-08 · Consultar los pedidos y filtrarlos por estado", () => {
  it("Esc. 1: filtro Pendiente ordenado por fecha ascendente (B, A)", async () => {
    await cuatroPedidos();
    expect(codigos(await e.pedidoServicio.listarPedidos("PENDIENTE"))).toEqual(["BBBBBB", "AAAAAA"]);
  });

  it("Esc. 2: sin filtro devuelve los cuatro pedidos por fecha con cliente, estado y total", async () => {
    await cuatroPedidos();
    const todos = await e.pedidoServicio.listarPedidos(null);
    expect(codigos(todos)).toEqual(["DDDDDD", "CCCCCC", "BBBBBB", "AAAAAA"]);
    expect(todos[0]).toMatchObject({ estado: "ENTREGADO", cliente: { nombre: "Ana", apellido: "Pérez" } });
    expect(calcularTotal(todos[0])).toBe(550);
    expect(await e.pedidoServicio.contarPorEstado()).toEqual({
      PENDIENTE: 2,
      EN_PREPARACION: 1,
      LISTO_PARA_RETIRAR: 0,
      ENTREGADO: 1,
    });
  });

  it("Esc. 3: el detalle de un pedido suma lo mismo que su total", async () => {
    const { b } = await cuatroPedidos();
    const detalle = await e.pedidoServicio.buscarPedido(b.id!);
    expect(detalle.detalles.reduce((s, d) => s + subtotal(d), 0)).toBe(550);
    expect(calcularTotal(detalle)).toBe(550);
  });

  it("Esc. 4: un filtro sin resultados devuelve una lista vacía sin error", async () => {
    await cuatroPedidos();
    expect(await e.pedidoServicio.listarPedidos("LISTO_PARA_RETIRAR")).toEqual([]);
  });
});

describe("HU-09 · Registrar el avance de la preparación", () => {
  let id: number;
  beforeEach(async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    e.generador.encolar("K7M2QX");
    id = (await e.pedidoServicio.confirmarPedido([{ codigo: "BEB-001", cantidad: 2 }], "CLI-001")).id!;
  });

  it("Esc. 1: de Pendiente a En preparación, guardado", async () => {
    expect((await e.pedidoServicio.avanzarEstado(id)).estado).toBe("EN_PREPARACION");
    expect((await e.pedidoServicio.buscarPedido(id)).estado).toBe("EN_PREPARACION");
  });

  it("Esc. 2: de En preparación a Listo para retirar", async () => {
    await e.pedidoServicio.avanzarEstado(id);
    expect((await e.pedidoServicio.avanzarEstado(id)).estado).toBe("LISTO_PARA_RETIRAR");
  });

  it("Esc. 3: desde Listo para retirar o Entregado no se puede avanzar", async () => {
    await e.pedidoServicio.avanzarEstado(id);
    await e.pedidoServicio.avanzarEstado(id);
    await expect(e.pedidoServicio.avanzarEstado(id)).rejects.toThrow(
      new TransicionEstadoInvalidaError("El pedido está en Listo para retirar; no puede pasar a Entregado."),
    );
    await e.pedidoServicio.entregarPedido(id, "K7M2QX");
    await expect(e.pedidoServicio.avanzarEstado(id)).rejects.toThrow(
      "El pedido está en Entregado; no puede pasar a otro estado.",
    );
    expect((await e.pedidoServicio.buscarPedido(id)).estado).toBe("ENTREGADO");
  });

  it("Esc. 4: un pedido inexistente se rechaza", async () => {
    await expect(e.pedidoServicio.avanzarEstado(999)).rejects.toThrow(new EntidadNoEncontradaError("No se encontró el pedido."));
    await expect(e.pedidoServicio.buscarPedido(Number.NaN)).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });

  it("Extra: si otra persona cambió el pedido al mismo tiempo, se avisa y no se pisa", async () => {
    e.pedidos.cambiadoPorOtro = true;
    await expect(e.pedidoServicio.avanzarEstado(id)).rejects.toThrow(PEDIDO_CAMBIADO);
    e.pedidos.cambiadoPorOtro = false;
    expect((await e.pedidoServicio.buscarPedido(id)).estado).toBe("PENDIENTE");
  });
});

describe("HU-10 · Entregar el pedido verificando el código de retiro", () => {
  let id: number;
  beforeEach(async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    e.generador.encolar("K7M2QX");
    id = (await e.pedidoServicio.confirmarPedido([{ codigo: "ALI-001", cantidad: 1 }], "CLI-001")).id!;
    await e.pedidoServicio.avanzarEstado(id);
  });

  it("Esc. 1: entrega exitosa con el código correcto, sin distinguir mayúsculas ni espacios", async () => {
    await e.pedidoServicio.avanzarEstado(id);
    expect((await e.pedidoServicio.entregarPedido(id, "  k7m2qx ")).estado).toBe("ENTREGADO");
    expect((await e.pedidoServicio.buscarPedido(id)).estado).toBe("ENTREGADO");
  });

  it("Esc. 2: un código incorrecto se rechaza y el pedido sigue Listo para retirar", async () => {
    await e.pedidoServicio.avanzarEstado(id);
    await expect(e.pedidoServicio.entregarPedido(id, "P4T9RB")).rejects.toThrow(
      new CodigoRetiroIncorrectoError("El código de retiro no coincide con el pedido."),
    );
    expect((await e.pedidoServicio.buscarPedido(id)).estado).toBe("LISTO_PARA_RETIRAR");
  });

  it("Esc. 3: si no está listo se valida primero el estado, sin comparar el código", async () => {
    await expect(e.pedidoServicio.entregarPedido(id, "K7M2QX")).rejects.toThrow(
      "El pedido está en En preparación; no puede pasar a Entregado.",
    );
    await expect(e.pedidoServicio.entregarPedido(id, "P4T9RB")).rejects.toBeInstanceOf(TransicionEstadoInvalidaError);
  });

  it("Esc. 4: un pedido entregado no puede entregarse otra vez ni avanzar", async () => {
    await e.pedidoServicio.avanzarEstado(id);
    await e.pedidoServicio.entregarPedido(id, "K7M2QX");
    await expect(e.pedidoServicio.entregarPedido(id, "K7M2QX")).rejects.toThrow(
      "El pedido está en Entregado; no puede pasar a Entregado.",
    );
    await expect(e.pedidoServicio.avanzarEstado(id)).rejects.toBeInstanceOf(TransicionEstadoInvalidaError);
  });
});
