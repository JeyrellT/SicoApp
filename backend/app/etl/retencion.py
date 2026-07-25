"""Ventana móvil de 24 meses.

Cada corrida elimina lo que quedó fuera de la ventana. DROP de partición libera
el espacio de inmediato: es la diferencia entre un volumen estable y uno que
crece para siempre.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.etl import ddl
from app.etl.periodos import ventana_retencion
from app.etl.tablas import TABLAS

log = logging.getLogger(__name__)

TABLAS_AGREGADAS = (
    "agg_mensual_global",
    "agg_mensual_institucion",
    "agg_mensual_proveedor",
    "agg_mensual_categoria",
    "agg_mensual_tipo_procedimiento",
    "agg_mensual_relacion",
    "agg_invitaciones_procedimiento",
)


def aplicar(conn: Connection, meses: int | None = None) -> list[int]:
    """Elimina los periodos fuera de la ventana. Devuelve los periodos eliminados."""
    ventana = set(ventana_retencion(meses=meses))
    minimo = min(ventana)
    existentes = ddl.periodos_existentes(conn)
    sobrantes = sorted(p for p in existentes if p < minimo)

    for periodo in sobrantes:
        n = ddl.eliminar_particiones(conn, TABLAS, periodo)
        log.info("Retención: eliminado el periodo %s (%d particiones).", periodo, n)

    for tabla in TABLAS_AGREGADAS:
        conn.execute(
            text(f"DELETE FROM {ddl.ESQUEMA}.{tabla} WHERE periodo < :minimo"), {"minimo": minimo}
        )

    # Procedimientos que ya no tienen ningún hecho dentro de la ventana.
    conn.execute(
        text(
            f"DELETE FROM {ddl.ESQUEMA}.dim_procedimiento WHERE ultimo_periodo < :minimo"
        ),
        {"minimo": minimo},
    )

    if sobrantes:
        log.info("Retención aplicada: ventana %s..%s", minimo, max(ventana))
    return sobrantes


def periodos_faltantes(conn: Connection, meses: int | None = None) -> list[int]:
    """Periodos de la ventana que todavía no se han cargado (para el backfill)."""
    existentes = set(ddl.periodos_existentes(conn))
    return [p for p in ventana_retencion(meses=meses) if p not in existentes]
