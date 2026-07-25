"""Endpoints de autenticación y de la cuenta propia."""

from __future__ import annotations

from datetime import UTC

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.deps import DB, UsuarioActual
from app.config import get_settings
from app.models.auth import PERFIL_CONSULTA, Perfil, Preferencias
from app.ratelimit import LIMITE_LOGIN, LIMITE_REFRESH, LIMITE_REGISTRO, limiter
from app.schemas.auth import (
    CambioPasswordIn,
    LoginIn,
    PerfilOut,
    PreferenciasIn,
    PreferenciasOut,
    RefreshIn,
    RegistroIn,
    TokenOut,
    UsuarioOut,
)
from app.services import usuarios as svc

router = APIRouter(prefix="/v1/auth", tags=["autenticación"])


@router.post("/registro", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(LIMITE_REGISTRO)
def registro(request: Request, response: Response, datos: RegistroIn, db: DB) -> TokenOut:
    """Alta pública. Deshabilitada por defecto: en producción las cuentas las crea un administrador."""
    if not get_settings().registro_abierto:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El registro público está deshabilitado. Solicite una cuenta al administrador.",
        )
    usuario, _ = svc.crear_usuario(
        db,
        email=datos.email,
        nombre=datos.nombre,
        password=datos.password,
        organizacion=datos.organizacion,
        perfil_codigo=PERFIL_CONSULTA,
    )
    access, refresh, ttl = svc.emitir_tokens(db, usuario, request.headers.get("user-agent"))
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=ttl,
        usuario=UsuarioOut.model_validate(usuario),
    )


@router.post("/login", response_model=TokenOut)
@limiter.limit(LIMITE_LOGIN)
def login(request: Request, response: Response, datos: LoginIn, db: DB) -> TokenOut:
    usuario = svc.autenticar(db, datos.email, datos.password)
    access, refresh, ttl = svc.emitir_tokens(db, usuario, request.headers.get("user-agent"))
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=ttl,
        usuario=UsuarioOut.model_validate(usuario),
    )


@router.post("/refresh", response_model=TokenOut)
@limiter.limit(LIMITE_REFRESH)
def refrescar(request: Request, response: Response, datos: RefreshIn, db: DB) -> TokenOut:
    usuario, access, refresh, ttl = svc.rotar_refresh(
        db, datos.refresh_token, request.headers.get("user-agent")
    )
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=ttl,
        usuario=UsuarioOut.model_validate(usuario),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(datos: RefreshIn, db: DB) -> Response:
    svc.revocar_sesion(db, datos.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/yo", response_model=UsuarioOut)
def yo(usuario: UsuarioActual) -> UsuarioOut:
    return UsuarioOut.model_validate(usuario)


@router.post("/cambiar-password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_password(datos: CambioPasswordIn, usuario: UsuarioActual, db: DB) -> Response:
    svc.cambiar_password(db, usuario, datos.password_actual, datos.password_nueva)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/perfiles", response_model=list[PerfilOut])
def listar_perfiles(db: DB, _: UsuarioActual) -> list[PerfilOut]:
    """Catálogo de perfiles disponibles con sus permisos y límites."""
    perfiles = db.scalars(select(Perfil).order_by(Perfil.id)).all()
    return [PerfilOut.model_validate(p) for p in perfiles]


@router.get("/preferencias", response_model=PreferenciasOut)
def obtener_preferencias(usuario: UsuarioActual, db: DB) -> PreferenciasOut:
    pref = db.get(Preferencias, usuario.id)
    if pref is None:
        pref = Preferencias(usuario_id=usuario.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return PreferenciasOut.model_validate(pref)


@router.put("/preferencias", response_model=PreferenciasOut)
def guardar_preferencias(datos: PreferenciasIn, usuario: UsuarioActual, db: DB) -> PreferenciasOut:
    from datetime import datetime

    pref = db.get(Preferencias, usuario.id)
    if pref is None:
        pref = Preferencias(usuario_id=usuario.id)
        db.add(pref)
    pref.filtros_guardados = datos.filtros_guardados
    pref.instituciones_seguidas = datos.instituciones_seguidas
    pref.proveedores_seguidos = datos.proveedores_seguidos
    pref.config_dashboard = datos.config_dashboard
    pref.actualizado_en = datetime.now(UTC)
    db.commit()
    db.refresh(pref)
    return PreferenciasOut.model_validate(pref)
