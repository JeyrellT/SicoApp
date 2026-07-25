"""Pruebas de hashing, política de contraseñas y tokens."""

from __future__ import annotations

import time

import pytest

from app.security import (
    PasswordDebil,
    TokenInvalido,
    crear_token,
    decodificar_token,
    generar_password_segura,
    hash_password,
    hash_refresh,
    validar_password,
    verificar_password,
)


def test_hash_no_es_reversible_ni_repetible():
    pwd = "Contrasena-Muy-Segura-2026!"
    h1 = hash_password(pwd)
    h2 = hash_password(pwd)
    assert pwd not in h1
    assert h1 != h2, "cada hash debe llevar su propia sal"
    assert h1.startswith("$argon2id$")


def test_verificar_password_acepta_la_correcta_y_rechaza_la_incorrecta():
    pwd = "Contrasena-Muy-Segura-2026!"
    h = hash_password(pwd)
    ok, _ = verificar_password(pwd, h)
    assert ok
    malo, _ = verificar_password(pwd + "x", h)
    assert not malo


def test_verificar_password_no_revienta_con_hash_corrupto():
    ok, nuevo = verificar_password("cualquiera", "no-es-un-hash")
    assert ok is False and nuevo is None


@pytest.mark.parametrize(
    "password",
    [
        "corta1!A",                 # menos de 12
        "password",                 # común y corta
        "todominusculas12345",      # solo dos clases de caracteres
        "SOLOMAYUSCULAS12345",
    ],
)
def test_politica_rechaza_contrasenas_debiles(password):
    with pytest.raises(PasswordDebil):
        validar_password(password)


def test_politica_acepta_contrasena_fuerte():
    validar_password("Sicop-2026-Analitica!")


def test_password_generada_cumple_la_politica():
    for _ in range(20):
        validar_password(generar_password_segura())


def test_token_de_acceso_lleva_sujeto_y_perfil():
    token, jti, exp = crear_token("abc-123", "access", perfil="analista")
    payload = decodificar_token(token, tipo_esperado="access")
    assert payload["sub"] == "abc-123"
    assert payload["perfil"] == "analista"
    assert payload["jti"] == jti
    assert payload["tipo"] == "access"


def test_token_de_refresh_no_sirve_como_token_de_acceso():
    token, _, _ = crear_token("abc-123", "refresh")
    with pytest.raises(TokenInvalido):
        decodificar_token(token, tipo_esperado="access")


def test_token_alterado_es_rechazado():
    token, _, _ = crear_token("abc-123", "access")
    cuerpo = token.split(".")
    alterado = f"{cuerpo[0]}.{cuerpo[1]}.{'x' * len(cuerpo[2])}"
    with pytest.raises(TokenInvalido):
        decodificar_token(alterado)


def test_token_expirado_es_rechazado(monkeypatch):
    from app.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "access_token_ttl_min", -1)
    token, _, _ = crear_token("abc-123", "access")
    time.sleep(0.01)
    with pytest.raises(TokenInvalido):
        decodificar_token(token)


def test_refresh_se_guarda_hasheado():
    token, _, _ = crear_token("abc-123", "refresh")
    h = hash_refresh(token)
    assert token not in h
    assert len(h) == 64
    assert h == hash_refresh(token), "el hash debe ser determinista para poder buscarlo"
