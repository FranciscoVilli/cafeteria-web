-- =============================================================================
-- Postres y fotos de productos
--  * Nueva categoría POSTRE (cambio a SUP-13).
--  * Descripción corta y foto por producto (se muestran en el menú).
--  * Bucket público «productos» en Supabase Storage para las fotos que sube el personal.
-- =============================================================================

alter table public.producto drop constraint producto_categoria_check;
alter table public.producto
  add constraint producto_categoria_check check (categoria in ('ALIMENTO', 'BEBIDA', 'POSTRE'));

alter table public.producto
  add column descripcion text not null default ''
    constraint producto_descripcion_check check (length(descripcion) <= 200),
  add column imagen_url text
    constraint producto_imagen_url_check check (
      imagen_url is null
      or (length(imagen_url) <= 500 and (imagen_url ~ '^https?://' or imagen_url ~ '^/[A-Za-z0-9/_.-]+$'))
    );

-- Bucket de fotos: lectura pública (son fotos del menú); solo el servidor sube archivos.
-- Se omite donde no existe Supabase Storage (por ejemplo, en las pruebas con PGlite).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('productos', 'productos', true, 3145728, array['image/webp'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;
