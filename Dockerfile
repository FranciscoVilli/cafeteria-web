# syntax=docker/dockerfile:1
#
# Imagen "todo en uno" del Sistema de Pedidos de la Cafetería.
#
# Contiene, en un solo contenedor, lo mismo que levanta `supabase start` en desarrollo:
#   PostgreSQL 17 (imagen oficial de Supabase) · GoTrue (inicio de sesión) · PostgREST (API)
#   · Storage API (fotos) · la aplicación Next.js · un enrutador que lo publica todo en :3000.
#
# Uso:
#   docker build -t cafeteria-web .
#   docker run --name cafeteria -p 3000:3000 cafeteria-web
#   → abrir http://localhost:3000
#
# Cuentas de demostración (se crean en el primer arranque):
#   Cliente:  cliente@cafeteria.local / ClienteDemo2026
#   Personal: cajero@cafeteria.local  / MostradorSeguro2026
#
# Las claves internas son las de demostración de Supabase: la imagen es para evaluar el
# sistema en una computadora local, no para exponerla en internet.

ARG SUPABASE_POSTGRES=public.ecr.aws/supabase/postgres:17.11.0.006
ARG SUPABASE_AUTH=public.ecr.aws/supabase/gotrue:v2.197.0
ARG SUPABASE_REST=public.ecr.aws/supabase/postgrest:v16.5
ARG SUPABASE_STORAGE=public.ecr.aws/supabase/storage-api:v1.84.19

FROM ${SUPABASE_AUTH} AS auth
FROM ${SUPABASE_REST} AS rest
FROM ${SUPABASE_STORAGE} AS storage

# ---------- 1. Compilación de la aplicación Next.js ----------
FROM node:24-alpine AS compilacion
WORKDIR /src
COPY package.json package-lock.json ./
# --ignore-scripts: evita descargar el binario de la CLI de Supabase (solo se usa en desarrollo).
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
# La app, el inicio de sesión, la API y las fotos se sirven desde el mismo origen.
ENV NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000 \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0 \
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 2. Imagen final ----------
FROM ${SUPABASE_POSTGRES}

# Node.js (el mismo de Storage API) y sus bibliotecas; ambas imágenes son Alpine 3.23.
COPY --from=storage /usr/local/bin/node /usr/local/bin/node
COPY --from=storage /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6.0.34 /usr/lib/libgcc_s.so.1 /usr/lib/

COPY --from=auth /usr/local/bin/auth /usr/local/bin/auth
COPY --from=auth /usr/local/etc/auth /usr/local/etc/auth
COPY --from=rest /bin/postgrest /usr/local/bin/postgrest
COPY --from=storage /app /opt/storage

COPY --from=compilacion /src/.next/standalone /opt/web
COPY --from=compilacion /src/.next/static /opt/web/.next/static
COPY --from=compilacion /src/public /opt/web/public
COPY supabase/migrations /opt/cafeteria/migrations
COPY supabase/seed.sql /opt/cafeteria/seed.sql
COPY docker/ /opt/cafeteria/

# Roles y claves que espera cada servicio (lo mismo que hace la CLI de Supabase).
RUN cp /opt/cafeteria/postgresql.schema.sql /etc/postgresql.schema.sql \
 && chmod +x /opt/cafeteria/iniciar.sh \
 && mkdir -p /var/lib/storage && chown postgres /var/lib/storage

ENV POSTGRES_PASSWORD=postgres \
    JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long \
    JWT_EXP=3600 \
    NODE_ENV=production

# Base de datos y fotos persisten entre reinicios del contenedor.
VOLUME ["/var/lib/postgresql/data", "/var/lib/storage"]
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/ >/dev/null || exit 1

ENTRYPOINT ["/opt/cafeteria/iniciar.sh"]
