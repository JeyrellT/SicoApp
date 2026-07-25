"""Punto de entrada de la API SICOP."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app import __version__
from app.api.routers import (
    administracion,
    autenticacion,
    catalogo,
    dashboard,
    instituciones,
    procedimientos,
    proveedores,
    salud,
)
from app.config import get_settings
from app.db import SessionLocal, engine
from app.logging_setup import configurar_logging
from app.ratelimit import limiter

log = logging.getLogger(__name__)


@asynccontextmanager
async def ciclo_vida(app: FastAPI):
    s = get_settings()
    configurar_logging(s.log_level, literales=s.secretos())
    log.info("Iniciando API SICOP v%s en entorno %s", __version__, s.entorno)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        log.info("Conexión a PostgreSQL verificada.")
    except Exception:
        log.exception("No se pudo conectar a la base de datos al arrancar.")
        raise

    # La siembra es idempotente: crea perfiles base y el administrador si no existen.
    try:
        from app.services.semilla import sembrar

        with SessionLocal() as db:
            sembrar(db)
    except Exception:
        log.exception("Falló la siembra inicial de perfiles/usuario administrador.")
        raise

    yield
    engine.dispose()
    log.info("API detenida.")


def crear_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="API SICOP — Observatorio de Compra Pública",
        version=__version__,
        summary="Consulta de los últimos 24 meses de contratación pública de Costa Rica.",
        description=(
            "Sirve datos agregados y paginados desde PostgreSQL. Reemplaza la descarga "
            "manual de los ZIP mensuales del Observatorio: el backend los ingiere a diario."
        ),
        default_response_class=ORJSONResponse,
        lifespan=ciclo_vida,
        # En producción la documentación interactiva queda cerrada: publica la
        # superficie completa de /v1/admin a cualquiera que pase por la URL.
        docs_url=None if s.es_prod else "/docs",
        redoc_url=None,
        openapi_url=None if s.es_prod else "/openapi.json",
    )

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    # Comprime respuestas JSON: el egress en Railway se cobra por GB.
    app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=6)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "If-None-Match"],
        expose_headers=["ETag", "X-Total-Count"],
        max_age=3600,
    )

    @app.middleware("http")
    async def cabeceras_seguridad(request: Request, call_next):
        respuesta = await call_next(request)
        respuesta.headers["X-Content-Type-Options"] = "nosniff"
        respuesta.headers["Referrer-Policy"] = "no-referrer"
        respuesta.headers["X-Frame-Options"] = "DENY"
        if s.es_prod:
            respuesta.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return respuesta

    @app.exception_handler(RateLimitExceeded)
    async def _limite(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detalle": "Demasiadas solicitudes. Intente de nuevo en unos momentos."},
        )

    for r in (
        salud.router,
        autenticacion.router,
        dashboard.router,
        catalogo.router,
        procedimientos.router,
        proveedores.router,
        instituciones.router,
        administracion.router,
    ):
        app.include_router(r)

    return app


app = crear_app()
