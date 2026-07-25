"""Configuración del backend.

Todo se lee de variables de entorno. No hay valores por defecto para secretos:
si falta JWT_SECRET el proceso no arranca, en lugar de correr con una clave conocida.
"""

from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Plantilla publicada por el Observatorio de Compra Pública para descarga programática.
SICOP_ZIP_URL = (
    "https://dlsaobservatorioprod.blob.core.windows.net"
    "/fs-synapse-observatorio-produccion/Zip/{periodo}.zip"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    entorno: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "INFO"
    tz: str = "America/Costa_Rica"

    # --- Base de datos -----------------------------------------------------
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/sicop"
    db_pool_size: int = 3
    db_max_overflow: int = 2
    db_statement_timeout_ms: int = 25_000

    # --- Seguridad ---------------------------------------------------------
    jwt_secret: str = Field(min_length=32)
    jwt_alg: str = "HS256"
    access_token_ttl_min: int = 60
    refresh_token_ttl_days: int = 14
    password_min_len: int = 12
    max_intentos_login: int = 5
    bloqueo_login_min: int = 15

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # Semilla del administrador inicial. Si no se define contraseña se genera una
    # aleatoria y se imprime una sola vez: nunca se hornea una contraseña en el código.
    #
    # El dominio NO puede ser .local, .test, .example ni .invalid: son de uso
    # reservado y el validador de correos los rechaza, así que el administrador
    # sembrado no podría iniciar sesión nunca.
    admin_email: str = "admin@sicop.cr"
    admin_password: str | None = None

    # Registro público abierto o solo por invitación del administrador.
    registro_abierto: bool = False

    # --- ETL ---------------------------------------------------------------
    sicop_zip_url: str = SICOP_ZIP_URL
    retention_months: int = 24
    etl_max_zip_bytes: int = 500_000_000
    etl_http_timeout_s: int = 900
    etl_tmp_dir: str | None = None
    etl_habilitado: bool = True

    # Guardar o no el detalle fila a fila de las invitaciones.
    #
    # Es la decisión de costo más importante del sistema: esa tabla sola es el
    # 70 % del volumen (medido: 128 MB de 182 MB en un mes). Con detalle, 24
    # meses ocupan ~3.8 GB y el volumen de 5 GB del plan Hobby queda sin margen;
    # sin detalle, ~1.3 GB.
    #
    # El agregado por procedimiento (cuántos proveedores fueron invitados) SIEMPRE
    # se calcula, así que los indicadores de competencia no se pierden. Lo que se
    # deja de poder responder es "qué proveedores exactos fueron invitados al
    # procedimiento X" para meses viejos.
    #
    # Poner en true solo con volumen de 10 GB o más (plan Pro).
    etl_invitaciones_detalle: bool = False

    @field_validator("database_url")
    @classmethod
    def _normalizar_driver(cls, v: str) -> str:
        """Railway entrega postgresql://; SQLAlchemy 2 + psycopg3 requiere el driver explícito."""
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://") :]
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def es_prod(self) -> bool:
        return self.entorno == "prod"

    def secretos(self) -> list[str]:
        """Valores que jamás deben aparecer literales en un log."""
        vals = [self.jwt_secret]
        if self.admin_password:
            vals.append(self.admin_password)
        # Contraseña embebida en la URL de conexión.
        if "@" in self.database_url and "://" in self.database_url:
            cred = self.database_url.split("://", 1)[1].split("@", 1)[0]
            if ":" in cred:
                pwd = cred.split(":", 1)[1]
                if pwd:
                    vals.append(pwd)
        return [v for v in vals if v]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def generar_secreto() -> str:
    """Ayuda para operación: genera un JWT_SECRET válido."""
    return secrets.token_urlsafe(48)
