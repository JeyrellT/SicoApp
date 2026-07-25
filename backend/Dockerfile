# Imagen única para los dos servicios de Railway: la API web y el cron del ETL.
# Cambia solo el comando de arranque, así no hay dos builds ni dos árboles de deps.
#
# El contexto de build es esta carpeta (backend/), no la raíz del repositorio:
# en Railway hay que fijar Root Directory = backend en cada servicio.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TZ=America/Costa_Rica

WORKDIR /app

# Sin compiladores ni utilidades extra: psycopg y argon2-cffi vienen en wheels
# binarios, y el healthcheck se hace con el propio Python en vez de instalar curl.
# Se instala desde el lock completo (directas + transitivas) para que el
# contenido de la imagen sea reproducible entre builds.
COPY requirements.txt requirements.lock.txt ./
RUN pip install --no-cache-dir -r requirements.lock.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Usuario sin privilegios, y sin ser dueño de su propio código.
RUN useradd --create-home --uid 10001 sicop \
    && chown -R root:root /app \
    && chmod -R a+rX /app \
    && chmod a+x /app/entrypoint.sh
USER sicop

EXPOSE 8000

# Railway usa healthcheckPath de railway.json; esto cubre ejecuciones locales.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/salud/vivo').read()" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["api"]
