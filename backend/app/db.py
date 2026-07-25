"""Motor y sesiones de SQLAlchemy.

Pool deliberadamente chico: en Railway se paga la RAM por GB/mes y cada conexión
de Postgres cuesta memoria en el servidor.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def crear_engine(
    url: str | None = None,
    statement_timeout_ms: int | None = None,
    application_name: str = "sicop-api",
    pool_size: int | None = None,
    idle_tx_timeout_ms: int = 60_000,
    lock_timeout_ms: int = 0,
) -> Engine:
    s = get_settings()
    timeout = s.db_statement_timeout_ms if statement_timeout_ms is None else statement_timeout_ms
    # idle_in_transaction_session_timeout es lo que evita que una sesión colgada de
    # la API bloquee el TRUNCATE de particiones del ETL: el ETL necesita bloqueo
    # exclusivo y una transacción abierta y ociosa lo dejaría esperando para siempre.
    opciones = (
        f"-c statement_timeout={timeout} "
        f"-c idle_in_transaction_session_timeout={idle_tx_timeout_ms} "
        f"-c lock_timeout={lock_timeout_ms}"
    )
    return create_engine(
        url or s.database_url,
        pool_size=pool_size if pool_size is not None else s.db_pool_size,
        max_overflow=s.db_max_overflow,
        pool_pre_ping=True,        # Railway recicla conexiones ociosas
        pool_recycle=1800,
        future=True,
        connect_args={"application_name": application_name, "options": opciones},
    )


engine = crear_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

_engine_etl: Engine | None = None


def engine_etl() -> Engine:
    """Motor del ETL: sin límite de sentencia.

    El tope de 25 s que protege a la API cancelaría el COPY del millón de filas
    de invitaciones. Son cargas de trabajo distintas y necesitan límites distintos.
    """
    global _engine_etl
    if _engine_etl is None:
        _engine_etl = crear_engine(
            statement_timeout_ms=0,
            application_name="sicop-etl",
            pool_size=1,
            idle_tx_timeout_ms=0,
            # Si una consulta de la API todavía tiene tomada una partición, es
            # mejor fallar en 2 minutos y reintentar mañana que colgar la corrida.
            lock_timeout_ms=120_000,
        )
    return _engine_etl


@event.listens_for(Engine, "connect")
def _configurar_conexion(dbapi_conn, _record):
    """Zona horaria fija: los periodos yyyymm dependen de la fecha local de Costa Rica."""
    with dbapi_conn.cursor() as cur:
        cur.execute("SET TIME ZONE 'UTC'")


def get_db() -> Iterator[Session]:
    """Dependencia de FastAPI. Cierra siempre, hace rollback ante excepción."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
