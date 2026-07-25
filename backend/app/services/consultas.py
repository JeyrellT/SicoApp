"""Consultas analíticas.

Todo sale de las tablas de agregados que calcula el ETL (sicop.agg_*), nunca de
las tablas de detalle. Un KPI sobre 24 meses toca a lo sumo unos miles de filas
en vez de decenas de millones: eso es lo que mantiene el consumo de CPU —y la
factura— en el piso.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.etl.periodos import etiqueta, periodo_actual, sumar_meses
from app.schemas.datos import (
    CategoriaItem,
    ContraparteItem,
    InstitucionItem,
    OpcionesFiltro,
    ProveedorItem,
    PuntoSerie,
    ResumenKPI,
    TipoProcedimientoItem,
)

CERO = Decimal(0)


def ventana_permitida(db: Session, meses_perfil: int, desde: int | None, hasta: int | None):
    """Resuelve el rango a consultar, acotado por lo que el perfil puede ver.

    El techo por perfil no es solo control de acceso: impide que una consulta
    barra 24 meses cuando el usuario solo tiene derecho a 12.
    """
    disponibles = periodos_disponibles(db)
    if not disponibles:
        actual = periodo_actual()
        return actual, actual, []

    tope_inferior = max(min(disponibles), sumar_meses(max(disponibles), -(meses_perfil - 1)))
    d = max(desde or tope_inferior, tope_inferior)
    h = min(hasta or max(disponibles), max(disponibles))
    if d > h:
        d = h
    return d, h, [p for p in disponibles if d <= p <= h]


def periodos_disponibles(db: Session) -> list[int]:
    filas = db.execute(text("SELECT periodo FROM sicop.agg_mensual_global ORDER BY periodo")).all()
    return [int(f[0]) for f in filas]


def _fila_a_dict(fila) -> dict[str, Any]:
    return dict(fila._mapping) if fila is not None else {}


def resumen(db: Session, desde: int, hasta: int, comparar: bool = True) -> ResumenKPI:
    fila = db.execute(
        text(
            """
            SELECT COALESCE(SUM(procedimientos),0)     AS procedimientos,
                   COALESCE(SUM(lineas_adjudicadas),0) AS lineas_adjudicadas,
                   COALESCE(SUM(monto_crc),0)          AS monto_crc,
                   COALESCE(SUM(monto_usd),0)          AS monto_usd,
                   COALESCE(MAX(instituciones),0)      AS instituciones,
                   COALESCE(MAX(proveedores),0)        AS proveedores,
                   COALESCE(SUM(ofertas),0)            AS ofertas,
                   COALESCE(SUM(ordenes),0)            AS ordenes,
                   COALESCE(SUM(monto_ordenes_crc),0)  AS monto_ordenes_crc,
                   COALESCE(SUM(invitaciones),0)       AS invitaciones
            FROM sicop.agg_mensual_global
            WHERE periodo BETWEEN :d AND :h
            """
        ),
        {"d": desde, "h": hasta},
    ).first()

    datos = _fila_a_dict(fila)
    kpi = ResumenKPI(periodo_desde=desde, periodo_hasta=hasta, **datos)
    if kpi.lineas_adjudicadas:
        kpi.monto_promedio_crc = (kpi.monto_crc / kpi.lineas_adjudicadas).quantize(Decimal("0.01"))

    if comparar:
        largo = _meses_entre(desde, hasta)
        pd_, ph = sumar_meses(desde, -largo), sumar_meses(desde, -1)
        previo = db.execute(
            text(
                "SELECT COALESCE(SUM(monto_crc),0) FROM sicop.agg_mensual_global "
                "WHERE periodo BETWEEN :d AND :h"
            ),
            {"d": pd_, "h": ph},
        ).scalar() or CERO
        if previo:
            kpi.variacion_monto_pct = float(
                (kpi.monto_crc - previo) / previo * 100
            )
    return kpi


def _meses_entre(desde: int, hasta: int) -> int:
    a1, m1 = divmod(desde, 100)
    a2, m2 = divmod(hasta, 100)
    return (a2 * 12 + m2) - (a1 * 12 + m1) + 1


def serie_mensual(db: Session, desde: int, hasta: int) -> list[PuntoSerie]:
    filas = db.execute(
        text(
            """
            SELECT periodo, procedimientos, lineas_adjudicadas, monto_crc, monto_usd
            FROM sicop.agg_mensual_global
            WHERE periodo BETWEEN :d AND :h
            ORDER BY periodo
            """
        ),
        {"d": desde, "h": hasta},
    ).all()
    return [
        PuntoSerie(
            periodo=f.periodo,
            etiqueta=etiqueta(f.periodo),
            procedimientos=f.procedimientos,
            lineas=f.lineas_adjudicadas,
            monto_crc=f.monto_crc,
            monto_usd=f.monto_usd,
        )
        for f in filas
    ]


def top_instituciones(db: Session, desde: int, hasta: int, limite: int = 10) -> list[InstitucionItem]:
    filas = db.execute(
        text(
            """
            SELECT a.ced_institucion AS cedula,
                   i.nombre,
                   SUM(a.procedimientos)::bigint AS procedimientos,
                   SUM(a.monto_crc)              AS monto_crc
            FROM sicop.agg_mensual_institucion a
            LEFT JOIN sicop.dim_institucion i ON i.cedula = a.ced_institucion
            WHERE a.periodo BETWEEN :d AND :h
            GROUP BY a.ced_institucion, i.nombre
            ORDER BY monto_crc DESC
            LIMIT :lim
            """
        ),
        {"d": desde, "h": hasta, "lim": limite},
    ).all()
    return [InstitucionItem(**_fila_a_dict(f)) for f in filas]


def top_proveedores(db: Session, desde: int, hasta: int, limite: int = 10) -> list[ProveedorItem]:
    filas = db.execute(
        text(
            """
            SELECT a.cedula_proveedor AS cedula,
                   p.nombre,
                   SUM(a.adjudicaciones)::bigint AS adjudicaciones,
                   SUM(a.monto_crc)              AS monto_crc
            FROM sicop.agg_mensual_proveedor a
            LEFT JOIN sicop.dim_proveedor p ON p.cedula_proveedor = a.cedula_proveedor
            WHERE a.periodo BETWEEN :d AND :h
            GROUP BY a.cedula_proveedor, p.nombre
            ORDER BY monto_crc DESC
            LIMIT :lim
            """
        ),
        {"d": desde, "h": hasta, "lim": limite},
    ).all()
    return [ProveedorItem(**_fila_a_dict(f)) for f in filas]


def categorias(
    db: Session, desde: int, hasta: int, limite: int = 20, ced_institucion: str | None = None
) -> list[CategoriaItem]:
    if ced_institucion:
        # Por institución no hay agregado propio de categoría: se usa la relación.
        sql = """
            SELECT pa.objeto_gasto,
                   COUNT(*)::bigint                       AS lineas,
                   COALESCE(SUM(pa.monto_adju_linea_crc),0) AS monto_crc,
                   COALESCE(SUM(pa.monto_adju_linea_usd),0) AS monto_usd,
                   COUNT(DISTINCT pa.cedula_proveedor)     AS proveedores_distintos
            FROM sicop.procedimiento_adjudicacion pa
            WHERE pa.periodo BETWEEN :d AND :h
              AND pa.cedula = :ced
              AND pa.objeto_gasto IS NOT NULL
            GROUP BY pa.objeto_gasto
            ORDER BY monto_crc DESC
            LIMIT :lim
        """
        params = {"d": desde, "h": hasta, "lim": limite, "ced": ced_institucion}
    else:
        sql = """
            SELECT objeto_gasto,
                   SUM(lineas)::bigint             AS lineas,
                   SUM(monto_crc)                  AS monto_crc,
                   SUM(monto_usd)                  AS monto_usd,
                   MAX(proveedores_distintos)      AS proveedores_distintos
            FROM sicop.agg_mensual_categoria
            WHERE periodo BETWEEN :d AND :h
            GROUP BY objeto_gasto
            ORDER BY monto_crc DESC
            LIMIT :lim
        """
        params = {"d": desde, "h": hasta, "lim": limite}

    filas = db.execute(text(sql), params).all()
    total = sum(f.monto_crc or CERO for f in filas) or CERO
    salida = []
    for f in filas:
        item = CategoriaItem(**_fila_a_dict(f))
        item.participacion_pct = float(item.monto_crc / total * 100) if total else 0.0
        salida.append(item)
    return salida


def tipos_procedimiento(db: Session, desde: int, hasta: int) -> list[TipoProcedimientoItem]:
    filas = db.execute(
        text(
            """
            SELECT tipo_procedimiento,
                   SUM(procedimientos)::bigint AS procedimientos,
                   SUM(lineas)::bigint         AS lineas,
                   SUM(monto_crc)              AS monto_crc
            FROM sicop.agg_mensual_tipo_procedimiento
            WHERE periodo BETWEEN :d AND :h
            GROUP BY tipo_procedimiento
            ORDER BY monto_crc DESC
            """
        ),
        {"d": desde, "h": hasta},
    ).all()
    total = sum(f.monto_crc or CERO for f in filas) or CERO
    salida = []
    for f in filas:
        item = TipoProcedimientoItem(**_fila_a_dict(f))
        item.participacion_pct = float(item.monto_crc / total * 100) if total else 0.0
        salida.append(item)
    return salida


def contrapartes_de_institucion(
    db: Session, ced_institucion: str, desde: int, hasta: int, limite: int = 10
) -> list[ContraparteItem]:
    filas = db.execute(
        text(
            """
            SELECT r.cedula_proveedor AS cedula,
                   p.nombre,
                   SUM(r.lineas)::bigint AS lineas,
                   SUM(r.monto_crc)      AS monto_crc
            FROM sicop.agg_mensual_relacion r
            LEFT JOIN sicop.dim_proveedor p ON p.cedula_proveedor = r.cedula_proveedor
            WHERE r.ced_institucion = :ced AND r.periodo BETWEEN :d AND :h
            GROUP BY r.cedula_proveedor, p.nombre
            ORDER BY monto_crc DESC
            LIMIT :lim
            """
        ),
        {"ced": ced_institucion, "d": desde, "h": hasta, "lim": limite},
    ).all()
    return _con_participacion(filas)


def contrapartes_de_proveedor(
    db: Session, cedula_proveedor: str, desde: int, hasta: int, limite: int = 10
) -> list[ContraparteItem]:
    filas = db.execute(
        text(
            """
            SELECT r.ced_institucion AS cedula,
                   i.nombre,
                   SUM(r.lineas)::bigint AS lineas,
                   SUM(r.monto_crc)      AS monto_crc
            FROM sicop.agg_mensual_relacion r
            LEFT JOIN sicop.dim_institucion i ON i.cedula = r.ced_institucion
            WHERE r.cedula_proveedor = :ced AND r.periodo BETWEEN :d AND :h
            GROUP BY r.ced_institucion, i.nombre
            ORDER BY monto_crc DESC
            LIMIT :lim
            """
        ),
        {"ced": cedula_proveedor, "d": desde, "h": hasta, "lim": limite},
    ).all()
    return _con_participacion(filas)


def _con_participacion(filas) -> list[ContraparteItem]:
    total = sum(f.monto_crc or CERO for f in filas) or CERO
    salida = []
    for f in filas:
        item = ContraparteItem(**_fila_a_dict(f))
        item.participacion_pct = float(item.monto_crc / total * 100) if total else 0.0
        salida.append(item)
    return salida


def concentracion_institucion(db: Session, ced_institucion: str, desde: int, hasta: int) -> float | None:
    """Índice Herfindahl-Hirschman normalizado del gasto por proveedor.

    Mide si una institución reparte sus compras o las concentra en pocos proveedores.
    """
    filas = db.execute(
        text(
            """
            SELECT SUM(monto_crc) AS monto
            FROM sicop.agg_mensual_relacion
            WHERE ced_institucion = :ced AND periodo BETWEEN :d AND :h
            GROUP BY cedula_proveedor
            """
        ),
        {"ced": ced_institucion, "d": desde, "h": hasta},
    ).all()
    montos = [float(f.monto or 0) for f in filas if f.monto and f.monto > 0]
    total = sum(montos)
    if not montos or total <= 0:
        return None
    return round(sum((m / total) ** 2 for m in montos), 4)


def resumen_institucion(db: Session, ced: str, desde: int, hasta: int) -> ResumenKPI:
    fila = db.execute(
        text(
            """
            SELECT COALESCE(SUM(procedimientos),0)      AS procedimientos,
                   COALESCE(SUM(lineas_adjudicadas),0)  AS lineas_adjudicadas,
                   COALESCE(SUM(monto_crc),0)           AS monto_crc,
                   COALESCE(SUM(monto_usd),0)           AS monto_usd,
                   COALESCE(MAX(proveedores_distintos),0) AS proveedores
            FROM sicop.agg_mensual_institucion
            WHERE ced_institucion = :ced AND periodo BETWEEN :d AND :h
            """
        ),
        {"ced": ced, "d": desde, "h": hasta},
    ).first()
    kpi = ResumenKPI(periodo_desde=desde, periodo_hasta=hasta, instituciones=1, **_fila_a_dict(fila))
    if kpi.lineas_adjudicadas:
        kpi.monto_promedio_crc = (kpi.monto_crc / kpi.lineas_adjudicadas).quantize(Decimal("0.01"))
    return kpi


def resumen_proveedor(db: Session, ced: str, desde: int, hasta: int) -> ResumenKPI:
    fila = db.execute(
        text(
            """
            SELECT COALESCE(SUM(adjudicaciones),0)     AS procedimientos,
                   COALESCE(SUM(lineas_adjudicadas),0) AS lineas_adjudicadas,
                   COALESCE(SUM(monto_crc),0)          AS monto_crc,
                   COALESCE(SUM(monto_usd),0)          AS monto_usd,
                   COALESCE(MAX(instituciones_distintas),0) AS instituciones,
                   COALESCE(SUM(invitaciones),0)       AS invitaciones,
                   COALESCE(SUM(ofertas),0)            AS ofertas
            FROM sicop.agg_mensual_proveedor
            WHERE cedula_proveedor = :ced AND periodo BETWEEN :d AND :h
            """
        ),
        {"ced": ced, "d": desde, "h": hasta},
    ).first()
    kpi = ResumenKPI(periodo_desde=desde, periodo_hasta=hasta, proveedores=1, **_fila_a_dict(fila))
    if kpi.lineas_adjudicadas:
        kpi.monto_promedio_crc = (kpi.monto_crc / kpi.lineas_adjudicadas).quantize(Decimal("0.01"))
    return kpi


def serie_institucion(db: Session, ced: str, desde: int, hasta: int) -> list[PuntoSerie]:
    filas = db.execute(
        text(
            """
            SELECT periodo, procedimientos, lineas_adjudicadas, monto_crc, monto_usd
            FROM sicop.agg_mensual_institucion
            WHERE ced_institucion = :ced AND periodo BETWEEN :d AND :h
            ORDER BY periodo
            """
        ),
        {"ced": ced, "d": desde, "h": hasta},
    ).all()
    return [
        PuntoSerie(
            periodo=f.periodo, etiqueta=etiqueta(f.periodo), procedimientos=f.procedimientos,
            lineas=f.lineas_adjudicadas, monto_crc=f.monto_crc, monto_usd=f.monto_usd,
        )
        for f in filas
    ]


def serie_proveedor(db: Session, ced: str, desde: int, hasta: int) -> list[PuntoSerie]:
    filas = db.execute(
        text(
            """
            SELECT periodo, adjudicaciones, lineas_adjudicadas, monto_crc, monto_usd
            FROM sicop.agg_mensual_proveedor
            WHERE cedula_proveedor = :ced AND periodo BETWEEN :d AND :h
            ORDER BY periodo
            """
        ),
        {"ced": ced, "d": desde, "h": hasta},
    ).all()
    return [
        PuntoSerie(
            periodo=f.periodo, etiqueta=etiqueta(f.periodo), procedimientos=f.adjudicaciones,
            lineas=f.lineas_adjudicadas, monto_crc=f.monto_crc, monto_usd=f.monto_usd,
        )
        for f in filas
    ]


def opciones_filtro(db: Session, desde: int, hasta: int) -> OpcionesFiltro:
    periodos = [
        int(f[0])
        for f in db.execute(
            text(
                "SELECT periodo FROM sicop.agg_mensual_global "
                "WHERE periodo BETWEEN :d AND :h ORDER BY periodo"
            ),
            {"d": desde, "h": hasta},
        ).all()
    ]
    tipos = [
        f[0]
        for f in db.execute(
            text(
                "SELECT DISTINCT tipo_procedimiento FROM sicop.agg_mensual_tipo_procedimiento "
                "WHERE periodo BETWEEN :d AND :h ORDER BY 1"
            ),
            {"d": desde, "h": hasta},
        ).all()
        if f[0]
    ]
    objetos = [
        f[0]
        for f in db.execute(
            text(
                "SELECT DISTINCT objeto_gasto FROM sicop.agg_mensual_categoria "
                "WHERE periodo BETWEEN :d AND :h ORDER BY 1"
            ),
            {"d": desde, "h": hasta},
        ).all()
        if f[0]
    ]
    actualizado = db.execute(
        text("SELECT MAX(actualizado_en) FROM sicop.agg_mensual_global")
    ).scalar()
    return OpcionesFiltro(
        periodos=periodos,
        anios=sorted({p // 100 for p in periodos}),
        tipos_procedimiento=tipos,
        objetos_gasto=objetos,
        monedas=["CRC", "USD"],
        actualizado_en=actualizado,
    )
