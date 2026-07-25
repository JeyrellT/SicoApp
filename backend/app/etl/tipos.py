"""Modelo declarativo de tablas: única fuente de verdad del esquema y del ETL.

De estas declaraciones salen el DDL (app/etl/ddl.py) y la carga (app/etl/carga.py),
de modo que no puedan divergir. Un test verifica que las columnas declaradas
coincidan con los encabezados reales del ZIP.

Reglas de tipificación derivadas del perfilado de datos reales:
  - Cédulas y códigos NUNCA son enteros: traen ceros a la izquierda ('0702490992').
  - Los montos vienen con ruido de float64 ('466.67000000000002'): se redondean.
  - Los identificadores se guardan como varchar aunque parezcan numéricos.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from app.etl import lectura

# --- Tipos soportados ------------------------------------------------------

_RE_VARCHAR = re.compile(r"^varchar\((\d+)\)$")
_RE_CEDULA = re.compile(r"^cedula\((\d+)\)$")
_RE_NUMERIC = re.compile(r"^numeric\((\d+),\s*(\d+)\)$")

DECIMALES_REDONDEO = 6  # corta el ruido de serialización float64 del origen


def conversor_de(tipo: str) -> Callable[[str | None], Any]:
    """Devuelve el conversor de texto CSV -> valor Python para un tipo SQL."""
    t = tipo.strip().lower()

    m = _RE_CEDULA.match(t)
    if m:
        largo = int(m.group(1))

        def _ced(v: str | None) -> str | None:
            x = lectura.cedula(v)
            return x[:largo] if x else None

        return _ced

    m = _RE_VARCHAR.match(t)
    if m:
        largo = int(m.group(1))
        return lambda v: lectura.texto(v, largo)

    if t == "text":
        return lambda v: lectura.texto(v)

    if t in ("bigint", "integer", "smallint"):
        return lectura.entero

    m = _RE_NUMERIC.match(t)
    if m:
        def _num(v: str | None) -> Decimal | None:
            d = lectura.numerico(v)
            return None if d is None else round(d, DECIMALES_REDONDEO)

        return _num

    if t == "date":
        return lectura.fecha
    if t == "fecha_compacta":
        return lectura.fecha_compacta
    if t in ("timestamp", "timestamptz"):
        return lectura.marca_tiempo
    if t == "boolean":
        return lectura.si_no

    raise ValueError(f"Tipo no soportado en la especificación: {tipo!r}")


def tipo_sql(tipo: str) -> str:
    """Tipo tal como se escribe en el DDL ('cedula(10)' es varchar por dentro)."""
    t = tipo.strip().lower()
    m = _RE_CEDULA.match(t)
    if m:
        return f"varchar({m.group(1)})"
    if t == "fecha_compacta":
        return "date"
    return tipo


# --- Declaraciones ---------------------------------------------------------


@dataclass(frozen=True)
class Columna:
    """Una columna del CSV.

    col=None significa que el dato NO se almacena en la tabla de hechos porque es
    derivable por join (p. ej. el nombre de la institución). Igual puede usarse
    para enriquecer una dimensión.
    """

    csv: str
    col: str | None
    tipo: str = "text"
    indice: bool = False

    @property
    def almacenada(self) -> bool:
        return self.col is not None


@dataclass(frozen=True)
class Enriquecimiento:
    """Alimenta una dimensión con datos que aparecen dentro de una tabla de hechos.

    Evita perder nombres que solo existen en el hecho y no en el archivo maestro.
    """

    dimension: str
    clave_csv: str
    campos: dict[str, str]  # {columna_csv: columna_dimension}


@dataclass(frozen=True)
class TablaSpec:
    archivo: str                 # nombre dentro del ZIP
    tabla: str                   # tabla destino en el esquema sicop
    clave: tuple[str, ...]       # clave natural (nombres de columna en Postgres)
    columnas: tuple[Columna, ...]
    delimitador: str = ";"
    particionada: bool = True    # las dimensiones no se particionan por periodo
    dedup: bool = False          # el origen trae filas duplicadas exactas
    # Columna de texto libre que puede traer el delimitador sin comillas y parte
    # la fila; permite reconstruirla en vez de correr las columnas siguientes.
    columna_libre: str | None = None
    enriquece: tuple[Enriquecimiento, ...] = field(default_factory=tuple)
    opcional: bool = False       # puede no venir en el ZIP algunos meses
    indices: tuple[tuple[str, ...], ...] = field(default_factory=tuple)
    comentario: str = ""

    @property
    def columnas_guardadas(self) -> tuple[Columna, ...]:
        return tuple(c for c in self.columnas if c.almacenada)

    @property
    def nombres_destino(self) -> list[str]:
        cols = [c.col for c in self.columnas_guardadas]
        if self.particionada:
            cols.insert(0, "periodo")
        return cols  # type: ignore[return-value]

    def conversores(self) -> list[tuple[str, Callable[[str | None], Any]]]:
        return [(c.csv, conversor_de(c.tipo)) for c in self.columnas_guardadas]

    def fila(self, registro: dict[str, str | None], periodo: int) -> tuple:
        """Convierte una fila cruda del CSV a la tupla que se manda por COPY."""
        vals: list[Any] = [periodo] if self.particionada else []
        for c in self.columnas_guardadas:
            vals.append(conversor_de(c.tipo)(registro.get(c.csv)))
        return tuple(vals)


def validar_specs(specs: list[TablaSpec]) -> None:
    """Chequeos de coherencia que corren en tiempo de import y en los tests."""
    vistos: set[str] = set()
    for s in specs:
        if s.tabla in vistos:
            raise ValueError(f"Tabla duplicada en la especificación: {s.tabla}")
        vistos.add(s.tabla)

        if not s.columnas:
            raise ValueError(f"{s.tabla}: sin columnas declaradas.")

        destino = [c.col for c in s.columnas_guardadas]
        if len(destino) != len(set(destino)):
            raise ValueError(f"{s.tabla}: nombres de columna destino repetidos.")

        for k in s.clave:
            if k not in destino and k != "periodo":
                raise ValueError(f"{s.tabla}: la clave '{k}' no está entre las columnas guardadas.")

        for c in s.columnas:
            conversor_de(c.tipo)  # levanta si el tipo no existe

        for idx in s.indices:
            for col in idx:
                if col not in destino and col != "periodo":
                    raise ValueError(f"{s.tabla}: índice sobre columna inexistente '{col}'.")
