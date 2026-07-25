#!/bin/sh
# Punto de entrada compartido. Primer argumento: api | etl | backfill | migrar.
set -eu

migrar() {
    if [ "${EJECUTAR_MIGRACIONES:-1}" = "1" ]; then
        echo "Aplicando migraciones..."
        alembic upgrade head
    else
        echo "EJECUTAR_MIGRACIONES=0: se omiten las migraciones."
    fi
}

case "${1:-api}" in
    api)
        migrar
        # Un solo worker: la RAM se paga por GB/mes y la carga es de lectura con caché.
        exec uvicorn app.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers "${WEB_CONCURRENCY:-1}" \
            --proxy-headers \
            --forwarded-allow-ips='*' \
            --no-access-log
        ;;
    etl)
        migrar
        exec python -m app.etl.run diario
        ;;
    backfill)
        migrar
        exec python -m app.etl.run backfill
        ;;
    migrar)
        migrar
        ;;
    *)
        exec "$@"
        ;;
esac
