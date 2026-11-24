/** Pruebas unitarias del dominio, sin base de datos (RNF-06, RNF-07). */
import { describe, expect, it } from "vitest";
import * as carrito from "../carrito";
import { nombreCompleto, validarCliente } from "../cliente";
import { ALFABETO, FORMATO_CODIGO_RETIRO, generarCodigoRetiro } from "../codigo-retiro";
import { aCentavos, aTexto, formatearDolares } from "../dinero";
import { CantidadInvalidaError, DatoInvalidoError, PedidoVacioError, ReglaNegocioError, TransicionEstadoInvalidaError } from "../errores";
import { esEstado, siguienteEstado } from "../estado-pedido";
import { avanzar, calcularTotal, confirmar, detalleConPrecioVigente, entregar } from "../pedido";
import { aCategoria, actualizarProducto, crearProducto, type Producto } from "../producto";

const CAFE: Producto = { codigo: "BEB-001", nombre: "Café", categoria: "BEBIDA", precioCentavos: 150, disponible: true, descripcion: "", imagenUrl: null };
const ANA = { codigo: "CLI-001", nombre: "Ana", apellido: "Pérez", cedula: "1712345678", celular: "0991234567", correoInstitucional: "a@epn.edu.ec" };

describe("Dinero (RNF-05)", () => {
  it.each([
    ["1.50", 150],
    ["1,5", 150],
    ["2", 200],
    [" 0.35 ", 35],
    ["1234.05", 123405],
  ])("convierte «%s» en %i centavos sin punto flotante", (texto, centavos) => {
    expect(aCentavos(texto)).toBe(centavos);
  });

  it.each(["", "abc", "1.234", "-1", "1.2.3"])("rechaza «%s»", (texto) => {
    expect(() => aCentavos(texto)).toThrow(DatoInvalidoError);
  });

  it("formatea con dos decimales", () => {
    expect(aTexto(550)).toBe("5.50");
    expect(aTexto(5)).toBe("0.05");
    expect(aTexto(-150)).toBe("-1.50");
    expect(formatearDolares(105)).toBe("$1.05");
  });
});

describe("Estados del pedido (RN-NEG-06)", () => {
  it("siguen un orden lineal sin saltos", () => {
    expect(siguienteEstado("PENDIENTE")).toBe("EN_PREPARACION");
    expect(siguienteEstado("EN_PREPARACION")).toBe("LISTO_PARA_RETIRAR");
    expect(() => siguienteEstado("LISTO_PARA_RETIRAR")).toThrow(TransicionEstadoInvalidaError);
    expect(() => siguienteEstado("ENTREGADO")).toThrow(TransicionEstadoInvalidaError);
    expect(esEstado("PENDIENTE")).toBe(true);
    expect(esEstado("CANCELADO")).toBe(false);
  });
});

describe("Pedido", () => {
  const pedido = () => confirmar(ANA, [detalleConPrecioVigente(CAFE, 2)], " k7m2qx ", new Date());

  it("se confirma PENDIENTE con el código normalizado", () => {
    const p = pedido();
    expect(p).toMatchObject({ id: null, codigoRetiro: "K7M2QX", estado: "PENDIENTE" });
    expect(calcularTotal(p)).toBe(300);
  });

  it("rechaza confirmar sin líneas o sin código", () => {
    expect(() => confirmar(ANA, [], "K7M2QX", new Date())).toThrow(PedidoVacioError);
    expect(() => confirmar(ANA, [detalleConPrecioVigente(CAFE, 1)], " ", new Date())).toThrow(DatoInvalidoError);
    expect(() => detalleConPrecioVigente(CAFE, 0)).toThrow(CantidadInvalidaError);
  });

  it("es inmutable: avanzar y entregar devuelven pedidos nuevos", () => {
    const p = pedido();
    const listo = avanzar(avanzar(p));
    expect(p.estado).toBe("PENDIENTE");
    expect(listo.estado).toBe("LISTO_PARA_RETIRAR");
    expect(() => entregar(listo, null)).toThrow("El código de retiro no coincide con el pedido.");
    expect(entregar(listo, "k7m2qx").estado).toBe("ENTREGADO");
  });
});

describe("Carrito (RN-NEG-01, SUP-11)", () => {
  it("agrega, acumula, cambia, quita y cuenta unidades", () => {
    let c = carrito.agregar(carrito.CARRITO_VACIO, "beb-001", 2);
    c = carrito.agregar(c, "BEB-001", 3);
    c = carrito.cambiarCantidad(c, "ALI-001", 1);
    expect(c).toEqual([
      { codigo: "BEB-001", cantidad: 5 },
      { codigo: "ALI-001", cantidad: 1 },
    ]);
    expect(carrito.unidades(c)).toBe(6);
    c = carrito.cambiarCantidad(c, "BEB-001", 1);
    expect(carrito.cantidadDe(c, "beb-001")).toBe(1);
    c = carrito.quitar(c, "BEB-001");
    expect(carrito.estaVacio(carrito.quitar(c, "ALI-001"))).toBe(true);
  });

  it("rechaza cantidades inválidas, excesivas y códigos vacíos", () => {
    expect(() => carrito.agregar([], "BEB-001", 0)).toThrow(CantidadInvalidaError);
    expect(() => carrito.agregar([], "BEB-001", 1.5)).toThrow(CantidadInvalidaError);
    expect(() => carrito.agregar([], "BEB-001", carrito.CANTIDAD_MAXIMA + 1)).toThrow("La cantidad máxima por producto es 50.");
    expect(() => carrito.agregar([{ codigo: "BEB-001", cantidad: 49 }], "BEB-001", 2)).toThrow(CantidadInvalidaError);
    expect(() => carrito.agregar([], " ", 1)).toThrow(DatoInvalidoError);
  });

  it("convierte texto en cantidad: lo que no es entero vale 0", () => {
    expect(carrito.aCantidad("3")).toBe(3);
    expect(carrito.aCantidad(" 4 ")).toBe(4);
    expect(carrito.aCantidad("1.5")).toBe(0);
    expect(carrito.aCantidad("abc")).toBe(0);
    expect(carrito.aCantidad(null)).toBe(0);
    expect(carrito.aCantidad(2)).toBe(2);
    expect(carrito.aCantidad(2.5)).toBe(0);
  });

  it("sanea un carrito recibido del navegador descartando líneas inválidas", () => {
    expect(carrito.sanear("basura")).toEqual([]);
    expect(
      carrito.sanear([
        { codigo: "beb-001", cantidad: 2 },
        { codigo: "ALI-001", cantidad: -1 },
        { codigo: 5, cantidad: 1 },
        null,
        { codigo: "BEB-001", cantidad: 3 },
      ]),
    ).toEqual([{ codigo: "BEB-001", cantidad: 3 }]);
  });
});

describe("Producto y Cliente", () => {
  it("normaliza y valida productos", () => {
    const p = crearProducto({ codigo: " beb-009 ", nombre: " Té ", categoria: "bebida", precioCentavos: 125, disponible: true });
    expect(p).toMatchObject({ codigo: "BEB-009", nombre: "Té", categoria: "BEBIDA" });
    expect(() => actualizarProducto(p, "x".repeat(81), "BEBIDA", 100)).toThrow("El nombre no puede tener más de 80 caracteres.");
    expect(() => actualizarProducto(p, "Té", "BEBIDA", 1.5)).toThrow("El precio debe ser mayor que cero.");
    expect(aCategoria(" alimento ")).toBe("ALIMENTO");
    expect(() => aCategoria(null)).toThrow("La categoría es obligatoria.");
  });

  it("acepta la categoría POSTRE, descripción y foto, y las valida", () => {
    const base = {
      codigo: "POS-001",
      nombre: "Cheesecake",
      categoria: "postre",
      precioCentavos: 275,
      disponible: true,
      descripcion: "  Base de   galleta  ",
      imagenUrl: "/productos/cheesecake.webp",
    };
    expect(crearProducto(base)).toMatchObject({
      categoria: "POSTRE",
      descripcion: "Base de galleta",
      imagenUrl: "/productos/cheesecake.webp",
    });
    expect(crearProducto({ ...base, imagenUrl: "  " }).imagenUrl).toBeNull();
    expect(crearProducto({ ...base, imagenUrl: undefined, descripcion: undefined })).toMatchObject({ imagenUrl: null, descripcion: "" });
    expect(crearProducto({ ...base, imagenUrl: "https://x.supabase.co/storage/v1/object/public/productos/a.webp" }).imagenUrl).toMatch(/^https:/);
    expect(() => crearProducto({ ...base, descripcion: "x".repeat(201) })).toThrow("La descripción no puede tener más de 200 caracteres.");
    expect(() => crearProducto({ ...base, imagenUrl: "javascript:alert(1)" })).toThrow("La dirección de la foto no es válida.");
  });

  it("al actualizar conserva descripción y foto si no se indican, y las cambia si se indican", () => {
    const p = { ...CAFE, descripcion: "Intenso", imagenUrl: "/productos/americano.webp" };
    expect(actualizarProducto(p, "Café", "BEBIDA", 160)).toMatchObject({ descripcion: "Intenso", imagenUrl: "/productos/americano.webp" });
    expect(actualizarProducto(p, "Café", "BEBIDA", 160, { descripcion: "", imagenUrl: null })).toMatchObject({
      descripcion: "",
      imagenUrl: null,
    });
  });

  it("normaliza y valida clientes", () => {
    const datos = validarCliente({ ...ANA, nombre: " Ana ", correoInstitucional: " A@EPN.edu.ec " });
    expect(datos.nombre).toBe("Ana");
    expect(datos.correoInstitucional).toBe("a@epn.edu.ec");
    expect(nombreCompleto(datos)).toBe("Ana Pérez");
    expect(() => validarCliente({ ...ANA, nombre: "x".repeat(61) })).toThrow("El nombre no puede tener más de 60 caracteres.");
    expect(() => validarCliente({ ...ANA, cedula: "17123456AB" })).toThrow("La cédula debe tener 10 dígitos.");
  });

  it("valida el formato del correo sin expresión regular vulnerable (SonarQube S5852)", () => {
    const formato = "El correo electrónico no tiene un formato válido.";
    for (const valido of ["a@epn.edu.ec", "ana.perez@epn.edu.ec", "x@b.c"]) {
      expect(validarCliente({ ...ANA, correoInstitucional: valido }).correoInstitucional).toBe(valido);
    }
    for (const invalido of ["", "sin-arroba.ec", "@epn.edu.ec", "a@@epn.ec", "a@b@c.ec", "a@epn", "a@.ec", "a@epn.", "a b@epn.ec"]) {
      expect(() => validarCliente({ ...ANA, correoInstitucional: invalido })).toThrow(formato);
    }
    // Entrada diseñada para provocar retroceso: debe resolverse al instante.
    const inicio = performance.now();
    expect(() => validarCliente({ ...ANA, correoInstitucional: "a@" + "b.".repeat(50_000) + "@" })).toThrow(formato);
    expect(performance.now() - inicio).toBeLessThan(100);
  });

  it("los errores de negocio conservan su tipo y nombre", () => {
    const e = new CantidadInvalidaError("x");
    expect(e).toBeInstanceOf(ReglaNegocioError);
    expect(e.name).toBe("CantidadInvalidaError");
  });
});

describe("Código de retiro (SUP-03)", () => {
  it("tiene 6 caracteres del alfabeto sin I, O, 0 ni 1 y casi no se repite", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const c = generarCodigoRetiro();
      expect(c).toMatch(FORMATO_CODIGO_RETIRO);
      vistos.add(c);
    }
    expect(vistos.size).toBeGreaterThan(2990);
    expect(ALFABETO).not.toMatch(/[IO01]/);
  });

  it("descarta bytes que sesgarían el alfabeto", () => {
    let llamada = 0;
    const fuente = (a: Uint8Array) => a.fill(llamada++ === 0 ? 250 : 0);
    expect(generarCodigoRetiro(fuente)).toBe("AAAAAA");
  });
});
