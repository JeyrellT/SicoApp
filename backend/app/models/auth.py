"""Perfiles, usuarios, sesiones y preferencias.

El "perfil" es el rol del usuario dentro de la app: define qué puede consultar y
con qué límites. Los límites no son solo seguridad, también controlan el costo:
un perfil de consulta no puede pedir páginas gigantes ni tablas de detalle.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ESQUEMA = "auth"

# Códigos de perfil sembrados por la migración inicial.
PERFIL_ADMIN = "admin"
PERFIL_ANALISTA = "analista"
PERFIL_CONSULTA = "consulta"

# Permisos atómicos.
P_CONSULTAR = "consultar"      # dashboards y agregados
P_DETALLE = "detalle"          # filas de detalle (líneas, invitaciones)
P_EXPORTAR = "exportar"        # descarga de resultados
P_ADMIN = "admin"              # gestión de usuarios y ejecución del ETL


class Perfil(Base):
    __tablename__ = "perfiles"
    __table_args__ = {"schema": ESQUEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    permisos: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    # Techos por perfil: acotan el costo de cómputo y de egress.
    limite_page_size: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("50"))
    limite_consultas_dia: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("2000")
    )
    meses_historia: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("24"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    usuarios: Mapped[list[Usuario]] = relationship(back_populates="perfil")

    def tiene(self, permiso: str) -> bool:
        return permiso in (self.permisos or [])


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = ({"schema": ESQUEMA},)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    organizacion: Mapped[str | None] = mapped_column(String(160))
    hash_password: Mapped[str] = mapped_column(Text, nullable=False)
    perfil_id: Mapped[int] = mapped_column(
        ForeignKey(f"{ESQUEMA}.perfiles.id", ondelete="RESTRICT"), nullable=False
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    debe_cambiar_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    intentos_fallidos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    perfil: Mapped[Perfil] = relationship(back_populates="usuarios", lazy="joined")
    preferencias: Mapped[Preferencias | None] = relationship(
        back_populates="usuario", uselist=False, cascade="all, delete-orphan"
    )


class Sesion(Base):
    """Refresh tokens vigentes. Se guarda solo el hash: si se filtra la tabla, no sirven."""

    __tablename__ = "sesiones"
    __table_args__ = (
        UniqueConstraint("refresh_hash", name="uq_sesiones_refresh"),
        {"schema": ESQUEMA},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(f"{ESQUEMA}.usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    refresh_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    jti: Mapped[str] = mapped_column(String(32), nullable=False)
    emitido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revocado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(300))

    @property
    def vigente(self) -> bool:

        return self.revocado_en is None and self.expira_en > datetime.now(UTC)


class Preferencias(Base):
    """Configuración por usuario: filtros guardados y entidades seguidas."""

    __tablename__ = "preferencias"
    __table_args__ = {"schema": ESQUEMA}

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(f"{ESQUEMA}.usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    filtros_guardados: Mapped[list[dict]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    instituciones_seguidas: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    proveedores_seguidos: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    config_dashboard: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    usuario: Mapped[Usuario] = relationship(back_populates="preferencias")
