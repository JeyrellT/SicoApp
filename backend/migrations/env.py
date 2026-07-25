"""Entorno de Alembic. La URL sale de la configuración, nunca del .ini."""

from __future__ import annotations

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.db import Base
from app.models import auth as _auth  # noqa: F401  (registra las tablas en el metadata)
from app.models import ops as _ops  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata


def incluir_objeto(objeto, nombre, tipo, reflejado, comparado) -> bool:  # noqa: ANN001
    """El esquema 'sicop' lo administra app/etl/ddl.py, no Alembic."""
    if tipo == "table" and getattr(objeto, "schema", None) == "sicop":
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        include_schemas=True,
        include_object=incluir_objeto,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_object=incluir_objeto,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
