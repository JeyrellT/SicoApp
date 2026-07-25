"""Bitácora de operación del ETL.

Cada corrida deja una fila. De acá salen la idempotencia (comparación de ETag),
el endpoint de salud y la respuesta a "¿de cuándo son estos datos?".
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

ESQUEMA = "ops"

ESTADO_PARCIAL = "parcial"  # mes en curso, sigue cambiando a diario
ESTADO_FINAL = "final"      # mes cerrado, descarga definitiva


class Carga(Base):
    __tablename__ = "cargas"
    __table_args__ = {"schema": ESQUEMA}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    periodo: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    etag: Mapped[str | None] = mapped_column(String(128))
    last_modified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    bytes_zip: Mapped[int | None] = mapped_column(BigInteger)
    sha256: Mapped[str | None] = mapped_column(String(64))
    filas_total: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("0"))
    estado: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'parcial'"))
    exito: Mapped[bool] = mapped_column(nullable=False, server_default=text("true"))
    error: Mapped[str | None] = mapped_column(Text)
    duracion_s: Mapped[int | None] = mapped_column(Integer)
    iniciado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finalizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EstadoTabla(Base):
    """Filas cargadas por tabla y periodo: sirve para detectar tablas que llegan vacías."""

    __tablename__ = "estado_tabla"
    __table_args__ = {"schema": ESQUEMA}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    carga_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    periodo: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tabla: Mapped[str] = mapped_column(String(64), nullable=False)
    filas: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("0"))
    filas_malas: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("0"))
    registrado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
