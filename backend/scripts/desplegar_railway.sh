#!/usr/bin/env bash
# Despliegue del backend SICOP en Railway.
#
# Requiere estar autenticado ANTES de correrlo:
#     railway login                 (interactivo, abre el navegador)
#   o export RAILWAY_TOKEN=<project-token>
#
# Uso:  ./scripts/desplegar_railway.sh <dominio-del-frontend>
# Ej.:  ./scripts/desplegar_railway.sh https://jeyrellt.github.io
set -euo pipefail

FRONTEND="${1:-}"
if [ -z "$FRONTEND" ]; then
    echo "Uso: $0 <url-del-frontend>   (ej. https://jeyrellt.github.io)" >&2
    exit 2
fi

# El contexto de build es backend/: el Dockerfile copia rutas relativas a esa
# carpeta. En Railway hay que fijar Root Directory = backend para el servicio.
BACKEND="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BACKEND"

paso() { printf "\n=== %s\n" "$1"; }

paso "Verificando autenticación"
if ! railway whoami >/dev/null 2>&1; then
    echo "La CLI de Railway no está autenticada." >&2
    echo "Corré 'railway login' o exportá RAILWAY_TOKEN y volvé a intentar." >&2
    exit 1
fi
railway whoami

paso "Gate de seguridad: auditoría de dependencias"
python -m pip_audit -r requirements.txt

paso "Gate de calidad: pruebas unitarias"
python -m pytest -q -m "not integracion"

paso "Creando proyecto y base de datos (omitido si ya existen)"
railway init --name sicop 2>/dev/null || echo "  proyecto ya existente, se continúa"
railway add --database postgres 2>/dev/null || echo "  Postgres ya existente, se continúa"

paso "Servicio api"
railway add --service api 2>/dev/null || echo "  servicio api ya existente"

# El JWT_SECRET se genera UNA sola vez. Regenerarlo en cada despliegue cerraría
# la sesión de todos los usuarios sin aviso. Si ya existe, se respeta.
if railway variables --service api 2>/dev/null | grep -q "JWT_SECRET"; then
    echo "  JWT_SECRET ya existe, se conserva (regenerarlo cerraría todas las sesiones)"
else
    echo "  generando JWT_SECRET por primera vez"
    railway variables --service api \
        --set "JWT_SECRET=$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
fi

# ADMIN_EMAIL y ADMIN_PASSWORD se piden explícitamente: en producción el sistema
# se niega a arrancar sin contraseña de administrador en vez de generar una y
# escribirla en el log, donde la vería cualquiera con acceso al proyecto.
if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo "" >&2
    echo "Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno." >&2
    echo "Generá una contraseña fuerte y volvé a correr:" >&2
    echo "" >&2
    echo "  export ADMIN_EMAIL=gerencia@jcanalytic.com" >&2
    echo "  export ADMIN_PASSWORD=\"\$(python -c 'from app.security import generar_password_segura; print(generar_password_segura())')\"" >&2
    echo "" >&2
    exit 1
fi

railway variables --service api \
    --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
    --set "ENTORNO=prod" \
    --set "CORS_ORIGINS=${FRONTEND}" \
    --set "ADMIN_EMAIL=${ADMIN_EMAIL}" \
    --set "ADMIN_PASSWORD=${ADMIN_PASSWORD}" \
    --set "RETENTION_MONTHS=24" \
    --set "TZ=America/Costa_Rica" \
    --set "LOG_LEVEL=INFO"

railway up --service api --detach

paso "Servicio etl (cron diario 14:00 UTC = 08:00 CR)"
railway add --service etl 2>/dev/null || echo "  servicio etl ya existente"
railway variables --service etl \
    --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
    --set 'JWT_SECRET=${{api.JWT_SECRET}}' \
    --set "ENTORNO=prod" \
    --set "TZ=America/Costa_Rica" \
    --set "RAILWAY_CONFIG_PATH=railway.etl.json"

railway up --service etl --detach

paso "Dominio público"
railway domain --service api || true

cat <<'FIN'

Listo. Falta la carga inicial de los 24 meses (30-90 min, ~900 MB de descarga):

    railway run --service etl -- python -m app.etl.run backfill

Y verificar:

    curl -s https://<dominio>/salud/datos

La contraseña temporal del administrador aparece UNA sola vez en el log del primer
arranque de la API (railway logs --service api). Cambiala al ingresar.
FIN
