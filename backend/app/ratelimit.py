"""Límites de tasa.

Doble propósito: frenar fuerza bruta contra el login y acotar el gasto de CPU
que un cliente puede provocar en los endpoints analíticos.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


def ip_real(request: Request) -> str:
    """IP del cliente detrás del proxy de Railway.

    Se toma el ÚLTIMO valor de X-Forwarded-For, no el primero. El proxy agrega
    su observación al final; el principio de la cadena lo escribe el cliente y
    puede inventarlo. Leer el primero permitiría rotar la IP en cada petición
    con un simple encabezado y anular todos los límites de golpe.
    """
    reenviado = request.headers.get("x-forwarded-for", "")
    if reenviado:
        ultimo = reenviado.split(",")[-1].strip()
        if ultimo:
            return ultimo
    return get_remote_address(request)


def _clave(request: Request) -> str:
    """Usa el usuario autenticado si existe; si no, la IP."""
    usuario_id = getattr(request.state, "usuario_id", None)
    if usuario_id:
        return f"user:{usuario_id}"
    return f"ip:{ip_real(request)}"


# En pruebas el límite se apaga: decenas de casos comparten la misma IP y se
# agotarían entre sí. La prueba tests/test_rate_limit.py lo enciende a propósito.
limiter = Limiter(
    key_func=_clave,
    headers_enabled=True,
    enabled=get_settings().entorno != "test",
)

LIMITE_LOGIN = "10/minute"
LIMITE_REGISTRO = "5/hour"
LIMITE_REFRESH = "30/minute"
LIMITE_CONSULTA = "120/minute"
LIMITE_PESADO = "20/minute"
