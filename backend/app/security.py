"""Hash de contraseñas (Argon2id) y emisión/verificación de tokens JWT."""

from __future__ import annotations

import hashlib
import re
import secrets
import threading
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from argon2.low_level import Type

from app.config import get_settings

# Parámetros OWASP para Argon2id (m=19 MiB, t=2, p=1): seguros y compatibles con
# un contenedor chico, donde el default de 64 MiB por hash sería un riesgo de OOM.
_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=19_456,
    parallelism=1,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

# Contraseñas triviales rechazadas aunque cumplan longitud.
_PROHIBIDAS = {
    "password", "contrasena", "contraseña", "123456789012", "administrador",
    "qwertyuiop12", "sicop1234567", "admin1234567", "1234567890ab",
}


class PasswordDebil(ValueError):
    """La contraseña no cumple la política mínima."""


def validar_password(password: str) -> None:
    """Política mínima. Se aplica en registro y en cambio de contraseña."""
    s = get_settings()
    if len(password) < s.password_min_len:
        raise PasswordDebil(f"La contraseña debe tener al menos {s.password_min_len} caracteres.")
    if password.lower() in _PROHIBIDAS:
        raise PasswordDebil("La contraseña es demasiado común.")
    clases = sum(
        bool(re.search(p, password))
        for p in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]")
    )
    if clases < 3:
        raise PasswordDebil(
            "La contraseña debe combinar al menos tres de: minúsculas, mayúsculas, dígitos y símbolos."
        )


# Argon2id reserva 19 MiB por operación. FastAPI ejecuta los endpoints síncronos
# en un pool de ~40 hilos, así que sin este cerrojo un atacante podría forzar
# 40 por 19 MiB (unos 760 MB) de memoria simultánea y tumbar el contenedor con puros
# intentos de login. Cuatro en paralelo acotan el pico a ~76 MB; el resto espera.
_MAX_HASH_CONCURRENTE = 4
_cerrojo_hash = threading.Semaphore(_MAX_HASH_CONCURRENTE)


def hash_password(password: str) -> str:
    with _cerrojo_hash:
        return _hasher.hash(password)


def verificar_password(password: str, hash_almacenado: str) -> tuple[bool, str | None]:
    """Devuelve (válida, hash_actualizado). El rehash ocurre si cambian los parámetros."""
    with _cerrojo_hash:
        try:
            _hasher.verify(hash_almacenado, password)
        except (VerifyMismatchError, InvalidHashError, ValueError):
            return False, None
        nuevo = _hasher.hash(password) if _hasher.check_needs_rehash(hash_almacenado) else None
    return True, nuevo


def generar_password_segura(n: int = 20) -> str:
    """Para semilla del administrador: nunca una contraseña fija en el código."""
    alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?"
    while True:
        pwd = "".join(secrets.choice(alfabeto) for _ in range(n))
        try:
            validar_password(pwd)
            return pwd
        except PasswordDebil:
            continue


TipoToken = Literal["access", "refresh"]


def crear_token(
    sub: str,
    tipo: TipoToken,
    perfil: str | None = None,
    extra: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Devuelve (token, jti, expiración)."""
    s = get_settings()
    ahora = datetime.now(UTC)
    ttl = (
        timedelta(minutes=s.access_token_ttl_min)
        if tipo == "access"
        else timedelta(days=s.refresh_token_ttl_days)
    )
    exp = ahora + ttl
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": sub,
        "tipo": tipo,
        "jti": jti,
        "iat": int(ahora.timestamp()),
        "exp": int(exp.timestamp()),
    }
    if perfil:
        payload["perfil"] = perfil
    if extra:
        payload.update(extra)
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_alg), jti, exp


class TokenInvalido(Exception):
    pass


def decodificar_token(token: str, tipo_esperado: TipoToken | None = None) -> dict[str, Any]:
    s = get_settings()
    try:
        payload = jwt.decode(
            token,
            s.jwt_secret,
            algorithms=[s.jwt_alg],
            options={"require": ["exp", "iat", "sub", "jti"]},
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenInvalido("El token expiró.") from e
    except jwt.InvalidTokenError as e:
        raise TokenInvalido("Token inválido.") from e
    if tipo_esperado and payload.get("tipo") != tipo_esperado:
        raise TokenInvalido("Tipo de token incorrecto.")
    return payload


def hash_refresh(token: str) -> str:
    """El refresh token se guarda hasheado: si se filtra la tabla no se puede reusar."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
