"""Generación del esquema a partir de las declaraciones de app/etl/tablas.py.

Decisiones de diseño que bajan el costo de almacenamiento (volumen de Railway a
$0.15/GB/mes) sin perder capacidad de consulta:

1. Las tablas de hechos NO llevan clave primaria. Cada mes se reemplaza entero
   (se elimina la partición y se vuelve a insertar), así que la unicidad no
   protege de nada y un índice único sobre 26 millones de filas costaría cientos
   de megabytes. La deduplicación se hace en el ETL donde el origen la necesita.
2. Los nombres de institución, proveedor y procedimiento no se repiten en los
   hechos: viven en dimensiones. Sobre la tabla de invitaciones eso ahorra ~52 %.
3. Los dashboards leen tablas de agregados precalculadas por el ETL, nunca las
   tablas de detalle. Un KPI cuesta un índice sobre miles de filas, no un scan
   sobre millones.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.etl.tipos import TablaSpec, tipo_sql

log = logging.getLogger(__name__)

ESQUEMA = "sicop"

# Dimensiones que no provienen de un CSV maestro sino que se derivan de los hechos.
SQL_DIMENSIONES_DERIVADAS = f"""
CREATE TABLE IF NOT EXISTS {ESQUEMA}.dim_procedimiento (
    nro_sicop             varchar(14)  PRIMARY KEY,
    numero_procedimiento  varchar(30),
    descripcion           text,
    ced_institucion       varchar(20),
    tipo_procedimiento    varchar(120),
    modalidad             varchar(120),
    primer_periodo        integer      NOT NULL,
    ultimo_periodo        integer      NOT NULL,
    actualizado_en        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_dim_procedimiento_inst
    ON {ESQUEMA}.dim_procedimiento (ced_institucion);
CREATE INDEX IF NOT EXISTS ix_dim_procedimiento_periodo
    ON {ESQUEMA}.dim_procedimiento (ultimo_periodo);
CREATE INDEX IF NOT EXISTS ix_dim_procedimiento_numero
    ON {ESQUEMA}.dim_procedimiento (numero_procedimiento);
"""

# Agregados que alimentan los dashboards. Se recalculan por periodo en cada carga.
SQL_AGREGADOS = f"""
CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_global (
    periodo                integer PRIMARY KEY,
    procedimientos         bigint  NOT NULL DEFAULT 0,
    lineas_adjudicadas     bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    monto_usd              numeric(24,2) NOT NULL DEFAULT 0,
    instituciones          integer NOT NULL DEFAULT 0,
    proveedores            integer NOT NULL DEFAULT 0,
    ofertas                bigint  NOT NULL DEFAULT 0,
    ordenes                bigint  NOT NULL DEFAULT 0,
    monto_ordenes_crc      numeric(24,2) NOT NULL DEFAULT 0,
    invitaciones           bigint  NOT NULL DEFAULT 0,
    actualizado_en         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_institucion (
    periodo                integer NOT NULL,
    ced_institucion        varchar(20) NOT NULL,
    procedimientos         bigint  NOT NULL DEFAULT 0,
    lineas_adjudicadas     bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    monto_usd              numeric(24,2) NOT NULL DEFAULT 0,
    proveedores_distintos  integer NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, ced_institucion)
);
CREATE INDEX IF NOT EXISTS ix_agg_inst_ced
    ON {ESQUEMA}.agg_mensual_institucion (ced_institucion, periodo);

CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_proveedor (
    periodo                integer NOT NULL,
    cedula_proveedor       varchar(20) NOT NULL,
    adjudicaciones         bigint  NOT NULL DEFAULT 0,
    lineas_adjudicadas     bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    monto_usd              numeric(24,2) NOT NULL DEFAULT 0,
    instituciones_distintas integer NOT NULL DEFAULT 0,
    invitaciones           bigint  NOT NULL DEFAULT 0,
    ofertas                bigint  NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, cedula_proveedor)
);
CREATE INDEX IF NOT EXISTS ix_agg_prov_ced
    ON {ESQUEMA}.agg_mensual_proveedor (cedula_proveedor, periodo);

CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_categoria (
    periodo                integer NOT NULL,
    objeto_gasto           varchar(60) NOT NULL,
    lineas                 bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    monto_usd              numeric(24,2) NOT NULL DEFAULT 0,
    proveedores_distintos  integer NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, objeto_gasto)
);

CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_tipo_procedimiento (
    periodo                integer NOT NULL,
    tipo_procedimiento     varchar(120) NOT NULL,
    procedimientos         bigint  NOT NULL DEFAULT 0,
    lineas                 bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, tipo_procedimiento)
);

-- Relación institución x proveedor: alimenta "principales contrapartes" del perfil.
CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_mensual_relacion (
    periodo                integer NOT NULL,
    ced_institucion        varchar(20) NOT NULL,
    cedula_proveedor       varchar(20) NOT NULL,
    lineas                 bigint  NOT NULL DEFAULT 0,
    monto_crc              numeric(24,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, ced_institucion, cedula_proveedor)
);
CREATE INDEX IF NOT EXISTS ix_agg_rel_prov
    ON {ESQUEMA}.agg_mensual_relacion (cedula_proveedor, periodo);

-- Invitaciones resumidas por procedimiento: evita indexar la tabla de 26 M de filas.
CREATE TABLE IF NOT EXISTS {ESQUEMA}.agg_invitaciones_procedimiento (
    periodo                integer NOT NULL,
    nro_sicop              varchar(14) NOT NULL,
    invitados              integer NOT NULL DEFAULT 0,
    PRIMARY KEY (periodo, nro_sicop)
);
"""


def sql_crear_esquema() -> list[str]:
    return [
        f"CREATE SCHEMA IF NOT EXISTS {ESQUEMA}",
        "CREATE SCHEMA IF NOT EXISTS ops",
        "CREATE SCHEMA IF NOT EXISTS auth",
    ]


def sql_tabla(spec: TablaSpec) -> list[str]:
    """DDL de una tabla declarada (dimensión o hecho particionado)."""
    cols: list[str] = []
    if spec.particionada:
        cols.append("periodo integer NOT NULL")
    for c in spec.columnas_guardadas:
        cols.append(f"{c.col} {tipo_sql(c.tipo)}")

    sentencias: list[str] = []
    if spec.particionada:
        cuerpo = ",\n    ".join(cols)
        sentencias.append(
            f"CREATE TABLE IF NOT EXISTS {ESQUEMA}.{spec.tabla} (\n    {cuerpo}\n)"
            f" PARTITION BY LIST (periodo)"
        )
    else:
        cols.append("actualizado_en timestamptz NOT NULL DEFAULT now()")
        cols.append(f"PRIMARY KEY ({', '.join(spec.clave)})")
        cuerpo = ",\n    ".join(cols)
        sentencias.append(f"CREATE TABLE IF NOT EXISTS {ESQUEMA}.{spec.tabla} (\n    {cuerpo}\n)")

    for idx in spec.indices:
        nombre = f"ix_{spec.tabla}_{'_'.join(idx)}"[:63]
        columnas = ", ".join(idx)
        sentencias.append(
            f"CREATE INDEX IF NOT EXISTS {nombre} ON {ESQUEMA}.{spec.tabla} ({columnas})"
        )
    return sentencias


def nombre_particion(tabla: str, periodo: int) -> str:
    return f"{tabla}_p{periodo}"


def sql_particion(spec: TablaSpec, periodo: int) -> str:
    p = nombre_particion(spec.tabla, periodo)
    return (
        f"CREATE TABLE IF NOT EXISTS {ESQUEMA}.{p} "
        f"PARTITION OF {ESQUEMA}.{spec.tabla} FOR VALUES IN ({periodo})"
    )


def crear_esquema(conn: Connection, specs: tuple[TablaSpec, ...]) -> None:
    """Crea (idempotente) el esquema completo: dimensiones, hechos y agregados."""
    for s in sql_crear_esquema():
        conn.execute(text(s))
    for spec in specs:
        for s in sql_tabla(spec):
            conn.execute(text(s))
    for bloque in (SQL_DIMENSIONES_DERIVADAS, SQL_AGREGADOS):
        for s in filter(None, (x.strip() for x in bloque.split(";"))):
            conn.execute(text(s))
    log.info("Esquema %s verificado (%d tablas declaradas).", ESQUEMA, len(specs))


def crear_particiones(conn: Connection, specs: tuple[TablaSpec, ...], periodo: int) -> None:
    for spec in specs:
        if spec.particionada:
            conn.execute(text(sql_particion(spec, periodo)))


def eliminar_particiones(conn: Connection, specs: tuple[TablaSpec, ...], periodo: int) -> int:
    """Elimina las particiones de un periodo. DROP libera el espacio de inmediato."""
    n = 0
    for spec in specs:
        if not spec.particionada:
            continue
        p = nombre_particion(spec.tabla, periodo)
        conn.execute(text(f"DROP TABLE IF EXISTS {ESQUEMA}.{p}"))
        n += 1
    return n


def vaciar_particion(conn: Connection, spec: TablaSpec, periodo: int) -> None:
    """Deja la partición del periodo vacía y lista para recibir la carga nueva."""
    p = nombre_particion(spec.tabla, periodo)
    conn.execute(text(sql_particion(spec, periodo)))
    conn.execute(text(f"TRUNCATE TABLE {ESQUEMA}.{p}"))


def periodos_existentes(conn: Connection) -> list[int]:
    """Periodos con datos, leídos de las particiones creadas."""
    filas = conn.execute(
        text(
            """
            SELECT DISTINCT substring(c.relname from '_p(\\d{6})$')::int AS periodo
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = :esq
              AND c.relispartition
              AND c.relname ~ '_p\\d{6}$'
            ORDER BY 1
            """
        ),
        {"esq": ESQUEMA},
    ).all()
    return [f[0] for f in filas if f[0]]
