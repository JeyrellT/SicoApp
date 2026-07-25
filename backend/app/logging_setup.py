"""Logging estructurado con redacción obligatoria de secretos.

El estándar de entrega exige que ningún secreto aparezca literal en la salida,
verificado por un test de regresión (tests/test_logging_redaccion.py).
"""

from __future__ import annotations

import logging
import re
import sys
from collections.abc import Iterable

from pythonjsonlogger import json as jsonlogger

MASCARA = "***REDACTADO***"

# Patrones que se enmascaran aunque el valor concreto no esté en la configuración.
PATRONES: tuple[re.Pattern[str], ...] = (
    # Credenciales dentro de una URL de conexión: postgresql://user:secreto@host
    re.compile(r"(?P<pre>[a-zA-Z0-9+]+://[^:/\s]+:)(?P<sec>[^@/\s]+)(?P<post>@)"),
    # Bearer <token>
    re.compile(r"(?P<pre>[Bb]earer\s+)(?P<sec>[A-Za-z0-9._\-]{16,})(?P<post>)"),
    # JWT suelto (tres segmentos base64url)
    re.compile(r"(?P<pre>)(?P<sec>eyJ[A-Za-z0-9._\-]{20,})(?P<post>)"),
    # password=... / token=... / secret=... en query strings o kwargs
    re.compile(
        r"(?P<pre>(?:password|passwd|pwd|secret|token|api[_-]?key)[\"']?\s*[=:]\s*[\"']?)"
        r"(?P<sec>[^\s,;&\"']{4,})(?P<post>)",
        re.IGNORECASE,
    ),
)


def redactar(texto: str, literales: Iterable[str] = ()) -> str:
    """Enmascara secretos conocidos y patrones sensibles dentro de un texto."""
    if not texto:
        return texto
    for lit in literales:
        if lit and lit in texto:
            texto = texto.replace(lit, MASCARA)
    for patron in PATRONES:
        texto = patron.sub(lambda m: f"{m.group('pre')}{MASCARA}{m.group('post')}", texto)
    return texto


class FiltroRedaccion(logging.Filter):
    def __init__(self, literales: Iterable[str] = ()) -> None:
        super().__init__()
        self.literales = tuple(literales)

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = redactar(str(record.msg), self.literales)
            if record.args:
                # Solo se tocan los argumentos de texto. Convertir un entero a str
                # rompería un formato '%d' — así se caía el log de accesos de uvicorn,
                # que usa '%d' para el código de estado.
                if isinstance(record.args, dict):
                    record.args = {
                        k: (redactar(v, self.literales) if isinstance(v, str) else v)
                        for k, v in record.args.items()
                    }
                else:
                    record.args = tuple(
                        redactar(a, self.literales) if isinstance(a, str) else a
                        for a in record.args
                    )
            if record.exc_text:
                record.exc_text = redactar(record.exc_text, self.literales)
        except Exception:  # nunca romper el logging por culpa del filtro
            return True
        return True


def configurar_logging(nivel: str = "INFO", literales: Iterable[str] = ()) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"asctime": "ts", "levelname": "nivel", "name": "logger"},
        )
    )
    handler.addFilter(FiltroRedaccion(literales))

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(nivel.upper())

    # uvicorn duplica handlers si no se los limpia.
    for nombre in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(nombre)
        lg.handlers.clear()
        lg.propagate = True

    # SQLAlchemy en INFO imprime cada sentencia: ruido y riesgo de filtrar parámetros.
    logging.getLogger("sqlalchemy.engine").setLevel("WARNING")
