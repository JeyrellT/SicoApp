"""Lectura tolerante de los CSV de SICOP.

Dialecto observado en los archivos reales: delimitador ';', comillas dobles,
UTF-8 (a veces con BOM), fin de línea CRLF, encabezado en la primera fila y
marcas de tiempo con 7 decimales ('2026-07-02 00:00:00.0000000').

Algunos archivos traen comillas mal balanceadas. El lector cuenta las filas
descartadas y falla solo si superan un umbral, para que un dato sucio aislado
no bote la carga del mes entero.
"""

from __future__ import annotations

import csv
import io
import logging
import sys
import zipfile
from collections.abc import Iterator
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

log = logging.getLogger(__name__)

DELIMITADOR = ";"
ENCODING = "utf-8-sig"
UMBRAL_FILAS_MALAS = 0.01  # 1 %

# Campos largos: descripciones de bienes y servicios superan el default de 128 KB.
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))


class LecturaError(Exception):
    pass


class ResultadoLectura:
    def __init__(self) -> None:
        self.filas_ok = 0
        self.filas_malas = 0
        self.filas_reparadas = 0

    @property
    def total(self) -> int:
        return self.filas_ok + self.filas_malas

    def verificar(self, nombre: str) -> None:
        if self.filas_malas and self.filas_malas > max(10, self.total * UMBRAL_FILAS_MALAS):
            raise LecturaError(
                f"{nombre}: {self.filas_malas} de {self.total} filas ilegibles "
                f"(> {UMBRAL_FILAS_MALAS:.0%}). Se aborta la carga."
            )


def encabezado(ruta_zip: Path, miembro: str, delimitador: str = DELIMITADOR) -> list[str]:
    with zipfile.ZipFile(ruta_zip) as z, z.open(miembro) as raw:
        texto = io.TextIOWrapper(raw, encoding=ENCODING, newline="")
        primera = texto.readline()
    return [c.strip().strip('"') for c in primera.rstrip("\r\n").split(delimitador)]


def reparar_fila(fila: list[str], ncols: int, idx_libre: int, delimitador: str) -> list[str]:
    """Reconstruye una fila partida por delimitadores dentro de un texto sin comillas.

    Ocurre de verdad: descripciones como "QUESO CREMA, GRASA DE 21%; ENVASE 3,7 L"
    parten la fila y desplazan las columnas siguientes, de modo que un campo de
    monto termina conteniendo un número de contrato. Se reagrupa el excedente
    dentro de la columna de texto libre, que es la única que puede contenerlo.
    """
    sobrante = len(fila) - ncols
    if sobrante <= 0 or not 0 <= idx_libre < ncols:
        return fila
    fin = idx_libre + sobrante + 1
    return fila[:idx_libre] + [delimitador.join(fila[idx_libre:fin])] + fila[fin:]


def leer(
    ruta_zip: Path,
    miembro: str,
    resultado: ResultadoLectura | None = None,
    delimitador: str = DELIMITADOR,
    columna_libre: str | None = None,
) -> Iterator[dict[str, str | None]]:
    """Itera el CSV como diccionarios {columna: valor|None}, en streaming.

    El delimitador es parámetro porque SancionProveedores.csv usa coma mientras
    las otras 24 tablas usan punto y coma. `columna_libre` indica cuál columna
    puede contener el delimitador sin comillas, para poder reparar la fila.
    """
    res = resultado if resultado is not None else ResultadoLectura()
    with zipfile.ZipFile(ruta_zip) as z, z.open(miembro) as raw:
        texto = io.TextIOWrapper(raw, encoding=ENCODING, newline="", errors="replace")
        lector = csv.reader(texto, delimiter=delimitador, quotechar='"', doublequote=True)
        try:
            cols = [c.strip().strip('"') for c in next(lector)]
        except StopIteration:
            return
        ncols = len(cols)
        idx_libre = cols.index(columna_libre) if columna_libre in cols else -1
        while True:
            try:
                fila = next(lector)
            except StopIteration:
                break
            except csv.Error as e:  # comillas rotas: se descarta la fila, no el archivo
                res.filas_malas += 1
                if res.filas_malas <= 5:
                    log.warning("%s: fila ilegible (%s)", miembro, e)
                continue
            if not fila or (len(fila) == 1 and not fila[0].strip()):
                continue
            if len(fila) > ncols and idx_libre >= 0:
                fila = reparar_fila(fila, ncols, idx_libre, delimitador)
                res.filas_reparadas += 1
            if len(fila) != ncols:
                # Filas que aun así no cuadran: se ajustan en vez de perderse.
                if len(fila) > ncols:
                    fila = fila[:ncols]
                else:
                    fila = fila + [""] * (ncols - len(fila))
                res.filas_malas += 1
            res.filas_ok += 1
            yield {c: (v if v != "" else None) for c, v in zip(cols, fila, strict=False)}
    res.verificar(miembro)


# --- Conversores -----------------------------------------------------------


def texto(v: str | None, largo: int | None = None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if largo and len(v) > largo:
        return v[:largo]
    return v


def entero(v: str | None) -> int | None:
    if v is None:
        return None
    v = v.strip().replace(",", "")
    if not v:
        return None
    try:
        return int(float(v)) if ("." in v or "e" in v.lower()) else int(v)
    except (TypeError, ValueError):
        return None


def numerico(v: str | None) -> Decimal | None:
    """Convierte un monto a Decimal.

    Los datos observados usan punto decimal y sin separador de miles, pero un
    monto con coma es ambiguo y equivocarse cambia el valor 100 veces. Se aplica
    la regla del último separador: el que aparece de último es el decimal. Con
    una sola coma se asume decimal, que es la convención de Costa Rica.
    """
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if "," in v:
        if "." in v:
            if v.rfind(",") > v.rfind("."):
                v = v.replace(".", "").replace(",", ".")
            else:
                v = v.replace(",", "")
        else:
            v = v.replace(",", ".")
    try:
        d = Decimal(v)
    except (InvalidOperation, ValueError):
        return None
    # Fuera del rango de numeric(20,4) usado en el esquema: se descarta el valor.
    if d.copy_abs() >= Decimal("1e16"):
        return None
    return d


def marca_tiempo(v: str | None) -> datetime | None:
    """'2026-07-02 00:00:00.0000000' -> datetime (se truncan los decimales a 6)."""
    if v is None:
        return None
    v = v.strip().strip('"')
    if not v:
        return None
    if "." in v:
        base, frac = v.split(".", 1)
        v = f"{base}.{frac[:6]}" if frac[:6].isdigit() and frac[:6] else base
    v = v.replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    return None


def fecha(v: str | None) -> date | None:
    dt = marca_tiempo(v)
    return dt.date() if dt else None


def fecha_compacta(v: str | None) -> date | None:
    """Fechas de 8 dígitos sin separadores: '29062026' es 29/06/2026.

    Aparecen en Proveedores (constitución, expiración) y SancionProveedores.
    Sin este conversor quedarían como el entero 29.062.026, que además de
    inservible daría totales absurdos si alguien lo sumara.
    El texto 'No aplica' del origen se trata como ausencia de fecha.
    """
    if v is None:
        return None
    x = v.strip().strip('"')
    if not x or not x.isdigit() or len(x) != 8:
        return None
    dia, mes, anio = int(x[0:2]), int(x[2:4]), int(x[4:8])
    try:
        return date(anio, mes, dia)
    except ValueError:
        pass
    # Algunas fuentes usan el orden inverso.
    anio, mes, dia = int(x[0:4]), int(x[4:6]), int(x[6:8])
    try:
        return date(anio, mes, dia)
    except ValueError:
        return None


def si_no(v: str | None) -> bool | None:
    """Campos 'Si'/'No' y 'S'/'N' del origen."""
    if v is None:
        return None
    x = v.strip().strip('"').lower()
    if x in ("si", "sí", "s", "true", "1", "y"):
        return True
    if x in ("no", "n", "false", "0"):
        return False
    return None


def cedula(v: str | None) -> str | None:
    """Normaliza cédulas: sin guiones ni espacios, para que crucen entre tablas."""
    if v is None:
        return None
    x = "".join(ch for ch in v.strip() if ch.isalnum())
    return x[:20] or None
