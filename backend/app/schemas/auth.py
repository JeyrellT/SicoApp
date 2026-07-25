"""Esquemas de autenticación, perfiles y preferencias."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PerfilOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    descripcion: str | None = None
    permisos: list[str] = Field(default_factory=list)
    limite_page_size: int
    limite_consultas_dia: int
    meses_historia: int


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    nombre: str
    organizacion: str | None = None
    activo: bool
    debe_cambiar_password: bool
    ultimo_acceso: datetime | None = None
    creado_en: datetime
    perfil: PerfilOut


class RegistroIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    nombre: str = Field(min_length=2, max_length=120)
    organizacion: str | None = Field(default=None, max_length=160)
    password: str = Field(min_length=12, max_length=200)


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioOut


class RefreshIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=10, max_length=4000)


class CambioPasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    password_actual: str = Field(min_length=1, max_length=200)
    password_nueva: str = Field(min_length=12, max_length=200)


class PreferenciasIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    filtros_guardados: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    instituciones_seguidas: list[str] = Field(default_factory=list, max_length=200)
    proveedores_seguidos: list[str] = Field(default_factory=list, max_length=200)
    config_dashboard: dict[str, Any] = Field(default_factory=dict)


class PreferenciasOut(PreferenciasIn):
    model_config = ConfigDict(from_attributes=True)

    actualizado_en: datetime | None = None


class UsuarioCrearIn(BaseModel):
    """Alta de usuario por un administrador."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    nombre: str = Field(min_length=2, max_length=120)
    organizacion: str | None = Field(default=None, max_length=160)
    perfil_codigo: str = Field(min_length=2, max_length=32)
    password: str | None = Field(
        default=None,
        min_length=12,
        max_length=200,
        description="Si se omite se genera una contraseña temporal fuerte de un solo uso.",
    )


class UsuarioCreadoOut(BaseModel):
    usuario: UsuarioOut
    password_temporal: str | None = Field(
        default=None,
        description="Se muestra una única vez. El usuario debe cambiarla al ingresar.",
    )


class UsuarioActualizarIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    organizacion: str | None = Field(default=None, max_length=160)
    perfil_codigo: str | None = Field(default=None, min_length=2, max_length=32)
    activo: bool | None = None
