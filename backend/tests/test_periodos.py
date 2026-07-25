"""Aritmética de periodos y ventana móvil de 24 meses."""

from __future__ import annotations

from datetime import date

import pytest

from app.etl import periodos as p


def test_periodo_actual_usa_la_fecha_local():
    assert p.periodo_actual(date(2026, 7, 25)) == 202607
    assert p.periodo_actual(date(2026, 1, 1)) == 202601
    assert p.periodo_actual(date(2025, 12, 31)) == 202512


@pytest.mark.parametrize(
    "inicio,n,esperado",
    [
        (202607, 1, 202608),
        (202612, 1, 202701),
        (202601, -1, 202512),
        (202601, -12, 202501),
        (202607, -23, 202408),
        (202603, 0, 202603),
    ],
)
def test_sumar_meses_cruza_bien_el_cambio_de_ano(inicio, n, esperado):
    assert p.sumar_meses(inicio, n) == esperado


def test_anterior_es_el_inverso_de_sumar_uno():
    for periodo in (202601, 202612, 202507, 202101):
        assert p.anterior(p.sumar_meses(periodo, 1)) == periodo


def test_rango_incluye_ambos_extremos():
    r = p.rango(202601, 202603)
    assert r == [202601, 202602, 202603]
    assert p.rango(202603, 202601) == []
    assert p.rango(202605, 202605) == [202605]


def test_ventana_de_retencion_tiene_exactamente_24_meses():
    v = p.ventana_retencion(date(2026, 7, 25), meses=24)
    assert len(v) == 24
    assert v[-1] == 202607, "el último es el mes en curso"
    assert v[0] == 202408, "el primero es 23 meses atrás"
    assert v == sorted(v)


def test_ventana_de_retencion_respeta_el_parametro():
    assert len(p.ventana_retencion(date(2026, 7, 25), meses=12)) == 12
    assert p.ventana_retencion(date(2026, 7, 25), meses=1) == [202607]


def test_fuera_de_ventana_detecta_lo_que_hay_que_borrar():
    hoy = date(2026, 7, 25)
    assert p.fuera_de_ventana(202407, hoy, 24) is True, "24 meses atrás ya no entra"
    assert p.fuera_de_ventana(202408, hoy, 24) is False, "es el borde inferior, se conserva"
    assert p.fuera_de_ventana(202607, hoy, 24) is False


def test_validez_de_periodos():
    assert p.valido(202607)
    assert p.valido(201001)
    assert not p.valido(202613), "no existe el mes 13"
    assert not p.valido(202600), "no existe el mes 0"
    assert not p.valido(200912), "anterior al inicio de la serie"


def test_etiqueta_legible():
    assert p.etiqueta(202607) == "2026-07"
    assert p.etiqueta(202512) == "2025-12"


def test_la_ventana_avanza_al_cambiar_el_mes():
    """Al pasar de julio a agosto entra un periodo nuevo y sale el más viejo."""
    julio = p.ventana_retencion(date(2026, 7, 31), meses=24)
    agosto = p.ventana_retencion(date(2026, 8, 1), meses=24)
    assert agosto[-1] == 202608
    assert julio[0] not in agosto, "el mes más viejo sale de la ventana"
    assert len(agosto) == len(julio) == 24
