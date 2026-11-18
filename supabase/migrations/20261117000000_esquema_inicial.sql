-- =============================================================================
-- Sistema de Pedidos de la Cafetería Universitaria · esquema inicial (Release 1.0)
--
-- Las reglas de negocio se validan en la capa de dominio (TypeScript). Las restricciones
-- CHECK, UNIQUE y FOREIGN KEY de este archivo son la segunda línea de defensa: aunque una
-- validación del código fallara, la base impide datos inválidos.
--
-- Acceso: RLS activado en todas las tablas y sin políticas para anon/authenticated. Solo el
-- servidor (service_role) lee y escribe, después de verificar la sesión y el rol del usuario
-- en cada Server Action.
-- =============================================================================

-- ---------------------------------------------------------------------------- Perfiles
-- Rol de cada cuenta de acceso (SUP-15): cliente o personal de la cafetería.
create table public.perfil (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  rol        text not null check (rol in ('cliente', 'personal')),
  nombre     text not null check (length(btrim(nombre)) between 1 and 120),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------- Clientes
create sequence public.cliente_codigo_seq;

create table public.cliente (
  codigo               text primary key
                       default ('CLI-' || lpad(nextval('public.cliente_codigo_seq')::text, 3, '0')),
  usuario_id           uuid not null unique references auth.users (id) on delete restrict,
  nombre               text not null check (length(btrim(nombre)) between 1 and 60),
  apellido             text not null check (length(btrim(apellido)) between 1 and 60),
  cedula               text not null unique check (cedula ~ '^[0-9]{10}$'),
  celular              text not null check (celular ~ '^[0-9]{10}$'),
  correo_institucional text not null unique check (correo_institucional = lower(correo_institucional)
                                                   and correo_institucional ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  creado_en            timestamptz not null default now()
);
alter sequence public.cliente_codigo_seq owned by public.cliente.codigo;

-- ---------------------------------------------------------------------------- Productos
create table public.producto (
  codigo          text primary key check (codigo ~ '^[A-Z0-9][A-Z0-9-]{1,19}$'),
  nombre          text not null check (length(btrim(nombre)) between 1 and 80),
  categoria       text not null check (categoria in ('ALIMENTO', 'BEBIDA')),
  precio_centavos integer not null check (precio_centavos > 0),
  disponible      boolean not null default true,
  actualizado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------- Pedidos
create table public.pedido (
  id                     bigint generated always as identity primary key,
  codigo_retiro          text not null unique check (codigo_retiro ~ '^[A-HJ-NP-Z2-9]{6}$'),
  cliente_codigo         text not null references public.cliente (codigo),
  estado                 text not null default 'PENDIENTE'
                         check (estado in ('PENDIENTE', 'EN_PREPARACION', 'LISTO_PARA_RETIRAR', 'ENTREGADO')),
  fecha_registro         timestamptz not null default now(),
  importe_total_centavos integer not null check (importe_total_centavos > 0),
  actualizado_en         timestamptz not null default now()
);

create table public.detalle_pedido (
  pedido_id                bigint not null references public.pedido (id) on delete cascade,
  producto_codigo          text not null references public.producto (codigo),
  orden                    smallint not null,
  cantidad                 integer not null check (cantidad between 1 and 50),
  precio_unitario_centavos integer not null check (precio_unitario_centavos > 0),
  primary key (pedido_id, producto_codigo)
);

-- Bandeja del personal: filtro por estado y orden por llegada (HU-08, SUP-14).
create index idx_pedido_estado_fecha on public.pedido (estado, fecha_registro);
-- «Mis pedidos» del cliente, del más reciente al más antiguo (HU-05).
create index idx_pedido_cliente_fecha on public.pedido (cliente_codigo, fecha_registro desc);

-- ---------------------------------------------------------------------------- Funciones
-- Confirma un pedido: cabecera y líneas en UNA transacción (RNF-03). Si el código de retiro
-- ya existe, la restricción UNIQUE aborta todo y no queda un pedido parcial (RN-NEG-05).
-- p_detalles: [{"producto_codigo": "BEB-001", "cantidad": 2, "precio_unitario_centavos": 150}, ...]
create function public.crear_pedido(
  p_codigo_retiro  text,
  p_cliente_codigo text,
  p_fecha          timestamptz,
  p_detalles       jsonb
) returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id    bigint;
  v_total integer;
begin
  if p_detalles is null or jsonb_typeof(p_detalles) <> 'array' or jsonb_array_length(p_detalles) = 0 then
    raise exception 'El pedido debe tener al menos una línea' using errcode = '23514';
  end if;

  select sum((d ->> 'cantidad')::integer * (d ->> 'precio_unitario_centavos')::integer)
    into v_total
    from jsonb_array_elements(p_detalles) as d;

  insert into public.pedido (codigo_retiro, cliente_codigo, fecha_registro, importe_total_centavos)
  values (p_codigo_retiro, p_cliente_codigo, p_fecha, v_total)
  returning id into v_id;

  insert into public.detalle_pedido (pedido_id, producto_codigo, orden, cantidad, precio_unitario_centavos)
  select v_id, d.producto_codigo, d.orden::smallint, d.cantidad, d.precio_unitario_centavos
    from rows from (
           jsonb_to_recordset(p_detalles) as (producto_codigo text, cantidad integer, precio_unitario_centavos integer)
         ) with ordinality as d(producto_codigo, cantidad, precio_unitario_centavos, orden);

  return v_id;
end;
$$;

-- Registra un cliente y su perfil en UNA transacción. Devuelve el código asignado (CLI-001).
create function public.registrar_cliente(
  p_usuario_id uuid,
  p_nombre     text,
  p_apellido   text,
  p_cedula     text,
  p_celular    text,
  p_correo     text
) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_codigo text;
begin
  insert into public.perfil (usuario_id, rol, nombre)
  values (p_usuario_id, 'cliente', p_nombre || ' ' || p_apellido);

  insert into public.cliente (usuario_id, nombre, apellido, cedula, celular, correo_institucional)
  values (p_usuario_id, p_nombre, p_apellido, p_cedula, p_celular, p_correo)
  returning codigo into v_codigo;

  return v_codigo;
end;
$$;

-- Cantidad de pedidos por estado, para los indicadores de la bandeja.
create function public.contar_pedidos_por_estado()
returns table (estado text, cantidad bigint)
language sql
stable
set search_path = ''
as $$
  select p.estado, count(*) from public.pedido p group by p.estado;
$$;

-- Mantiene actualizado_en al día.
create function public.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger producto_actualizado before update on public.producto
  for each row execute function public.marcar_actualizado();
create trigger pedido_actualizado before update on public.pedido
  for each row execute function public.marcar_actualizado();

-- ---------------------------------------------------------------------------- Seguridad
alter table public.perfil         enable row level security;
alter table public.cliente        enable row level security;
alter table public.producto       enable row level security;
alter table public.pedido         enable row level security;
alter table public.detalle_pedido enable row level security;

revoke all on public.perfil, public.cliente, public.producto, public.pedido, public.detalle_pedido
  from anon, authenticated;
revoke all on sequence public.cliente_codigo_seq from anon, authenticated;

revoke execute on function public.crear_pedido(text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke execute on function public.registrar_cliente(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.contar_pedidos_por_estado() from public, anon, authenticated;
grant execute on function public.crear_pedido(text, text, timestamptz, jsonb) to service_role;
grant execute on function public.registrar_cliente(uuid, text, text, text, text, text) to service_role;
grant execute on function public.contar_pedidos_por_estado() to service_role;
