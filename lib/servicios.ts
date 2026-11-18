/**
 * Composición de dependencias: arma los servicios de aplicación con los repositorios de
 * Supabase. Es el único lugar que conoce ambas capas.
 *
 * @module servicios
 */
import "server-only";
import { ClienteServicio } from "@/lib/aplicacion/cliente-servicio";
import { MenuServicio } from "@/lib/aplicacion/menu-servicio";
import { PedidoServicio } from "@/lib/aplicacion/pedido-servicio";
import { generarCodigoRetiro } from "@/lib/dominio/codigo-retiro";
import { crearClienteAdmin } from "@/lib/infraestructura/supabase/clientes";
import {
  ClientesSupabase,
  CuentasSupabase,
  PedidosSupabase,
  ProductosSupabase,
} from "@/lib/infraestructura/supabase/repositorios";

/** Servicios listos para usar en Server Components y Server Actions. */
export function servicios() {
  const db = crearClienteAdmin();
  const productos = new ProductosSupabase(db);
  const clientes = new ClientesSupabase(db);
  return {
    menu: new MenuServicio(productos),
    clientes: new ClienteServicio(clientes, new CuentasSupabase(db)),
    pedidos: new PedidoServicio({
      pedidos: new PedidosSupabase(db),
      productos,
      clientes,
      generarCodigo: () => generarCodigoRetiro(),
    }),
  };
}
