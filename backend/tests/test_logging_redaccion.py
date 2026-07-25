"""Regresión: ningún secreto puede salir literal en los logs.

Regla del estándar de entrega. Se prueba con secretos falsos, nunca reales.
"""

from __future__ import annotations

import json
import logging

import pytest

from app.logging_setup import MASCARA, FiltroRedaccion, configurar_logging, redactar

SECRETO = "sK-falso-de-prueba-9f8e7d6c5b4a3210"
URL_CON_CLAVE = "postgresql://usuario:PasswordSuperSecreta123@host.railway.internal:5432/railway"


def test_redacta_literales_configurados():
    salida = redactar(f"conectando con clave {SECRETO} lista", literales=[SECRETO])
    assert SECRETO not in salida
    assert MASCARA in salida


def test_redacta_password_dentro_de_url_de_conexion():
    salida = redactar(URL_CON_CLAVE)
    assert "PasswordSuperSecreta123" not in salida
    assert "host.railway.internal" in salida, "solo se enmascara la credencial, no el host"


def test_redacta_encabezado_bearer():
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.firmafalsaparaprueba"
    salida = redactar(f"Authorization: Bearer {token}")
    assert token not in salida


def test_redacta_pares_clave_valor():
    for texto in (
        'password="MiClaveEnClaro99"',
        "api_key=abcdef123456789",
        "token: 'zzzsecretozzz'",
    ):
        salida = redactar(texto)
        assert "MiClaveEnClaro99" not in salida
        assert "abcdef123456789" not in salida
        assert "zzzsecretozzz" not in salida


def test_texto_sin_secretos_no_se_altera():
    texto = "Periodo 202607 cargado: 1116687 filas en 240.5 s"
    assert redactar(texto) == texto


def test_filtro_aplica_sobre_mensaje_y_argumentos(caplog):
    filtro = FiltroRedaccion([SECRETO])
    registro = logging.LogRecord(
        name="prueba",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="conexion %s con %s",
        args=(URL_CON_CLAVE, SECRETO),
        exc_info=None,
    )
    filtro.filter(registro)
    texto = registro.getMessage()
    assert SECRETO not in texto
    assert "PasswordSuperSecreta123" not in texto


def test_el_logger_configurado_no_emite_el_secreto(capsys):
    configurar_logging("INFO", literales=[SECRETO])
    log = logging.getLogger("prueba.redaccion")
    log.info("intento de fuga: %s y url %s", SECRETO, URL_CON_CLAVE)

    salida = capsys.readouterr().out
    assert SECRETO not in salida
    assert "PasswordSuperSecreta123" not in salida
    # La salida sigue siendo JSON parseable.
    assert json.loads(salida.strip().splitlines()[-1])["nivel"] == "INFO"


def test_el_filtro_no_rompe_los_formatos_numericos():
    """Convertir los argumentos a texto rompía '%d' y tumbaba el log de accesos."""
    filtro = FiltroRedaccion([SECRETO])
    registro = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("127.0.0.1:50714", "POST", "/v1/auth/login", "1.1", 422),
        exc_info=None,
    )
    assert filtro.filter(registro) is True
    assert registro.getMessage().endswith("422"), "el código de estado debe seguir formateándose"


def test_el_filtro_redacta_argumentos_de_texto_y_respeta_los_demas():
    filtro = FiltroRedaccion([SECRETO])
    registro = logging.LogRecord(
        name="prueba", level=logging.INFO, pathname=__file__, lineno=1,
        msg="clave=%s intentos=%d ratio=%.2f",
        args=(SECRETO, 3, 0.5), exc_info=None,
    )
    filtro.filter(registro)
    mensaje = registro.getMessage()
    assert SECRETO not in mensaje
    assert "intentos=3" in mensaje
    assert "ratio=0.50" in mensaje


def test_el_filtro_nunca_rompe_el_logging():
    """Un objeto que falla al convertirse a texto no puede tumbar la aplicación."""

    class Explosivo:
        def __str__(self):
            raise RuntimeError("boom")

    filtro = FiltroRedaccion([SECRETO])
    registro = logging.LogRecord(
        name="prueba", level=logging.INFO, pathname=__file__, lineno=1,
        msg=Explosivo(), args=None, exc_info=None,
    )
    assert filtro.filter(registro) is True


@pytest.mark.parametrize("vacio", ["", None])
def test_redactar_tolera_entradas_vacias(vacio):
    assert redactar(vacio or "") == ""
