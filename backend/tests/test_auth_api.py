"""Ciclo completo de autenticación, perfiles y control de acceso."""

from __future__ import annotations

import pytest


def test_salud_vivo_no_requiere_autenticacion(client):
    r = client.get("/salud/vivo")
    assert r.status_code == 200
    assert r.json()["estado"] == "vivo"


def test_login_devuelve_tokens_y_perfil(client, crear_usuario):
    usuario, password = crear_usuario(perfil="analista")
    r = client.post("/v1/auth/login", json={"email": usuario.email, "password": password})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["token_type"] == "bearer"
    assert datos["expires_in"] > 0
    assert datos["usuario"]["email"] == usuario.email
    assert datos["usuario"]["perfil"]["codigo"] == "analista"
    assert "detalle" in datos["usuario"]["perfil"]["permisos"]
    assert "hash_password" not in str(datos), "el hash nunca se expone"


def test_login_con_password_incorrecta_no_revela_si_el_correo_existe(client, crear_usuario):
    usuario, _ = crear_usuario()
    r1 = client.post("/v1/auth/login", json={"email": usuario.email, "password": "Incorrecta-123!"})
    r2 = client.post(
        "/v1/auth/login", json={"email": "noexiste@prueba.cr", "password": "Incorrecta-123!"}
    )
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detail"] == r2.json()["detail"], "misma respuesta en ambos casos"


def test_cuenta_se_bloquea_tras_varios_intentos_fallidos(client, crear_usuario):
    usuario, password = crear_usuario()
    for _ in range(5):
        client.post("/v1/auth/login", json={"email": usuario.email, "password": "Mala-Clave-1!"})

    r = client.post("/v1/auth/login", json={"email": usuario.email, "password": password})
    assert r.status_code == 401, "ni siquiera la contraseña correcta entra mientras dura el bloqueo"


def test_el_bloqueo_no_revela_que_la_cuenta_existe(client, crear_usuario):
    """Un mensaje distinto durante el bloqueo permitiría enumerar cuentas con 5 intentos.

    Y peor: sabiendo el correo del administrador, cinco fallos cada quince minutos
    lo dejarían permanentemente fuera de su propia aplicación.
    """
    usuario, _ = crear_usuario()
    for _ in range(6):
        bloqueada = client.post(
            "/v1/auth/login", json={"email": usuario.email, "password": "Mala-Clave-1!"}
        )

    inexistente = client.post(
        "/v1/auth/login", json={"email": "jamas.existio@prueba.cr", "password": "Mala-Clave-1!"}
    )

    assert bloqueada.status_code == inexistente.status_code == 401
    assert bloqueada.json()["detail"] == inexistente.json()["detail"]
    assert "bloque" not in bloqueada.json()["detail"].lower()


def test_endpoint_protegido_rechaza_sin_token(client):
    assert client.get("/v1/auth/yo").status_code == 401


def test_endpoint_protegido_rechaza_token_basura(client):
    r = client.get("/v1/auth/yo", headers={"Authorization": "Bearer no-es-un-token"})
    assert r.status_code == 401


def test_yo_devuelve_el_usuario_autenticado(client, token):
    headers, usuario = token("analista")
    r = client.get("/v1/auth/yo", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == usuario.email


def test_refresh_rota_el_token_y_anula_el_anterior(client, crear_usuario):
    usuario, password = crear_usuario()
    login = client.post(
        "/v1/auth/login", json={"email": usuario.email, "password": password}
    ).json()

    r = client.post("/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r.status_code == 200
    nuevo = r.json()
    assert nuevo["refresh_token"] != login["refresh_token"]

    reuso = client.post("/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert reuso.status_code == 401, "un refresh usado no puede reutilizarse"


def test_logout_invalida_el_refresh(client, crear_usuario):
    usuario, password = crear_usuario()
    login = client.post(
        "/v1/auth/login", json={"email": usuario.email, "password": password}
    ).json()

    assert client.post("/v1/auth/logout", json={"refresh_token": login["refresh_token"]}).status_code == 204
    r = client.post("/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r.status_code == 401


def test_cambio_de_password_exige_la_actual(client, token):
    headers, _ = token()
    r = client.post(
        "/v1/auth/cambiar-password",
        headers=headers,
        json={"password_actual": "Equivocada-2026!", "password_nueva": "Nueva-Clave-Segura-26!"},
    )
    assert r.status_code == 400


def test_cambio_de_password_rechaza_una_debil(client, token):
    headers, _ = token()
    r = client.post(
        "/v1/auth/cambiar-password",
        headers=headers,
        json={"password_actual": "Prueba-Segura-2026!", "password_nueva": "12345678abcd"},
    )
    assert r.status_code == 422


def test_cambio_de_password_funciona_y_cierra_sesiones(client, crear_usuario):
    usuario, password = crear_usuario()
    login = client.post(
        "/v1/auth/login", json={"email": usuario.email, "password": password}
    ).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    nueva = "Otra-Clave-Muy-Segura-26!"
    r = client.post(
        "/v1/auth/cambiar-password",
        headers=headers,
        json={"password_actual": password, "password_nueva": nueva},
    )
    assert r.status_code == 204

    assert client.post(
        "/v1/auth/login", json={"email": usuario.email, "password": nueva}
    ).status_code == 200
    assert client.post(
        "/v1/auth/refresh", json={"refresh_token": login["refresh_token"]}
    ).status_code == 401, "cambiar la contraseña cierra las sesiones abiertas"


# --- Perfiles y permisos ---------------------------------------------------


def test_perfil_consulta_no_puede_administrar(client, token):
    headers, _ = token("consulta")
    r = client.get("/v1/admin/usuarios", headers=headers)
    assert r.status_code == 403
    assert "consulta" in r.json()["detail"]


def test_perfil_analista_tampoco_administra(client, token):
    headers, _ = token("analista")
    assert client.get("/v1/admin/usuarios", headers=headers).status_code == 403


def test_administrador_lista_y_crea_usuarios(client, token):
    headers, _ = token("admin")
    assert client.get("/v1/admin/usuarios", headers=headers).status_code == 200

    r = client.post(
        "/v1/admin/usuarios",
        headers=headers,
        json={
            "email": "nuevo.analista@prueba.cr",
            "nombre": "Analista Nuevo",
            "perfil_codigo": "analista",
        },
    )
    assert r.status_code == 201, r.text
    datos = r.json()
    assert datos["password_temporal"], "sin contraseña explícita se genera una temporal"
    assert datos["usuario"]["debe_cambiar_password"] is True
    assert datos["usuario"]["perfil"]["codigo"] == "analista"


def test_no_se_pueden_crear_dos_cuentas_con_el_mismo_correo(client, token):
    headers, _ = token("admin")
    cuerpo = {
        "email": "duplicado@prueba.cr",
        "nombre": "Primero",
        "perfil_codigo": "consulta",
    }
    assert client.post("/v1/admin/usuarios", headers=headers, json=cuerpo).status_code == 201
    assert client.post("/v1/admin/usuarios", headers=headers, json=cuerpo).status_code == 409


def test_administrador_no_puede_desactivarse_a_si_mismo(client, token):
    headers, admin = token("admin")
    r = client.patch(
        f"/v1/admin/usuarios/{admin.id}", headers=headers, json={"activo": False}
    )
    assert r.status_code == 400


def test_usuario_desactivado_pierde_el_acceso(client, token, crear_usuario):
    headers_admin, _ = token("admin")
    victima, password = crear_usuario()
    login = client.post(
        "/v1/auth/login", json={"email": victima.email, "password": password}
    ).json()
    headers_victima = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.get("/v1/auth/yo", headers=headers_victima).status_code == 200

    client.patch(f"/v1/admin/usuarios/{victima.id}", headers=headers_admin, json={"activo": False})
    assert client.get("/v1/auth/yo", headers=headers_victima).status_code == 401


def test_el_limite_de_pagina_lo_impone_el_perfil(client, token):
    """Un perfil de consulta no puede pedir 200 filas aunque las solicite: acota el costo."""
    headers, _ = token("admin")
    r = client.get("/v1/admin/usuarios?page_size=200", headers=headers)
    assert r.status_code == 200
    assert r.json()["page_size"] == 200

    headers_consulta, _ = token("consulta")
    r2 = client.get("/v1/auth/perfiles", headers=headers_consulta)
    assert r2.status_code == 200
    perfiles = {p["codigo"]: p for p in r2.json()}
    assert perfiles["consulta"]["limite_page_size"] == 25
    assert perfiles["admin"]["limite_page_size"] == 200


# --- Preferencias ----------------------------------------------------------


def test_preferencias_se_crean_vacias_y_se_guardan(client, token):
    headers, _ = token()
    r = client.get("/v1/auth/preferencias", headers=headers)
    assert r.status_code == 200
    assert r.json()["instituciones_seguidas"] == []

    nuevas = {
        "filtros_guardados": [{"nombre": "Municipalidades 2026", "institucion": "3014042058"}],
        "instituciones_seguidas": ["3014042058"],
        "proveedores_seguidos": ["3101677835"],
        "config_dashboard": {"vista": "compacta"},
    }
    r2 = client.put("/v1/auth/preferencias", headers=headers, json=nuevas)
    assert r2.status_code == 200
    assert r2.json()["instituciones_seguidas"] == ["3014042058"]

    r3 = client.get("/v1/auth/preferencias", headers=headers)
    assert r3.json()["config_dashboard"] == {"vista": "compacta"}


def test_las_preferencias_son_privadas_de_cada_usuario(client, token):
    headers_a, _ = token()
    headers_b, _ = token()
    client.put(
        "/v1/auth/preferencias",
        headers=headers_a,
        json={
            "filtros_guardados": [],
            "instituciones_seguidas": ["111"],
            "proveedores_seguidos": [],
            "config_dashboard": {},
        },
    )
    r = client.get("/v1/auth/preferencias", headers=headers_b)
    assert r.json()["instituciones_seguidas"] == [], "no se ven las del otro usuario"


@pytest.mark.parametrize("campo", ["email", "nombre", "password"])
def test_registro_valida_los_campos_obligatorios(client, campo):
    cuerpo = {"email": "x@prueba.cr", "nombre": "Nombre", "password": "Clave-Segura-2026!"}
    cuerpo.pop(campo)
    r = client.post("/v1/auth/registro", json=cuerpo)
    assert r.status_code == 422


def test_el_correo_del_admin_sembrado_permite_iniciar_sesion(db):
    """Un dominio reservado (.local, .test, .example) crearía una cuenta inutilizable."""
    from email_validator import EmailNotValidError, validate_email

    from app.config import get_settings

    try:
        validate_email(get_settings().admin_email, check_deliverability=False)
    except EmailNotValidError as e:
        raise AssertionError(
            f"ADMIN_EMAIL por defecto no sirve para iniciar sesión: {e}"
        ) from e


# --- Hallazgos de la auditoría de seguridad -------------------------------


def test_contrasena_temporal_solo_sirve_para_cambiarla(client, token, crear_usuario):
    """Si no se bloquea, el indicador debe_cambiar_password queda decorativo."""
    headers_admin, _ = token("admin")
    r = client.post(
        "/v1/admin/usuarios",
        headers=headers_admin,
        json={
            "email": "temporal.demo@prueba.cr",
            "nombre": "Con Clave Temporal",
            "perfil_codigo": "analista",
        },
    )
    assert r.status_code == 201
    temporal = r.json()["password_temporal"]

    login = client.post(
        "/v1/auth/login", json={"email": "temporal.demo@prueba.cr", "password": temporal}
    ).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}

    assert client.get("/v1/auth/yo", headers=h).status_code == 200, "puede verse a sí mismo"
    assert client.get("/v1/dashboard/resumen", headers=h).status_code == 403, (
        "no puede usar la aplicación con una contraseña temporal"
    )

    nueva = "Definitiva-Segura-2026!"
    assert client.post(
        "/v1/auth/cambiar-password",
        headers=h,
        json={"password_actual": temporal, "password_nueva": nueva},
    ).status_code == 204

    login2 = client.post(
        "/v1/auth/login", json={"email": "temporal.demo@prueba.cr", "password": nueva}
    ).json()
    h2 = {"Authorization": f"Bearer {login2['access_token']}"}
    assert client.get("/v1/dashboard/resumen", headers=h2).status_code == 200


def test_el_reuso_de_un_refresh_cierra_todas_las_sesiones(client, crear_usuario):
    """Caso de token robado: la víctima ya rotó, el ladrón intenta el viejo."""
    usuario, password = crear_usuario()
    login = client.post(
        "/v1/auth/login", json={"email": usuario.email, "password": password}
    ).json()

    rotado = client.post(
        "/v1/auth/refresh", json={"refresh_token": login["refresh_token"]}
    ).json()

    # El "ladrón" usa el token viejo.
    assert client.post(
        "/v1/auth/refresh", json={"refresh_token": login["refresh_token"]}
    ).status_code == 401

    # Y eso invalida también el token bueno de la víctima.
    assert client.post(
        "/v1/auth/refresh", json={"refresh_token": rotado["refresh_token"]}
    ).status_code == 401, "detectado el reuso, se cierra toda la familia de sesiones"


def test_la_paginacion_no_permite_desplazamientos_enormes(client, token):
    """Un OFFSET gigante es un escaneo completo disfrazado de consulta barata."""
    headers, _ = token("admin")
    r = client.get("/v1/admin/usuarios?page=10000&page_size=200", headers=headers)
    assert r.status_code == 400
    assert "filtros" in r.json()["detail"].lower()


def test_las_sesiones_vencidas_se_purgan(db, crear_usuario):
    from datetime import UTC, datetime, timedelta

    from app.models.auth import Sesion
    from app.services.usuarios import purgar_sesiones_vencidas

    usuario, _ = crear_usuario()
    db.add(
        Sesion(
            usuario_id=usuario.id,
            refresh_hash="a" * 64,
            jti="x" * 32,
            expira_en=datetime.now(UTC) - timedelta(days=1),
        )
    )
    db.commit()

    assert purgar_sesiones_vencidas(db) >= 1
