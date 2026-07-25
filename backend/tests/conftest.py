"""Fixtures de prueba.

Las pruebas corren contra un PostgreSQL real: el esquema usa particiones, COPY y
tipos que SQLite no reproduce, así que probar contra otro motor no probaría nada.

Levantá un Postgres local y exportá TEST_DATABASE_URL, o dejá el valor por
defecto si usás el clúster de desarrollo del puerto 55432.
"""

from __future__ import annotations

import os
import uuid

# La configuración se lee al importar: las variables van antes de tocar app.*
os.environ.setdefault("ENTORNO", "test")
os.environ.setdefault("JWT_SECRET", "clave-de-prueba-no-usar-en-produccion-0123456789")
os.environ.setdefault("LOG_LEVEL", "WARNING")
os.environ.setdefault("REGISTRO_ABIERTO", "true")
os.environ.setdefault("ADMIN_PASSWORD", "Adm1n-Prueba-Segura!2026")

URL_BASE = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://postgres@127.0.0.1:55432/postgres"
)
BD_PRUEBA = os.environ.get("TEST_DATABASE_NAME", "sicop_test")

_url_prueba = URL_BASE.rsplit("/", 1)[0] + "/" + BD_PRUEBA
os.environ["DATABASE_URL"] = _url_prueba

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def _crear_base_si_falta() -> None:
    admin = create_engine(URL_BASE, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": BD_PRUEBA}
        ).scalar()
        if not existe:
            conn.execute(text(f'CREATE DATABASE "{BD_PRUEBA}"'))
    admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def base_de_datos():
    """Crea la base de prueba y el esquema completo una sola vez por sesión."""
    _crear_base_si_falta()

    from app.db import Base, engine
    from app.etl.ddl import crear_esquema
    from app.models import auth as _auth  # noqa: F401
    from app.models import ops as _ops  # noqa: F401

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS sicop CASCADE"))
        conn.execute(text("DROP SCHEMA IF EXISTS ops CASCADE"))
        conn.execute(text("DROP SCHEMA IF EXISTS auth CASCADE"))
        conn.execute(text("CREATE SCHEMA auth"))
        conn.execute(text("CREATE SCHEMA ops"))
        conn.execute(text("CREATE SCHEMA sicop"))
        Base.metadata.create_all(bind=conn)
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email "
                "ON auth.usuarios (lower(email))"
            )
        )
        try:
            from app.etl.tablas import TABLAS

            crear_esquema(conn, TABLAS)
        except ImportError:  # el módulo de tablas todavía no existe
            pass

    yield engine
    engine.dispose()


@pytest.fixture
def db(base_de_datos):
    """Sesión de base por prueba."""
    Session = sessionmaker(bind=base_de_datos, autoflush=False, future=True)
    s = Session()
    try:
        yield s
    finally:
        s.rollback()
        s.close()


@pytest.fixture(scope="session")
def perfiles_sembrados(base_de_datos):
    from app.db import SessionLocal
    from app.services.semilla import sembrar_perfiles

    with SessionLocal() as s:
        sembrar_perfiles(s)
    return True


@pytest.fixture
def client(base_de_datos, perfiles_sembrados):
    """Cliente HTTP contra la app real (sin el lifespan, que siembra y conecta)."""
    from app.main import crear_app

    app = crear_app()
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def crear_usuario(db):
    """Fábrica de usuarios de prueba con perfil configurable."""
    from app.services.usuarios import crear_usuario as _crear

    creados = []

    def _fabrica(perfil: str = "consulta", password: str = "Prueba-Segura-2026!", **kw):
        email = kw.pop("email", f"u{uuid.uuid4().hex[:10]}@prueba.cr")
        usuario, _ = _crear(
            db,
            email=email,
            nombre=kw.pop("nombre", "Usuario Prueba"),
            password=password,
            perfil_codigo=perfil,
            **kw,
        )
        creados.append(usuario)
        return usuario, password

    return _fabrica


@pytest.fixture
def token(client, crear_usuario):
    """Devuelve (headers, usuario) autenticado con el perfil pedido."""

    def _fabrica(perfil: str = "consulta"):
        usuario, password = crear_usuario(perfil=perfil)
        r = client.post("/v1/auth/login", json={"email": usuario.email, "password": password})
        assert r.status_code == 200, r.text
        datos = r.json()
        return {"Authorization": f"Bearer {datos['access_token']}"}, usuario

    return _fabrica


@pytest.fixture(scope="session")
def zip_muestra() -> str | None:
    """ZIP real de SICOP para pruebas de integración del ETL, si está disponible."""
    ruta = os.environ.get("SICOP_ZIP_PRUEBA")
    if ruta and os.path.exists(ruta):
        return ruta
    return None
