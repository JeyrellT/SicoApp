"""Cabeceras de caché.

Los datos cambian una vez al día. Dejar que el navegador y los proxies reutilicen
la respuesta es la forma más barata de bajar CPU y egress: una petición que
termina en 304 no cuesta ni consulta ni ancho de banda.
"""

from __future__ import annotations

import hashlib
from datetime import datetime

from fastapi import Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

SEGUNDOS_CACHE = 1800  # 30 minutos


def sello_datos(db: Session) -> str:
    """Marca de versión de los datos: cambia solo cuando el ETL carga algo."""
    fila = db.execute(
        text(
            "SELECT COALESCE(MAX(finalizado_en), MAX(iniciado_en)), COUNT(*) "
            "FROM ops.cargas WHERE exito"
        )
    ).first()
    if not fila or fila[0] is None:
        return "sin-datos"
    marca: datetime = fila[0]
    return f"{marca.isoformat()}:{fila[1]}"


def aplicar(
    request: Request,
    response: Response,
    db: Session,
    extra: str = "",
    usuario=None,
) -> bool:
    """Pone ETag y Cache-Control. Devuelve True si el cliente ya tiene la versión buena.

    El perfil entra en la clave: la respuesta depende de cuántos meses de historia
    puede ver el usuario, así que sin él una degradación de permisos no invalidaría
    la caché y el navegador seguiría mostrando datos que ya no le corresponden.
    """
    perfil = ""
    if usuario is not None and getattr(usuario, "perfil", None) is not None:
        perfil = f"{usuario.perfil.codigo}:{usuario.perfil.meses_historia}"
    base = f"{sello_datos(db)}|{request.url.path}?{request.url.query}|{perfil}|{extra}"
    etag = 'W/"' + hashlib.sha256(base.encode("utf-8")).hexdigest()[:32] + '"'
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = f"private, max-age={SEGUNDOS_CACHE}"

    if request.headers.get("if-none-match") == etag:
        response.status_code = 304
        return True
    return False
