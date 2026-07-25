"""Siembra idempotente de perfiles y del usuario administrador inicial."""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.auth import (
    P_ADMIN,
    P_CONSULTAR,
    P_DETALLE,
    P_EXPORTAR,
    PERFIL_ADMIN,
    PERFIL_ANALISTA,
    PERFIL_CONSULTA,
    Perfil,
    Usuario,
)
from app.security import generar_password_segura, hash_password

log = logging.getLogger(__name__)

# Los límites acotan el gasto: un perfil de consulta no puede pedir páginas grandes
# ni tocar los endpoints de detalle, que son los caros de calcular.
PERFILES_BASE: tuple[dict, ...] = (
    {
        "codigo": PERFIL_CONSULTA,
        "nombre": "Consulta",
        "descripcion": "Acceso a dashboards y agregados. Sin detalle fila a fila ni exportación.",
        "permisos": [P_CONSULTAR],
        "limite_page_size": 25,
        "limite_consultas_dia": 1000,
        "meses_historia": 12,
    },
    {
        "codigo": PERFIL_ANALISTA,
        "nombre": "Analista",
        "descripcion": "Agregados, detalle de líneas y exportación sobre los 24 meses disponibles.",
        "permisos": [P_CONSULTAR, P_DETALLE, P_EXPORTAR],
        "limite_page_size": 100,
        "limite_consultas_dia": 10_000,
        "meses_historia": 24,
    },
    {
        "codigo": PERFIL_ADMIN,
        "nombre": "Administrador",
        "descripcion": "Todo lo anterior más gestión de usuarios y operación del ETL.",
        "permisos": [P_CONSULTAR, P_DETALLE, P_EXPORTAR, P_ADMIN],
        "limite_page_size": 200,
        "limite_consultas_dia": 50_000,
        "meses_historia": 24,
    },
)


def sembrar_perfiles(db: Session) -> None:
    for datos in PERFILES_BASE:
        perfil = db.scalar(select(Perfil).where(Perfil.codigo == datos["codigo"]))
        if perfil is None:
            db.add(Perfil(**datos))
            log.info("Perfil creado: %s", datos["codigo"])
        else:
            # Los permisos y límites se mantienen alineados con el código en cada arranque.
            perfil.nombre = datos["nombre"]
            perfil.descripcion = datos["descripcion"]
            perfil.permisos = datos["permisos"]
            perfil.limite_page_size = datos["limite_page_size"]
            perfil.limite_consultas_dia = datos["limite_consultas_dia"]
            perfil.meses_historia = datos["meses_historia"]
    db.commit()


def sembrar_admin(db: Session) -> str | None:
    """Crea el administrador inicial si no hay ninguno. Devuelve la contraseña si la generó."""
    s = get_settings()
    existe = db.scalar(
        select(Usuario.id).join(Perfil, Usuario.perfil_id == Perfil.id).where(
            Perfil.codigo == PERFIL_ADMIN
        )
    )
    if existe:
        return None

    perfil = db.scalar(select(Perfil).where(Perfil.codigo == PERFIL_ADMIN))
    if perfil is None:
        raise RuntimeError("No existe el perfil administrador; sembrar perfiles primero.")

    # Falla al arrancar y no en el primer intento de ingreso: un correo con dominio
    # reservado (.local, .test, .example) crea una cuenta con la que nadie puede entrar.
    from email_validator import EmailNotValidError, validate_email

    try:
        validate_email(s.admin_email, check_deliverability=False)
    except EmailNotValidError as e:
        raise RuntimeError(
            f"ADMIN_EMAIL='{s.admin_email}' no es un correo válido para iniciar sesión "
            f"({e}). Usá un dominio real."
        ) from e

    password = s.admin_password
    generada = None
    if not password:
        if s.es_prod:
            # En producción NO se genera ni se registra una contraseña: los logs de
            # la plataforma los puede leer cualquiera con acceso al proyecto o a un
            # log-drain, y quien la lea entra como administrador antes que el dueño.
            raise RuntimeError(
                "Falta ADMIN_PASSWORD. En producción la contraseña del administrador "
                "inicial se define como variable de entorno (queda cifrada en la "
                "plataforma), nunca se genera para imprimirla en el log. "
                "Generá una con: python -c \"from app.security import "
                "generar_password_segura; print(generar_password_segura())\""
            )
        password = generar_password_segura()
        generada = password

    admin = Usuario(
        email=s.admin_email.strip().lower(),
        nombre="Administrador",
        hash_password=hash_password(password),
        perfil_id=perfil.id,
        debe_cambiar_password=True,
    )
    db.add(admin)
    db.commit()

    if generada:
        # Solo ocurre fuera de producción. Se escribe a stdout directamente y no
        # por el logger, para que no termine en un agregador de logs.
        print(
            f"\n[desarrollo] Administrador inicial: {admin.email}\n"
            f"[desarrollo] Contraseña temporal: {generada}\n"
            f"[desarrollo] Debe cambiarla al ingresar.\n"
        )
    else:
        log.info("Administrador inicial creado: %s (contraseña provista por entorno).", admin.email)
    return generada


def sembrar(db: Session) -> None:
    sembrar_perfiles(db)
    sembrar_admin(db)
