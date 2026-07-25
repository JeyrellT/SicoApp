"""Estado del servicio y de los datos.

/salud/vivo lo consulta el healthcheck de Railway y NO toca la base: si el chequeo
dependiera de Postgres, una caída de la base reiniciaría en bucle la API.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app import __version__
from app.api.deps import DB
from app.config import get_settings
from app.schemas.comunes import SaludDatos

log = logging.getLogger(__name__)

router = APIRouter(prefix="/salud", tags=["salud"])


@router.get("/vivo", summary="Liveness: el proceso responde")
def vivo() -> dict[str, str]:
    return {"estado": "vivo", "version": __version__}


@router.get("/listo", summary="Readiness: la base responde")
def listo(db: DB, response: Response) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        log.exception("Readiness: la base de datos no responde.")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"estado": "sin base de datos"}
    return {"estado": "listo"}


@router.get("/datos", response_model=SaludDatos, summary="Cobertura y frescura de los datos")
def datos(db: DB) -> SaludDatos:
    """Qué periodos hay cargados y de cuándo son.

    Es público a propósito: el frontend lo muestra antes del login para que nadie
    tome decisiones sobre datos viejos sin saberlo.
    """
    s = get_settings()

    # Los periodos se leen de los agregados, no de las particiones: una partición
    # creada por una carga que falló a mitad existiría sin datos, y este endpoint
    # se usa para decidir si confiar en lo que muestra la aplicación.
    periodos = [
        int(f[0])
        for f in db.execute(
            text("SELECT periodo FROM sicop.agg_mensual_global ORDER BY periodo")
        ).all()
    ]

    ultima = db.execute(
        text(
            """
            SELECT periodo, estado, exito, filas_total, finalizado_en, iniciado_en
            FROM ops.cargas
            ORDER BY iniciado_en DESC
            LIMIT 1
            """
        )
    ).first()

    filas = (
        db.execute(text("SELECT COALESCE(SUM(filas_total), 0) FROM ops.cargas WHERE exito")).scalar()
        or 0
    )

    if not periodos:
        estado = "sin datos"
    elif ultima is not None and not ultima.exito:
        estado = "última carga con error"
    else:
        estado = "operativo"

    return SaludDatos(
        estado=estado,
        periodos=periodos,
        periodo_min=min(periodos) if periodos else None,
        periodo_max=max(periodos) if periodos else None,
        ultima_carga=(ultima.finalizado_en or ultima.iniciado_en) if ultima else None,
        ultima_carga_periodo=ultima.periodo if ultima else None,
        ultima_carga_estado=ultima.estado if ultima else None,
        ultima_carga_exito=ultima.exito if ultima else None,
        filas_totales=int(filas),
        meses_retencion=s.retention_months,
        version_api=__version__,
    )
