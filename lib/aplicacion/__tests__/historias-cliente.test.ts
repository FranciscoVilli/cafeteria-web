/**
 * Casos de prueba de las historias del cliente (HU-01 a HU-05 y HU-11). Cada `it` es un
 * escenario Dado–Cuando–Entonces de la Documentación de Requisitos.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { aCantidad, type Carrito } from "../../dominio/carrito";
import {
  CantidadInvalidaError,
  CodigoRetiroDuplicadoError,
  DatoInvalidoError,
  EntidadDuplicadaError,
  EntidadNoEncontradaError,
  PedidoVacioError,
  PersistenciaError,
  ProductoNoDisponibleError,
} from "../../dominio/errores";
import { calcularTotal } from "../../dominio/pedido";
import { FORMATO_CODIGO_RETIRO, generarCodigoRetiro } from "../../dominio/codigo-retiro";
import { MAX_INTENTOS_CODIGO, PedidoServicio } from "../pedido-servicio";
import { ANA, LUIS, cargarMenuBase, crearEntorno, type Entorno } from "./memoria";

let e: Entorno;
const vacio: Carrito = [];

beforeEach(async () => {
  e = crearEntorno();
  await cargarMenuBase(e);
});

async function carritoBase() {
  let c = await e.pedidoServicio.agregarAlCarrito(vacio, "BEB-001", 2);
  c = await e.pedidoServicio.agregarAlCarrito(c, "ALI-001", 1);
  return c;
}

describe("HU-01 · Consultar el menú", () => {
  it("Esc. 1: muestra solo los productos disponibles con código, nombre, categoría y precio", async () => {
    const menu = await e.menu.listarMenuCliente();
    expect(menu.map((p) => p.codigo)).toEqual(["ALI-001", "BEB-001"]);
    expect(menu[0]).toMatchObject({ nombre: "Sánduche de pollo", categoria: "ALIMENTO", precioCentavos: 250 });
  });

  it("Esc. 2: muestra el precio vigente después de un cambio de precio", async () => {
    await e.menu.actualizarProducto("BEB-001", "Café americano", "BEBIDA", 175);
    const cafe = (await e.menu.listarMenuCliente()).find((p) => p.codigo === "BEB-001");
    expect(cafe?.precioCentavos).toBe(175);
  });

  it("Esc. 3: menú sin productos disponibles devuelve una lista vacía sin error", async () => {
    await e.menu.cambiarDisponibilidad("BEB-001", false);
    await e.menu.cambiarDisponibilidad("ALI-001", false);
    expect(await e.menu.listarMenuCliente()).toEqual([]);
  });
});

describe("HU-02 · Seleccionar productos y cantidades", () => {
  it("Esc. 1: agregar un producto disponible no escribe en la base de datos", async () => {
    const c = await e.pedidoServicio.agregarAlCarrito(vacio, "ALI-001", 3);
    expect(c).toEqual([{ codigo: "ALI-001", cantidad: 3 }]);
    expect(e.pedidos.filas).toHaveLength(0);
  });

  it("Esc. 2: agregar otra vez el mismo producto acumula la cantidad en una sola línea", async () => {
    let c = await e.pedidoServicio.agregarAlCarrito(vacio, "ALI-001", 3);
    c = await e.pedidoServicio.agregarAlCarrito(c, " ali-001 ", 2);
    expect(c).toEqual([{ codigo: "ALI-001", cantidad: 5 }]);
  });

  it.each(["0", "-2", "1.5", "abc", ""])(
    "Esc. 3: rechaza la cantidad «%s» y el carrito no cambia",
    async (texto) => {
      const c = await e.pedidoServicio.agregarAlCarrito(vacio, "ALI-001", 3);
      await expect(e.pedidoServicio.agregarAlCarrito(c, "BEB-001", aCantidad(texto))).rejects.toThrow(
        new CantidadInvalidaError("La cantidad debe ser un número entero mayor que cero."),
      );
      expect(c).toEqual([{ codigo: "ALI-001", cantidad: 3 }]);
    },
  );

  it("Esc. 4: rechaza un producto no disponible o inexistente", async () => {
    await expect(e.pedidoServicio.agregarAlCarrito(vacio, "ALI-003", 1)).rejects.toThrow(
      new ProductoNoDisponibleError("El producto Ensalada de frutas no está disponible."),
    );
    await expect(e.pedidoServicio.agregarAlCarrito(vacio, "XXX-999", 1)).rejects.toThrow(
      new EntidadNoEncontradaError("El producto no existe."),
    );
    await expect(e.pedidoServicio.agregarAlCarrito(vacio, "", 1)).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });

  it("Esc. 5 (Should): quitar un producto recalcula el total con las líneas restantes", async () => {
    let c = await e.pedidoServicio.agregarAlCarrito(vacio, "ALI-001", 5);
    c = await e.pedidoServicio.agregarAlCarrito(c, "BEB-001", 1);
    c = e.pedidoServicio.quitarDelCarrito(c, "ALI-001");
    expect(c).toEqual([{ codigo: "BEB-001", cantidad: 1 }]);
    expect(await e.pedidoServicio.calcularTotal(c)).toBe(150);
  });
});

describe("HU-03 · Conocer el importe total antes de confirmar", () => {
  it("Esc. 1: total de un carrito con varios productos = 5.50", async () => {
    expect(await e.pedidoServicio.calcularTotal(await carritoBase())).toBe(550);
  });

  it("Esc. 2: el total se recalcula al cambiar una cantidad (7.00) o quitar un producto (3.00)", async () => {
    let c = await e.pedidoServicio.cambiarCantidad(await carritoBase(), "BEB-001", 3);
    expect(await e.pedidoServicio.calcularTotal(c)).toBe(700);
    c = await e.pedidoServicio.cambiarCantidad(c, "BEB-001", 2);
    c = e.pedidoServicio.quitarDelCarrito(c, "ALI-001");
    expect(await e.pedidoServicio.calcularTotal(c)).toBe(300);
    await expect(e.pedidoServicio.cambiarCantidad(c, "BEB-001", 0)).rejects.toBeInstanceOf(CantidadInvalidaError);
  });

  it("Esc. 3: exactitud decimal: 0.35 × 3 = 1.05 exacto", async () => {
    await e.productos.guardar({ codigo: "PRU-001", nombre: "Prueba", categoria: "ALIMENTO", precioCentavos: 35, disponible: true, descripcion: "", imagenUrl: null });
    const c = await e.pedidoServicio.agregarAlCarrito(vacio, "PRU-001", 3);
    expect(await e.pedidoServicio.calcularTotal(c)).toBe(105);
  });

  it("Esc. 4: un carrito vacío vale 0.00", async () => {
    expect(await e.pedidoServicio.calcularTotal(vacio)).toBe(0);
  });

  it("Extra: un producto inexistente en el carrito se rechaza al calcular", async () => {
    await expect(e.pedidoServicio.calcularTotal([{ codigo: "XXX-999", cantidad: 1 }])).rejects.toBeInstanceOf(
      EntidadNoEncontradaError,
    );
  });

  it("Extra: el resumen retira productos que dejaron de estar disponibles e informa cuáles", async () => {
    const c = await carritoBase();
    await e.menu.cambiarDisponibilidad("ALI-001", false);
    const r = await e.pedidoServicio.resumirCarrito([...c, { codigo: "XXX-999", cantidad: 1 }]);
    expect(r.lineas.map((l) => l.producto.codigo)).toEqual(["BEB-001"]);
    expect(r.totalCentavos).toBe(300);
    expect(r.retirados).toEqual(["Sánduche de pollo", "XXX-999"]);
    expect(r.carrito).toEqual([{ codigo: "BEB-001", cantidad: 2 }]);
  });
});

describe("HU-04 · Confirmar el pedido y obtener el código de retiro", () => {
  beforeEach(async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
  });

  it("Esc. 1: confirmación exitosa: PENDIENTE, total 5.50, código de 6 caracteres", async () => {
    const servicio = new PedidoServicio({
      pedidos: e.pedidos,
      productos: e.productos,
      clientes: e.clientes,
      generarCodigo: () => generarCodigoRetiro(),
    });
    const p = await servicio.confirmarPedido(await carritoBase(), "CLI-001");
    expect(p.id).toBe(1);
    expect(p.estado).toBe("PENDIENTE");
    expect(calcularTotal(p)).toBe(550);
    expect(p.codigoRetiro).toMatch(FORMATO_CODIGO_RETIRO);
    expect(p.detalles.map((d) => d.precioUnitarioCentavos)).toEqual([150, 250]);
    expect(e.pedidos.filas).toHaveLength(1);
  });

  it("Esc. 2: un carrito vacío se rechaza y no se guarda nada", async () => {
    await expect(e.pedidoServicio.confirmarPedido(vacio, "CLI-001")).rejects.toThrow(
      new PedidoVacioError("Agregue al menos un producto para confirmar el pedido."),
    );
    expect(e.pedidos.filas).toHaveLength(0);
  });

  it("Esc. 3: si un producto dejó de estar disponible no se registra y el carrito se conserva", async () => {
    const c = await e.pedidoServicio.agregarAlCarrito(vacio, "ALI-001", 1);
    await e.menu.cambiarDisponibilidad("ALI-001", false);
    await expect(e.pedidoServicio.confirmarPedido(c, "CLI-001")).rejects.toThrow(
      new ProductoNoDisponibleError("El producto Sánduche de pollo no está disponible."),
    );
    expect(e.pedidos.filas).toHaveLength(0);
    expect(c).toEqual([{ codigo: "ALI-001", cantidad: 1 }]);
  });

  it("Esc. 4: si el código generado ya existe se descarta y se usa el siguiente", async () => {
    e.generador.encolar("K7M2QX", "K7M2QX", "P4T9RB");
    const c = await carritoBase();
    expect((await e.pedidoServicio.confirmarPedido(c, "CLI-001")).codigoRetiro).toBe("K7M2QX");
    expect((await e.pedidoServicio.confirmarPedido(c, "CLI-001")).codigoRetiro).toBe("P4T9RB");
    expect(e.generador.llamadas).toBe(3);
  });

  it("Esc. 4b: se hacen como máximo 5 intentos de generar el código", async () => {
    e.generador.encolar("K7M2QX");
    const c = await carritoBase();
    await e.pedidoServicio.confirmarPedido(c, "CLI-001");
    e.generador.encolar(...Array(6).fill("K7M2QX"));
    e.generador.llamadas = 0;
    await expect(e.pedidoServicio.confirmarPedido(c, "CLI-001")).rejects.toThrow(
      new PersistenciaError("No se pudo guardar la información. Intente de nuevo."),
    );
    expect(e.generador.llamadas).toBe(MAX_INTENTOS_CODIGO);
  });

  it("Esc. 4c: si otro pedido simultáneo toma el código al guardar, se repite con otro código", async () => {
    let primeraVerificacion = true;
    const repo = e.pedidos;
    const original = repo.existeCodigoRetiro.bind(repo);
    repo.existeCodigoRetiro = async (codigo) => {
      if (primeraVerificacion) {
        primeraVerificacion = false;
        return false; // la verificación dice «libre», pero otro pedido ya lo tomó
      }
      return original(codigo);
    };
    await repo.guardar({ ...(await e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001")), codigoRetiro: "K7M2QX" });
    primeraVerificacion = true;
    e.generador.encolar("K7M2QX", "P4T9RB");
    const p = await e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001");
    expect(p.codigoRetiro).toBe("P4T9RB");
  });

  it("Esc. 4d: si siempre choca al guardar, se informa el error de guardado", async () => {
    e.pedidos.falloAlGuardar = new CodigoRetiroDuplicadoError();
    await expect(e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001")).rejects.toBeInstanceOf(
      CodigoRetiroDuplicadoError,
    );
  });

  it("Esc. 5: el pedido conserva el precio histórico aunque cambie el menú", async () => {
    const primero = await e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001");
    await e.menu.actualizarProducto("BEB-001", "Café americano", "BEBIDA", 175);
    const segundo = await e.pedidoServicio.confirmarPedido([{ codigo: "BEB-001", cantidad: 1 }], "CLI-001");
    const releido = await e.pedidoServicio.buscarPedido(primero.id!);
    expect(releido.detalles[0].precioUnitarioCentavos).toBe(150);
    expect(calcularTotal(releido)).toBe(550);
    expect(segundo.detalles[0].precioUnitarioCentavos).toBe(175);
  });

  it("Esc. 6: si falla el guardado no queda un pedido parcial y se informa el error", async () => {
    e.pedidos.falloAlGuardar = new PersistenciaError();
    await expect(e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001")).rejects.toThrow(
      "No se pudo guardar la información. Intente de nuevo.",
    );
    expect(e.pedidos.filas).toHaveLength(0);
  });

  it("Extra: confirmar con un cliente o producto inexistente se rechaza", async () => {
    await expect(e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-999")).rejects.toThrow("El cliente no existe.");
    await expect(e.pedidoServicio.confirmarPedido(await carritoBase(), "")).rejects.toBeInstanceOf(EntidadNoEncontradaError);
    await expect(e.pedidoServicio.confirmarPedido([{ codigo: "XXX-999", cantidad: 1 }], "CLI-001")).rejects.toThrow(
      "El producto no existe.",
    );
  });
});

describe("HU-05 · Consultar el estado del pedido", () => {
  beforeEach(async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    await e.clienteServicio.registrarCliente(LUIS, "secreta123");
  });

  it("Esc. 1: consulta por código de retiro muestra estado, detalle y total", async () => {
    e.generador.encolar("K7M2QX");
    const p = await e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001");
    await e.pedidoServicio.avanzarEstado(p.id!);
    const consultado = await e.pedidoServicio.consultarPorCodigoRetiro(" k7m2qx ");
    expect(consultado.estado).toBe("EN_PREPARACION");
    expect(consultado.detalles).toHaveLength(2);
    expect(calcularTotal(consultado)).toBe(550);
  });

  it("Esc. 2: un código inexistente se rechaza sin mostrar otros pedidos", async () => {
    await expect(e.pedidoServicio.consultarPorCodigoRetiro("ZZZZZZ")).rejects.toThrow(
      new EntidadNoEncontradaError("No se encontró un pedido con ese código."),
    );
    await expect(e.pedidoServicio.consultarPorCodigoRetiro("")).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });

  it("Esc. 3: la lista de un cliente incluye solo sus pedidos, del más reciente al más antiguo", async () => {
    e.generador.encolar("AAAAA2", "AAAAA3", "AAAAA4", "BBBBB2");
    const c = await carritoBase();
    const p1 = await e.pedidoServicio.confirmarPedido(c, "CLI-001");
    const p2 = await e.pedidoServicio.confirmarPedido(c, "CLI-001");
    const p3 = await e.pedidoServicio.confirmarPedido(c, "CLI-001");
    await e.pedidoServicio.confirmarPedido(c, "CLI-002");
    await e.pedidoServicio.avanzarEstado(p2.id!);
    await e.pedidoServicio.avanzarEstado(p3.id!);
    await e.pedidoServicio.avanzarEstado(p3.id!);
    await e.pedidoServicio.entregarPedido(p3.id!, "AAAAA4");
    const deAna = await e.pedidoServicio.consultarPedidosDeCliente("CLI-001");
    expect(deAna.map((p) => p.estado)).toEqual(["ENTREGADO", "EN_PREPARACION", "PENDIENTE"]);
    expect(deAna[2].codigoRetiro).toBe(p1.codigoRetiro);
    await expect(e.pedidoServicio.consultarPedidosDeCliente("CLI-999")).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });

  it("Esc. 4: una nueva consulta refleja el cambio de estado hecho por el personal", async () => {
    e.generador.encolar("K7M2QX");
    const p = await e.pedidoServicio.confirmarPedido(await carritoBase(), "CLI-001");
    expect((await e.pedidoServicio.consultarPorCodigoRetiro("K7M2QX")).estado).toBe("PENDIENTE");
    await e.pedidoServicio.avanzarEstado(p.id!);
    expect((await e.pedidoServicio.consultarPorCodigoRetiro("K7M2QX")).estado).toBe("EN_PREPARACION");
  });
});

describe("HU-11 · Registrar al cliente", () => {
  it("Esc. 1: registro exitoso con código CLI-001 (y CLI-002 para el siguiente) y su cuenta", async () => {
    const ana = await e.clienteServicio.registrarCliente(ANA, "secreta123");
    expect(ana.codigo).toBe("CLI-001");
    expect((await e.clienteServicio.registrarCliente(LUIS, "secreta123")).codigo).toBe("CLI-002");
    expect(e.cuentas.cuentas.size).toBe(2);
    expect(await e.clienteServicio.buscarPorUsuario("usuario-1")).toMatchObject({ codigo: "CLI-001" });
  });

  it("Esc. 2: una cédula ya registrada se rechaza y no se crea cuenta", async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    await expect(
      e.clienteServicio.registrarCliente({ ...LUIS, cedula: ANA.cedula }, "secreta123"),
    ).rejects.toThrow(new EntidadDuplicadaError("La cédula ya está registrada."));
    expect(e.clientes.filas).toHaveLength(1);
    expect(e.cuentas.cuentas.size).toBe(1);
  });

  it("Esc. 2b: un correo ya registrado se rechaza", async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    await expect(
      e.clienteServicio.registrarCliente({ ...LUIS, correoInstitucional: " ANA.PEREZ@epn.edu.ec " }, "secreta123"),
    ).rejects.toThrow("El correo ya está registrado.");
  });

  it.each([
    [{ nombre: "" }, "El nombre es obligatorio."],
    [{ apellido: "  " }, "El apellido es obligatorio."],
    [{ cedula: "17123" }, "La cédula debe tener 10 dígitos."],
    [{ celular: "09912" }, "El celular debe tener 10 dígitos."],
    [{ correoInstitucional: "ana.perez@" }, "El correo electrónico no tiene un formato válido."],
  ])("Esc. 3: datos inválidos %o → «%s»", async (cambio, mensaje) => {
    await expect(e.clienteServicio.registrarCliente({ ...ANA, ...cambio }, "secreta123")).rejects.toThrow(
      new DatoInvalidoError(mensaje),
    );
    expect(e.clientes.filas).toHaveLength(0);
  });

  it("Esc. 3b: una contraseña de menos de 8 caracteres se rechaza", async () => {
    await expect(e.clienteServicio.registrarCliente(ANA, "corta")).rejects.toThrow(
      "La contraseña debe tener al menos 8 caracteres.",
    );
  });

  it("Esc. 4: identificación posterior con el código de cliente", async () => {
    await e.clienteServicio.registrarCliente(ANA, "secreta123");
    expect((await e.clienteServicio.buscarPorCodigo(" cli-001 ")).nombre).toBe("Ana");
    await expect(e.clienteServicio.buscarPorCodigo("CLI-999")).rejects.toThrow("El cliente no existe.");
    await expect(e.clienteServicio.buscarPorCodigo("")).rejects.toBeInstanceOf(EntidadNoEncontradaError);
  });

  it("Extra: si falla el guardado del cliente, se elimina la cuenta creada (compensación)", async () => {
    e.clientes.falloAlRegistrar = true;
    await expect(e.clienteServicio.registrarCliente(ANA, "secreta123")).rejects.toBeInstanceOf(PersistenciaError);
    expect(e.cuentas.cuentas.size).toBe(0);
  });
});
