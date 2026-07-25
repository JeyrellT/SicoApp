"""Dependencias de FastAPI: sesión de base, usuario autenticado y control de permisos."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.auth import P_ADMIN, P_DETALLE, Usuario
from app.schemas.comunes import PAGE_SIZE_MAX_ABSOLUTO
from app.security import TokenInvalido, decodificar_token

esquema_bearer = HTTPBearer(auto_error=False, description="Token JWT de acceso")

DB = Annotated[Session, Depends(get_db)]


# Rutas que un usuario obligado a cambiar su contraseña todavía puede usar.
RUTAS_LIBRES_CAMBIO = ("/v1/auth/cambiar-password", "/v1/auth/yo", "/v1/auth/logout")


def usuario_actual(
    request: Request,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)],
    db: DB,
) -> Usuario:
    if cred is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decodificar_token(cred.credentials, tipo_esperado="access")
    except TokenInvalido as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    try:
        uid = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.") from e

    usuario = db.get(Usuario, uid)
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta no está activa."
        )

    # El límite de tasa prefiere la identidad del usuario sobre la IP; sin esto
    # todos los límites colapsan a por-IP, que el cliente puede rotar.
    request.state.usuario_id = str(usuario.id)

    # Una contraseña temporal no debe servir para nada más que cambiarla. Si no
    # se bloquea acá, el indicador queda decorativo y la contraseña provisional
    # funciona indefinidamente.
    if usuario.debe_cambiar_password and request.url.path not in RUTAS_LIBRES_CAMBIO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debe cambiar su contraseña temporal antes de usar la aplicación.",
        )
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def requiere_permiso(permiso: str):
    """Fábrica de dependencias: exige un permiso del perfil del usuario."""

    def _dep(usuario: UsuarioActual) -> Usuario:
        if not usuario.perfil.tiene(permiso):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El perfil '{usuario.perfil.codigo}' no tiene el permiso '{permiso}'.",
            )
        return usuario

    return _dep


UsuarioAdmin = Annotated[Usuario, Depends(requiere_permiso(P_ADMIN))]
UsuarioDetalle = Annotated[Usuario, Depends(requiere_permiso(P_DETALLE))]


# Un OFFSET grande obliga a Postgres a recorrer y descartar todas las filas
# anteriores: pedir la página 10 000 es un escaneo completo disfrazado de consulta
# barata. Se acota el desplazamiento máximo; para ir más lejos hay que filtrar.
OFFSET_MAXIMO = 10_000


class Paginacion:
    """Paginación acotada por el perfil: un perfil de consulta no puede pedir páginas enormes."""

    def __init__(
        self,
        usuario: UsuarioActual,
        page: Annotated[int, Query(ge=1, le=10_000)] = 1,
        page_size: Annotated[int, Query(ge=1, le=PAGE_SIZE_MAX_ABSOLUTO)] = 25,
    ) -> None:
        techo = min(usuario.perfil.limite_page_size, PAGE_SIZE_MAX_ABSOLUTO)
        self.page = page
        self.page_size = min(page_size, techo)
        offset = (page - 1) * self.page_size
        if offset > OFFSET_MAXIMO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"La paginación no puede pasar de {OFFSET_MAXIMO} resultados. "
                    "Use filtros o búsqueda para acotar el listado."
                ),
            )
        self.offset = offset
        self.limit = self.page_size


Pag = Annotated[Paginacion, Depends(Paginacion)]


def usuario_por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.email == email.strip().lower()))
