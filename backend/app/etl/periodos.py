"""Aritmética de periodos yyyymm y ventana de retención de 24 meses."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.config import get_settings

Periodo = int  # yyyymm, p.ej. 202607


def zona() -> ZoneInfo:
    return ZoneInfo(get_settings().tz)


def hoy_local() -> date:
    """Fecha en Costa Rica. El corte de mes debe seguir el calendario local, no UTC."""
    return datetime.now(zona()).date()


def periodo_actual(hoy: date | None = None) -> Periodo:
    d = hoy or hoy_local()
    return d.year * 100 + d.month


def a_partes(p: Periodo) -> tuple[int, int]:
    return divmod(p, 100)


def valido(p: Periodo) -> bool:
    anio, mes = a_partes(p)
    return 2010 <= anio <= 2100 and 1 <= mes <= 12


def sumar_meses(p: Periodo, n: int) -> Periodo:
    anio, mes = a_partes(p)
    total = anio * 12 + (mes - 1) + n
    return (total // 12) * 100 + (total % 12) + 1


def anterior(p: Periodo) -> Periodo:
    return sumar_meses(p, -1)


def rango(desde: Periodo, hasta: Periodo) -> list[Periodo]:
    if desde > hasta:
        return []
    out, cur = [], desde
    while cur <= hasta:
        out.append(cur)
        cur = sumar_meses(cur, 1)
    return out


def ventana_retencion(hoy: date | None = None, meses: int | None = None) -> list[Periodo]:
    """Los N periodos que deben existir en la base (por defecto 24, incluyendo el actual)."""
    n = meses or get_settings().retention_months
    actual = periodo_actual(hoy)
    return rango(sumar_meses(actual, -(n - 1)), actual)


def fuera_de_ventana(p: Periodo, hoy: date | None = None, meses: int | None = None) -> bool:
    v = ventana_retencion(hoy, meses)
    return p < v[0]


def etiqueta(p: Periodo) -> str:
    """202607 -> '2026-07'."""
    anio, mes = a_partes(p)
    return f"{anio:04d}-{mes:02d}"
