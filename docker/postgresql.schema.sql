-- Se ejecuta una sola vez, al crear la base dentro del contenedor (lo llama migrate.sh de la
-- imagen de Supabase). Asigna las contraseñas de los roles que usan GoTrue, PostgREST y Storage,
-- igual que la CLI de Supabase en desarrollo.
\set pgpass `echo "$POSTGRES_PASSWORD"`
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';

ALTER USER postgres WITH PASSWORD :'pgpass';
ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
