"""Esquema inicial: auth, ops y el esquema de datos sicop.

Las tablas de auth y ops se crean desde el metadata de SQLAlchemy. El esquema
sicop (dimensiones, hechos particionados y agregados) lo genera app/etl/ddl.py a
partir de las declaraciones, para que DDL y ETL no puedan divergir.

Revision ID: 0001_inicial
Revises:
"""

from __future__ import annotations

from alembic import op

revision = "0001_inicial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    op.execute("CREATE SCHEMA IF NOT EXISTS ops")
    op.execute("CREATE SCHEMA IF NOT EXISTS sicop")

    from app.db import Base
    from app.models import auth as _auth  # noqa: F401
    from app.models import ops as _ops  # noqa: F401

    Base.metadata.create_all(bind=conn)

    # Correos únicos sin distinguir mayúsculas.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email "
        "ON auth.usuarios (lower(email))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cargas_periodo_fecha "
        "ON ops.cargas (periodo, iniciado_en DESC)"
    )

    from app.etl.ddl import crear_esquema
    from app.etl.tablas import TABLAS

    crear_esquema(conn, TABLAS)


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS sicop CASCADE")
    op.execute("DROP SCHEMA IF EXISTS ops CASCADE")
    op.execute("DROP SCHEMA IF EXISTS auth CASCADE")
