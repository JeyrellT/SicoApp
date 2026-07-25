"""El límite de tasa protege el login de fuerza bruta y acota el gasto de CPU.

En el resto de la suite está apagado (decenas de pruebas comparten IP); acá se
enciende a propósito para verificar que realmente corta.
"""

from __future__ import annotations

import pytest

from app.ratelimit import limiter


@pytest.fixture
def limite_encendido():
    limiter.enabled = True
    limiter.reset()
    try:
        yield
    finally:
        limiter.enabled = False
        limiter.reset()


def test_el_login_se_corta_tras_diez_intentos_por_minuto(client, limite_encendido):
    cuerpo = {"email": "inexistente@prueba.cr", "password": "LoQueSea-2026!"}

    codigos = [client.post("/v1/auth/login", json=cuerpo).status_code for _ in range(12)]

    assert codigos[0] == 401, "los primeros intentos se procesan normalmente"
    assert 429 in codigos, "tras el décimo intento debe cortar por límite de tasa"
    assert codigos.count(429) >= 2, "una vez alcanzado el límite se mantiene"


def test_la_respuesta_de_limite_explica_en_espanol(client, limite_encendido):
    cuerpo = {"email": "otro@prueba.cr", "password": "LoQueSea-2026!"}
    for _ in range(11):
        r = client.post("/v1/auth/login", json=cuerpo)
    assert r.status_code == 429
    assert "detalle" in r.json()
    assert "solicitudes" in r.json()["detalle"].lower()


def test_apagado_el_limite_no_interfiere(client):
    """Con el límite apagado (como en el resto de la suite) nada devuelve 429."""
    cuerpo = {"email": "tercero@prueba.cr", "password": "LoQueSea-2026!"}
    codigos = {client.post("/v1/auth/login", json=cuerpo).status_code for _ in range(15)}
    assert codigos == {401}
