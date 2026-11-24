#!/bin/bash
# Arranca todos los servicios del sistema dentro de un solo contenedor (ver Dockerfile).
# Orden: PostgreSQL → GoTrue y Storage (crean sus esquemas) → migraciones y menú de ejemplo
# (solo la primera vez) → PostgREST → cuentas de demostración → Next.js → enrutador :3000.
set -euo pipefail

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
export ANON_KEY SERVICE_KEY
PUBLICO="http://localhost:3000"
PW="$POSTGRES_PASSWORD"
DB_HOST="127.0.0.1:5432/postgres"
MARCA="/var/lib/postgresql/data/.cafeteria-lista"

log() { echo "[cafeteria] $*"; }

esperar() { # esperar <nombre> <comando...>
  local nombre="$1"; shift
  for _ in $(seq 1 180); do
    if "$@" >/dev/null 2>&1; then log "✔ $nombre listo"; return 0; fi
    sleep 1
  done
  log "✖ $nombre no respondió a tiempo"; exit 1
}

pids=()
terminar() {
  log "Deteniendo servicios…"
  kill -TERM "${pids[@]}" 2>/dev/null || true
  wait || true
}
trap terminar TERM INT

# 1. PostgreSQL (la primera vez, la imagen de Supabase crea roles y esquemas auth/storage)
log "Iniciando PostgreSQL…"
docker-entrypoint.sh postgres -D /etc/postgresql &
pids+=($!)
esperar "PostgreSQL" psql "postgresql://postgres:$PW@$DB_HOST" -tAc "select 1"

# 2. GoTrue (inicio de sesión)
env -i PATH="$PATH" \
  GOTRUE_API_HOST=127.0.0.1 GOTRUE_API_PORT=9999 \
  API_EXTERNAL_URL="$PUBLICO/auth/v1" GOTRUE_SITE_URL="$PUBLICO" GOTRUE_URI_ALLOW_LIST="$PUBLICO" \
  GOTRUE_DB_DRIVER=postgres GOTRUE_DB_DATABASE_URL="postgresql://supabase_auth_admin:$PW@$DB_HOST" \
  GOTRUE_DB_MIGRATIONS_PATH=/usr/local/etc/auth/migrations \
  GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP="$JWT_EXP" GOTRUE_JWT_AUD=authenticated \
  GOTRUE_JWT_ISSUER="$PUBLICO/auth/v1" GOTRUE_JWT_ADMIN_ROLES=service_role \
  GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
  GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=true \
  GOTRUE_EXTERNAL_PHONE_ENABLED=false GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED=false \
  GOTRUE_PASSWORD_MIN_LENGTH=8 GOTRUE_RATE_LIMIT_EMAIL_SENT=360000 \
  GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED=true GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL=10 \
  GOTRUE_LOG_LEVEL=warn \
  auth &
pids+=($!)

# 3. Storage API (fotos de productos, guardadas en /var/lib/storage)
(cd /opt/storage && env -i PATH="$PATH" NODE_ENV=production \
  SERVER_HOST=127.0.0.1 SERVER_PORT=5000 \
  DATABASE_URL="postgresql://supabase_storage_admin:$PW@$DB_HOST" \
  AUTH_JWT_SECRET="$JWT_SECRET" ANON_KEY="$ANON_KEY" SERVICE_KEY="$SERVICE_KEY" \
  STORAGE_BACKEND=file FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
  TENANT_ID=stub GLOBAL_S3_BUCKET=stub STORAGE_S3_REGION=local REGION=local \
  FILE_SIZE_LIMIT=52428800 ENABLE_IMAGE_TRANSFORMATION=false IMAGE_TRANSFORMATION_ENABLED=false \
  S3_PROTOCOL_ENABLED=false VECTOR_ENABLED=false LOG_LEVEL=warn \
  node dist/start/server.js) &
pids+=($!)

esperar "GoTrue" curl -fsS http://127.0.0.1:9999/health
esperar "Storage" curl -fsS http://127.0.0.1:5000/status

# 4. Esquema del sistema y menú de ejemplo (solo en el primer arranque)
if [ ! -f "$MARCA" ]; then
  for sql in /opt/cafeteria/migrations/*.sql; do
    log "Migración $(basename "$sql")"
    psql "postgresql://postgres:$PW@$DB_HOST" -v ON_ERROR_STOP=1 -q -f "$sql"
  done
  log "Cargando menú de ejemplo"
  psql "postgresql://postgres:$PW@$DB_HOST" -v ON_ERROR_STOP=1 -q -f /opt/cafeteria/seed.sql
fi

# 5. PostgREST (API de datos)
env -i PATH="$PATH" \
  PGRST_DB_URI="postgresql://authenticator:$PW@$DB_HOST" \
  PGRST_DB_SCHEMAS=public,graphql_public PGRST_DB_EXTRA_SEARCH_PATH=public,extensions \
  PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$JWT_SECRET" PGRST_DB_MAX_ROWS=1000 \
  PGRST_SERVER_HOST=127.0.0.1 PGRST_SERVER_PORT=3002 PGRST_ADMIN_SERVER_PORT=3003 \
  PGRST_LOG_LEVEL=warn \
  postgrest &
pids+=($!)
esperar "PostgREST" curl -fsS http://127.0.0.1:3003/ready

# 6. Cuentas de demostración (solo en el primer arranque)
if [ ! -f "$MARCA" ]; then
  node /opt/cafeteria/cuentas-demo.mjs
  touch "$MARCA"
fi

# 7. Aplicación Next.js y enrutador público
(cd /opt/web && env -i PATH="$PATH" NODE_ENV=production HOSTNAME=127.0.0.1 PORT=3001 \
  NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_SUPABASE_URL="$PUBLICO" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
  node server.js) &
pids+=($!)
node /opt/cafeteria/enrutador.mjs &
pids+=($!)
esperar "Aplicación" curl -fsS http://127.0.0.1:3000/

cat <<'EOF'

  ☕ Cafetería Universitaria lista en http://localhost:3000

     Cliente:   cliente@cafeteria.local / ClienteDemo2026
     Personal:  cajero@cafeteria.local  / MostradorSeguro2026

EOF

# Si cualquier servicio se cae, se detiene el contenedor completo.
set +e
wait -n "${pids[@]}"
estado=$?
log "Un servicio terminó (código $estado); deteniendo el contenedor."
terminar
exit "$estado"
