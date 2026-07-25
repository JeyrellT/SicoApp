"""Lógica de negocio de cuentas: alta, login con bloqueo, rotación de refresh tokens."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.auth import PERFIL_CONSULTA, Perfil, Preferencias, Sesion, Usuario
from app.security import (
    PasswordDebil,
    crear_token,
    generar_password_segura,
    hash_password,
    hash_refresh,
    validar_password,
    verificar_password,
)

log = logging.getLogger(__name__)


def _ahora() -> datetime:
    return datetime.now(UTC)


def obtener_perfil(db: Session, codigo: str) -> Perfil:
    perfil = db.scalar(select(Perfil).where(Perfil.codigo == codigo))
    if perfil is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"El perfil '{codigo}' no existe."
        )
    return perfil


def crear_usuario(
    db: Session,
    *,
    email: str,
    nombre: str,
    password: str | None,
    perfil_codigo: str = PERFIL_CONSULTA,
    organizacion: str | None = None,
    debe_cambiar: bool = False,
) -> tuple[Usuario, str | None]:
    """Crea la cuenta. Si no se da contraseña genera una temporal fuerte de un solo uso."""
    email = email.strip().lower()
    if db.scalar(select(Usuario.id).where(Usuario.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con ese correo."
        )

    temporal: str | None = None
    if password is None:
        password = generar_password_segura()
        temporal = password
        debe_cambiar = True
    try:
        validar_password(password)
    except PasswordDebil as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e

    perfil = obtener_perfil(db, perfil_codigo)
    usuario = Usuario(
        email=email,
        nombre=nombre.strip(),
        organizacion=(organizacion or None),
        hash_password=hash_password(password),
        perfil_id=perfil.id,
        debe_cambiar_password=debe_cambiar,
    )
    db.add(usuario)
    try:
        db.flush()
        db.add(Preferencias(usuario_id=usuario.id))
        db.commit()
    except IntegrityError as e:
        # El índice único sobre lower(email) es la garantía real; el SELECT
        # previo solo evita el caso común. Dos altas simultáneas llegan acá.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo.",
        ) from e
    db.refresh(usuario)
    log.info("Usuario creado id=%s perfil=%s", usuario.id, perfil.codigo)
    return usuario, temporal


def autenticar(db: Session, email: str, password: str) -> Usuario:
    """Verifica credenciales aplicando bloqueo temporal por intentos fallidos."""
    s = get_settings()
    email = email.strip().lower()
    usuario = db.scalar(select(Usuario).where(Usuario.email == email))

    generico = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos."
    )
    if usuario is None:
        # Se gasta un hash igual para no revelar por tiempo si el correo existe.
        hash_password(password)
        raise generico

    if usuario.bloqueado_hasta and usuario.bloqueado_hasta > _ahora():
        # Se devuelve el MISMO error genérico que para un correo inexistente.
        # Un mensaje de "cuenta bloqueada" confirmaría que la cuenta existe:
        # cinco intentos bastarían para enumerar usuarios, y bastaría con
        # fallar cinco veces cada quince minutos para dejar a un administrador
        # permanentemente fuera de su propia aplicación.
        log.info("Intento de ingreso sobre cuenta bloqueada id=%s", usuario.id)
        raise generico

    ok, rehash = verificar_password(password, usuario.hash_password)
    if not ok:
        usuario.intentos_fallidos += 1
        if usuario.intentos_fallidos >= s.max_intentos_login:
            usuario.bloqueado_hasta = _ahora() + timedelta(minutes=s.bloqueo_login_min)
            usuario.intentos_fallidos = 0
            log.warning("Cuenta bloqueada por intentos fallidos id=%s", usuario.id)
        db.commit()
        raise generico

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="La cuenta está desactivada."
        )

    if rehash:
        usuario.hash_password = rehash
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    usuario.ultimo_acceso = _ahora()
    db.commit()
    db.refresh(usuario)
    return usuario


def emitir_tokens(db: Session, usuario: Usuario, user_agent: str | None = None) -> tuple[str, str, int]:
    """Devuelve (access, refresh, segundos_de_vida_del_access)."""
    s = get_settings()
    access, _, _ = crear_token(str(usuario.id), "access", perfil=usuario.perfil.codigo)
    refresh, jti, exp = crear_token(str(usuario.id), "refresh")
    db.add(
        Sesion(
            usuario_id=usuario.id,
            refresh_hash=hash_refresh(refresh),
            jti=jti,
            expira_en=exp,
            user_agent=(user_agent or "")[:300] or None,
        )
    )
    db.commit()
    return access, refresh, s.access_token_ttl_min * 60


def rotar_refresh(db: Session, refresh_token: str, user_agent: str | None = None):
    """Canjea un refresh token por uno nuevo y revoca el anterior (rotación)."""
    from app.security import TokenInvalido, decodificar_token

    try:
        payload = decodificar_token(refresh_token, tipo_esperado="refresh")
    except TokenInvalido as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e

    sesion = db.scalar(select(Sesion).where(Sesion.refresh_hash == hash_refresh(refresh_token)))
    if sesion is None or not sesion.vigente:
        # Firma válida pero el token ya fue rotado o revocado. El caso típico es
        # un token robado que se usa después de que la víctima ya lo renovó, así
        # que no basta con rechazarlo: se cierran TODAS las sesiones del usuario
        # para expulsar también a quien tenga el token vigente.
        if sesion is not None:
            revocadas = revocar_todas(db, sesion.usuario_id)
            log.warning(
                "Reuso de refresh token detectado para el usuario %s; "
                "se revocaron %d sesiones.",
                sesion.usuario_id,
                revocadas,
            )
        else:
            log.warning("Intento de refresh con token desconocido sub=%s", payload.get("sub"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="La sesión ya no es válida."
        )

    usuario = db.get(Usuario, sesion.usuario_id)
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="La cuenta no está activa."
        )

    sesion.revocado_en = _ahora()
    db.commit()
    access, nuevo_refresh, ttl = emitir_tokens(db, usuario, user_agent)
    return usuario, access, nuevo_refresh, ttl


def revocar_sesion(db: Session, refresh_token: str) -> None:
    sesion = db.scalar(select(Sesion).where(Sesion.refresh_hash == hash_refresh(refresh_token)))
    if sesion is not None and sesion.revocado_en is None:
        sesion.revocado_en = _ahora()
        db.commit()


def revocar_todas(db: Session, usuario_id) -> int:
    sesiones = db.scalars(
        select(Sesion).where(Sesion.usuario_id == usuario_id, Sesion.revocado_en.is_(None))
    ).all()
    for s_ in sesiones:
        s_.revocado_en = _ahora()
    db.commit()
    return len(sesiones)


def purgar_sesiones_vencidas(db: Session) -> int:
    """Borra sesiones expiradas o revocadas. La corre el ETL diario.

    Sin esto la tabla crece sin techo dentro del mismo volumen que paga el ETL:
    cada renovación de token inserta una fila y ninguna se borraba nunca.
    """
    from sqlalchemy import delete, or_

    resultado = db.execute(
        delete(Sesion).where(
            or_(
                Sesion.expira_en < _ahora(),
                Sesion.revocado_en.is_not(None),
            )
        )
    )
    db.commit()
    return resultado.rowcount or 0


def cambiar_password(db: Session, usuario: Usuario, actual: str, nueva: str) -> None:
    ok, _ = verificar_password(actual, usuario.hash_password)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no coincide."
        )
    if actual == nueva:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña nueva debe ser distinta de la actual.",
        )
    try:
        validar_password(nueva)
    except PasswordDebil as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e

    usuario.hash_password = hash_password(nueva)
    usuario.debe_cambiar_password = False
    usuario.actualizado_en = _ahora()
    db.commit()
    # Cambiar la contraseña cierra las demás sesiones.
    revocar_todas(db, usuario.id)
