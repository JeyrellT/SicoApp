"""Carga de un periodo a PostgreSQL usando COPY.

Estrategia: reemplazo total de la partición del mes. Nunca se hace append. Así
una fila corregida o eliminada en el origen desaparece también acá, y las tablas
que un mes llegan vacías se completan solas cuando el origen las publica.
"""

from __future__ import annotations

import logging
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.etl import ddl, lectura
from app.etl.tipos import TablaSpec, tipo_sql

log = logging.getLogger(__name__)

LOTE_LOG = 250_000


@dataclass
class ResultadoTabla:
    tabla: str
    filas: int = 0
    filas_malas: int = 0
    omitida: bool = False
    motivo: str = ""


@dataclass
class Acumulador:
    """Datos de dimensión encontrados dentro de las tablas de hechos."""

    instituciones: dict[str, dict[str, str]] = field(default_factory=dict)
    proveedores: dict[str, dict[str, str]] = field(default_factory=dict)
    procedimientos: dict[str, dict[str, str]] = field(default_factory=dict)

    def destino(self, dimension: str) -> dict[str, dict[str, str]]:
        return {
            "dim_institucion": self.instituciones,
            "dim_proveedor": self.proveedores,
            "dim_procedimiento": self.procedimientos,
        }[dimension]


def _cursor_crudo(conn: Connection):
    """Cursor psycopg3 real: COPY no está expuesto por la capa ORM."""
    return conn.connection.driver_connection.cursor()


def cargar_tabla(
    conn: Connection,
    spec: TablaSpec,
    ruta_zip: Path,
    periodo: int,
    acumulador: Acumulador,
) -> ResultadoTabla:
    res = ResultadoTabla(tabla=spec.tabla)

    with zipfile.ZipFile(ruta_zip) as z:
        miembros = {n.lower(): n for n in z.namelist()}
    miembro = miembros.get(spec.archivo.lower())
    if miembro is None:
        if spec.opcional:
            res.omitida = True
            res.motivo = "no viene en el ZIP"
            log.info("%s: ausente del ZIP de %s (opcional).", spec.archivo, periodo)
            return res
        raise FileNotFoundError(f"{spec.archivo} no está en el ZIP del periodo {periodo}.")

    if spec.particionada:
        ddl.vaciar_particion(conn, spec, periodo)
        destino = f"{ddl.ESQUEMA}.{ddl.nombre_particion(spec.tabla, periodo)}"
    else:
        # Las dimensiones maestras son un snapshot: se cargan a staging y se fusionan.
        destino = f"tmp_{spec.tabla}"
        # Las cédulas van como text en el staging para que nada se trunque antes
        # de la fusión; el resto usa el tipo real traducido a SQL.
        cols_def = ", ".join(
            f"{c.col} {'text' if c.tipo.startswith('cedula') else tipo_sql(c.tipo)}"
            for c in spec.columnas_guardadas
        )
        conn.execute(text(f"CREATE TEMP TABLE {destino} ({cols_def}) ON COMMIT DROP"))

    columnas = spec.nombres_destino
    lista_cols = ", ".join(columnas)
    lectura_res = lectura.ResultadoLectura()
    vistos: set[tuple] = set()

    cur = _cursor_crudo(conn)
    try:
        with cur.copy(f"COPY {destino} ({lista_cols}) FROM STDIN") as copy:
            for registro in lectura.leer(
                ruta_zip,
                miembro,
                lectura_res,
                delimitador=spec.delimitador,
                columna_libre=spec.columna_libre,
            ):
                _acumular_dimensiones(spec, registro, periodo, acumulador)
                fila = spec.fila(registro, periodo)
                if spec.dedup:
                    if fila in vistos:
                        continue
                    vistos.add(fila)
                copy.write_row(fila)
                res.filas += 1
                if res.filas % LOTE_LOG == 0:
                    log.info("%s: %d filas copiadas...", spec.tabla, res.filas)
    finally:
        cur.close()

    res.filas_malas = lectura_res.filas_malas

    if not spec.particionada:
        _fusionar_dimension(conn, spec, destino)

    if res.filas == 0:
        res.motivo = "el origen publicó la tabla vacía"
    log.info(
        "%s: %d filas (%d descartadas por formato)%s",
        spec.tabla,
        res.filas,
        res.filas_malas,
        f" — {res.motivo}" if res.motivo else "",
    )
    return res


def _es_cedula(nombre_csv: str) -> bool:
    u = nombre_csv.upper()
    return "CEDULA" in u or u.startswith("CED_") or u == "CED"


def _valor_normalizado(nombre_csv: str, crudo: str | None) -> str | None:
    """Normaliza igual que la tabla de hechos.

    Si el hecho guarda '3101677835' y la dimensión guardara '3-101-677835',
    el join entre ambos devolvería vacío sin dar ningún error.
    """
    if _es_cedula(nombre_csv):
        return lectura.cedula(crudo)
    return lectura.texto(crudo)


def descartar_detalle_voluminoso(conn: Connection, periodo: int) -> list[str]:
    """Vacía las particiones cuyo detalle no se conserva, ya calculados sus agregados.

    Se carga primero y se descarta después, en vez de no cargar: así el agregado
    se calcula en SQL sobre la tabla real (exacto y sin costo de memoria) y el
    espacio solo se ocupa durante la transacción.

    Devuelve los nombres de las particiones vaciadas.
    """
    from app.config import get_settings

    if get_settings().etl_invitaciones_detalle:
        return []

    vaciadas: list[str] = []
    for tabla in ("invitacion_procedimiento",):
        p = ddl.nombre_particion(tabla, periodo)
        existe = conn.execute(
            text(
                "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = :esq AND c.relname = :t"
            ),
            {"esq": ddl.ESQUEMA, "t": p},
        ).scalar()
        if existe:
            conn.execute(text(f"TRUNCATE TABLE {ddl.ESQUEMA}.{p}"))
            vaciadas.append(p)
    return vaciadas


def _acumular_dimensiones(
    spec: TablaSpec, registro: dict[str, str | None], periodo: int, acc: Acumulador
) -> None:
    for enr in spec.enriquece:
        clave = _valor_normalizado(enr.clave_csv, registro.get(enr.clave_csv))
        if not clave:
            continue
        actual = acc.destino(enr.dimension).setdefault(clave, {})
        for col_csv, col_dim in enr.campos.items():
            valor = _valor_normalizado(col_csv, registro.get(col_csv))
            if valor and not actual.get(col_dim):
                actual[col_dim] = valor


def _fusionar_dimension(conn: Connection, spec: TablaSpec, staging: str) -> None:
    """Upsert del snapshot maestro hacia la dimensión definitiva."""
    cols = [c.col for c in spec.columnas_guardadas]
    clave = list(spec.clave)
    actualizables = [c for c in cols if c not in clave]
    sets = ", ".join(
        f"{c} = COALESCE(EXCLUDED.{c}, {ddl.ESQUEMA}.{spec.tabla}.{c})" for c in actualizables
    )
    sets = f"{sets}, actualizado_en = now()" if actualizables else "actualizado_en = now()"
    lista = ", ".join(cols)
    conn.execute(
        text(
            f"""
            INSERT INTO {ddl.ESQUEMA}.{spec.tabla} ({lista})
            SELECT DISTINCT ON ({', '.join(clave)}) {lista}
            FROM {staging}
            WHERE {' AND '.join(f'{k} IS NOT NULL' for k in clave)}
            ON CONFLICT ({', '.join(clave)}) DO UPDATE SET {sets}
            """
        )
    )


def fusionar_acumulado(conn: Connection, acc: Acumulador, periodo: int) -> None:
    """Vuelca a las dimensiones lo que apareció solo dentro de las tablas de hechos."""
    if acc.instituciones:
        conn.execute(
            text(
                f"""
                INSERT INTO {ddl.ESQUEMA}.dim_institucion (cedula, nombre)
                VALUES (:cedula, :nombre)
                ON CONFLICT (cedula) DO UPDATE
                    SET nombre = COALESCE({ddl.ESQUEMA}.dim_institucion.nombre, EXCLUDED.nombre),
                        actualizado_en = now()
                """
            ),
            [
                {"cedula": k, "nombre": v.get("nombre")}
                for k, v in acc.instituciones.items()
                if k
            ],
        )
    if acc.proveedores:
        filas = [
            {"cedula": k, "nombre": v.get("nombre")} for k, v in acc.proveedores.items() if k
        ]
        for i in range(0, len(filas), 5000):
            conn.execute(
                text(
                    f"""
                    INSERT INTO {ddl.ESQUEMA}.dim_proveedor (cedula_proveedor, nombre)
                    VALUES (:cedula, :nombre)
                    ON CONFLICT (cedula_proveedor) DO UPDATE
                        SET nombre = COALESCE({ddl.ESQUEMA}.dim_proveedor.nombre, EXCLUDED.nombre),
                            actualizado_en = now()
                    """
                ),
                filas[i : i + 5000],
            )
    if acc.procedimientos:
        filas = [
            {
                "nro_sicop": k,
                "numero_procedimiento": v.get("numero_procedimiento"),
                "descripcion": v.get("descripcion"),
                "ced_institucion": v.get("ced_institucion"),
                "periodo": periodo,
            }
            for k, v in acc.procedimientos.items()
            if k
        ]
        for i in range(0, len(filas), 5000):
            conn.execute(
                text(
                    f"""
                    INSERT INTO {ddl.ESQUEMA}.dim_procedimiento
                        (nro_sicop, numero_procedimiento, descripcion, ced_institucion,
                         primer_periodo, ultimo_periodo)
                    VALUES (:nro_sicop, :numero_procedimiento, :descripcion, :ced_institucion,
                            :periodo, :periodo)
                    ON CONFLICT (nro_sicop) DO UPDATE SET
                        numero_procedimiento = COALESCE(
                            EXCLUDED.numero_procedimiento,
                            {ddl.ESQUEMA}.dim_procedimiento.numero_procedimiento),
                        descripcion = COALESCE(
                            EXCLUDED.descripcion, {ddl.ESQUEMA}.dim_procedimiento.descripcion),
                        ced_institucion = COALESCE(
                            EXCLUDED.ced_institucion,
                            {ddl.ESQUEMA}.dim_procedimiento.ced_institucion),
                        primer_periodo = LEAST(
                            {ddl.ESQUEMA}.dim_procedimiento.primer_periodo, EXCLUDED.primer_periodo),
                        ultimo_periodo = GREATEST(
                            {ddl.ESQUEMA}.dim_procedimiento.ultimo_periodo, EXCLUDED.ultimo_periodo),
                        actualizado_en = now()
                    """
                ),
                filas[i : i + 5000],
            )
    log.info(
        "Dimensiones enriquecidas: %d instituciones, %d proveedores, %d procedimientos.",
        len(acc.instituciones),
        len(acc.proveedores),
        len(acc.procedimientos),
    )
