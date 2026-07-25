"""Recálculo de las tablas de agregados de un periodo.

Es el corazón del ahorro: el ETL paga una vez por mes el costo de agregar
millones de filas, y después cada consulta del dashboard lee unos miles.

Los nombres de columna NO se escriben a mano: se resuelven desde las
declaraciones de app/etl/tablas.py, de modo que renombrar una columna en la
especificación no deje estas consultas rotas en silencio.

Nota de negocio verificada en los datos: MONTO_ADJU_LINEA_CRC viene poblado y
ya convertido a colones incluso cuando la línea se adjudicó en dólares o euros,
así que sumarlo da el total correcto sin aplicar tipo de cambio.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.etl.ddl import ESQUEMA
from app.etl.tablas import POR_TABLA

log = logging.getLogger(__name__)


def col(tabla: str, csv_col: str) -> str:
    """Nombre real de la columna destino a partir del nombre del CSV."""
    spec = POR_TABLA.get(tabla)
    if spec is None:
        raise KeyError(
            f"La tabla '{tabla}' no está declarada en app/etl/tablas.py; "
            f"declaradas: {sorted(POR_TABLA)}"
        )
    for c in spec.columnas:
        if c.csv == csv_col:
            if c.col is None:
                raise KeyError(
                    f"La columna '{csv_col}' de {tabla} no se almacena (está normalizada "
                    f"a una dimensión); use el join correspondiente."
                )
            return c.col
    raise KeyError(f"{tabla} no declara la columna '{csv_col}'.")


def existe(tabla: str) -> bool:
    return tabla in POR_TABLA


def recalcular(conn: Connection, periodo: int) -> None:
    """Recalcula todos los agregados del periodo. Idempotente."""
    _global(conn, periodo)
    _institucion(conn, periodo)
    _proveedor(conn, periodo)
    _categoria(conn, periodo)
    _tipo_procedimiento(conn, periodo)
    _relacion(conn, periodo)
    _invitaciones(conn, periodo)
    _completar_dim_procedimiento(conn, periodo)
    log.info("Agregados recalculados para el periodo %s.", periodo)


def _limpiar(conn: Connection, tabla: str, periodo: int) -> None:
    conn.execute(
        text(f"DELETE FROM {ESQUEMA}.{tabla} WHERE periodo = :p"), {"p": periodo}
    )


def _global(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    nro = col(pa, "NRO_SICOP")
    inst = col(pa, "CEDULA")
    prov = col(pa, "CEDULA_PROVEEDOR")
    crc = col(pa, "MONTO_ADJU_LINEA_CRC")
    usd = col(pa, "MONTO_ADJU_LINEA_USD")

    ofe_nro = col("ofertas", "NRO_SICOP")
    ord_total = col("orden_pedido", "TOTAL_ORDEN")
    ord_moneda = col("orden_pedido", "MONEDA_ORDEN")

    _limpiar(conn, "agg_mensual_global", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_global
                (periodo, procedimientos, lineas_adjudicadas, monto_crc, monto_usd,
                 instituciones, proveedores, ofertas, ordenes, monto_ordenes_crc, invitaciones)
            SELECT
                :p,
                (SELECT COUNT(DISTINCT {nro}) FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COUNT(*)              FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COALESCE(SUM({crc}),0) FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COALESCE(SUM({usd}),0) FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COUNT(DISTINCT {inst}) FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COUNT(DISTINCT {prov}) FROM {ESQUEMA}.{pa} WHERE periodo = :p),
                (SELECT COUNT(*) FROM {ESQUEMA}.ofertas WHERE periodo = :p AND {ofe_nro} IS NOT NULL),
                (SELECT COUNT(*) FROM {ESQUEMA}.orden_pedido WHERE periodo = :p),
                (SELECT COALESCE(SUM({ord_total}),0) FROM {ESQUEMA}.orden_pedido
                  WHERE periodo = :p AND {ord_moneda} = 'CRC'),
                (SELECT COUNT(*) FROM {ESQUEMA}.invitacion_procedimiento WHERE periodo = :p)
            """
        ),
        {"p": periodo},
    )


def _institucion(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    nro, inst = col(pa, "NRO_SICOP"), col(pa, "CEDULA")
    prov, crc, usd = (
        col(pa, "CEDULA_PROVEEDOR"),
        col(pa, "MONTO_ADJU_LINEA_CRC"),
        col(pa, "MONTO_ADJU_LINEA_USD"),
    )
    _limpiar(conn, "agg_mensual_institucion", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_institucion
                (periodo, ced_institucion, procedimientos, lineas_adjudicadas,
                 monto_crc, monto_usd, proveedores_distintos)
            SELECT :p, {inst},
                   COUNT(DISTINCT {nro}),
                   COUNT(*),
                   COALESCE(SUM({crc}),0),
                   COALESCE(SUM({usd}),0),
                   COUNT(DISTINCT {prov})
            FROM {ESQUEMA}.{pa}
            WHERE periodo = :p AND {inst} IS NOT NULL
            GROUP BY {inst}
            """
        ),
        {"p": periodo},
    )


def _proveedor(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    nro, inst = col(pa, "NRO_SICOP"), col(pa, "CEDULA")
    prov, crc, usd = (
        col(pa, "CEDULA_PROVEEDOR"),
        col(pa, "MONTO_ADJU_LINEA_CRC"),
        col(pa, "MONTO_ADJU_LINEA_USD"),
    )
    inv_prov = col("invitacion_procedimiento", "CEDULA_PROVEEDOR")
    ofe_prov = col("ofertas", "CEDULA_PROVEEDOR")

    _limpiar(conn, "agg_mensual_proveedor", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_proveedor
                (periodo, cedula_proveedor, adjudicaciones, lineas_adjudicadas,
                 monto_crc, monto_usd, instituciones_distintas, invitaciones, ofertas)
            WITH adj AS (
                SELECT {prov} AS ced,
                       COUNT(DISTINCT {nro}) AS adjudicaciones,
                       COUNT(*)              AS lineas,
                       COALESCE(SUM({crc}),0) AS monto_crc,
                       COALESCE(SUM({usd}),0) AS monto_usd,
                       COUNT(DISTINCT {inst}) AS instituciones
                FROM {ESQUEMA}.{pa}
                WHERE periodo = :p AND {prov} IS NOT NULL
                GROUP BY {prov}
            ),
            inv AS (
                SELECT {inv_prov} AS ced, COUNT(*) AS invitaciones
                FROM {ESQUEMA}.invitacion_procedimiento
                WHERE periodo = :p AND {inv_prov} IS NOT NULL
                GROUP BY {inv_prov}
            ),
            ofe AS (
                SELECT {ofe_prov} AS ced, COUNT(*) AS ofertas
                FROM {ESQUEMA}.ofertas
                WHERE periodo = :p AND {ofe_prov} IS NOT NULL
                GROUP BY {ofe_prov}
            ),
            todos AS (
                SELECT ced FROM adj
                UNION SELECT ced FROM inv
                UNION SELECT ced FROM ofe
            )
            SELECT :p, t.ced,
                   COALESCE(a.adjudicaciones,0), COALESCE(a.lineas,0),
                   COALESCE(a.monto_crc,0), COALESCE(a.monto_usd,0),
                   COALESCE(a.instituciones,0),
                   COALESCE(i.invitaciones,0), COALESCE(o.ofertas,0)
            FROM todos t
            LEFT JOIN adj a ON a.ced = t.ced
            LEFT JOIN inv i ON i.ced = t.ced
            LEFT JOIN ofe o ON o.ced = t.ced
            """
        ),
        {"p": periodo},
    )


def _categoria(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    obj = col(pa, "OBJETO_GASTO")
    prov, crc, usd = (
        col(pa, "CEDULA_PROVEEDOR"),
        col(pa, "MONTO_ADJU_LINEA_CRC"),
        col(pa, "MONTO_ADJU_LINEA_USD"),
    )
    _limpiar(conn, "agg_mensual_categoria", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_categoria
                (periodo, objeto_gasto, lineas, monto_crc, monto_usd, proveedores_distintos)
            SELECT :p, {obj}, COUNT(*), COALESCE(SUM({crc}),0), COALESCE(SUM({usd}),0),
                   COUNT(DISTINCT {prov})
            FROM {ESQUEMA}.{pa}
            WHERE periodo = :p AND {obj} IS NOT NULL
            GROUP BY {obj}
            """
        ),
        {"p": periodo},
    )


def _tipo_procedimiento(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    tipo, nro = col(pa, "TIPO_PROCEDIMIENTO"), col(pa, "NRO_SICOP")
    crc = col(pa, "MONTO_ADJU_LINEA_CRC")
    _limpiar(conn, "agg_mensual_tipo_procedimiento", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_tipo_procedimiento
                (periodo, tipo_procedimiento, procedimientos, lineas, monto_crc)
            SELECT :p, {tipo}, COUNT(DISTINCT {nro}), COUNT(*), COALESCE(SUM({crc}),0)
            FROM {ESQUEMA}.{pa}
            WHERE periodo = :p AND {tipo} IS NOT NULL
            GROUP BY {tipo}
            """
        ),
        {"p": periodo},
    )


def _relacion(conn: Connection, periodo: int) -> None:
    pa = "procedimiento_adjudicacion"
    inst, prov = col(pa, "CEDULA"), col(pa, "CEDULA_PROVEEDOR")
    crc = col(pa, "MONTO_ADJU_LINEA_CRC")
    _limpiar(conn, "agg_mensual_relacion", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_mensual_relacion
                (periodo, ced_institucion, cedula_proveedor, lineas, monto_crc)
            SELECT :p, {inst}, {prov}, COUNT(*), COALESCE(SUM({crc}),0)
            FROM {ESQUEMA}.{pa}
            WHERE periodo = :p AND {inst} IS NOT NULL AND {prov} IS NOT NULL
            GROUP BY {inst}, {prov}
            """
        ),
        {"p": periodo},
    )


def _invitaciones(conn: Connection, periodo: int) -> None:
    """Resumen de invitados por procedimiento.

    Permite responder "¿cuánta competencia hubo?" sin indexar ni escanear la
    tabla de invitaciones, que es la más grande del sistema.
    """
    inv = "invitacion_procedimiento"
    nro, prov = col(inv, "NRO_SICOP"), col(inv, "CEDULA_PROVEEDOR")
    _limpiar(conn, "agg_invitaciones_procedimiento", periodo)
    conn.execute(
        text(
            f"""
            INSERT INTO {ESQUEMA}.agg_invitaciones_procedimiento (periodo, nro_sicop, invitados)
            SELECT :p, {nro}, COUNT(DISTINCT {prov})
            FROM {ESQUEMA}.{inv}
            WHERE periodo = :p AND {nro} IS NOT NULL
            GROUP BY {nro}
            """
        ),
        {"p": periodo},
    )


def _completar_dim_procedimiento(conn: Connection, periodo: int) -> None:
    """Rellena tipo y modalidad, que solo aparecen en la tabla de adjudicaciones."""
    pa = "procedimiento_adjudicacion"
    nro = col(pa, "NRO_SICOP")
    tipo = col(pa, "TIPO_PROCEDIMIENTO")
    modalidad = col(pa, "MODALIDAD_PROCEDIMIENTO")
    inst = col(pa, "CEDULA")
    conn.execute(
        text(
            f"""
            UPDATE {ESQUEMA}.dim_procedimiento d
            SET tipo_procedimiento = COALESCE(d.tipo_procedimiento, s.tipo),
                modalidad          = COALESCE(d.modalidad, s.modalidad),
                ced_institucion    = COALESCE(d.ced_institucion, s.inst),
                actualizado_en     = now()
            FROM (
                SELECT {nro} AS nro,
                       MAX({tipo})      AS tipo,
                       MAX({modalidad}) AS modalidad,
                       MAX({inst})      AS inst
                FROM {ESQUEMA}.{pa}
                WHERE periodo = :p AND {nro} IS NOT NULL
                GROUP BY {nro}
            ) s
            WHERE d.nro_sicop = s.nro
            """
        ),
        {"p": periodo},
    )
