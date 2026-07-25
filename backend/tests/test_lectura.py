"""Lectura y conversión de los CSV de SICOP, con los casos sucios reales."""

from __future__ import annotations

import zipfile
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pytest

from app.etl import lectura


def _zip_con(tmp_path: Path, nombre: str, contenido: str, encoding: str = "utf-8") -> Path:
    ruta = tmp_path / "muestra.zip"
    with zipfile.ZipFile(ruta, "w") as z:
        z.writestr(nombre, contenido.encode(encoding))
    return ruta


# --- Conversores -----------------------------------------------------------


def test_marca_tiempo_acepta_los_siete_decimales_del_origen():
    assert lectura.marca_tiempo("2026-07-02 00:00:00.0000000") == datetime(2026, 7, 2, 0, 0, 0)
    assert lectura.marca_tiempo("2026-07-21 09:55:27.0000000") == datetime(2026, 7, 21, 9, 55, 27)


def test_marca_tiempo_acepta_formato_dia_mes_ano():
    """FECHA_SOL_CONTRA viene como DD/MM/YYYY en ProcedimientoAdjudicacion."""
    assert lectura.marca_tiempo("05/03/2026") == datetime(2026, 3, 5)


def test_marca_tiempo_devuelve_none_ante_basura():
    for v in (None, "", "   ", "no-es-fecha", '""'):
        assert lectura.marca_tiempo(v) is None


def test_fecha_descarta_la_hora():
    assert lectura.fecha("2026-07-02 13:45:12.0000000") == date(2026, 7, 2)


def test_numerico_acepta_el_formato_real_del_origen():
    """El origen serializa float64 con punto decimal: '466.67000000000002'."""
    assert lectura.numerico("466.67000000000002") == Decimal("466.67000000000002")
    assert lectura.numerico("2148.7199999999998") is not None
    assert lectura.numerico("1500.50") == Decimal("1500.50")


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("1234,56", "1234.56"),      # coma sola: decimal (convención de Costa Rica)
        ("1.234,56", "1234.56"),     # punto miles + coma decimal
        ("1,234.56", "1234.56"),     # coma miles + punto decimal
        ("1234.56", "1234.56"),
    ],
)
def test_numerico_resuelve_la_ambiguedad_de_separadores(entrada, esperado):
    """Interpretar mal una coma cambiaría el monto 100 veces: manda el último separador."""
    assert lectura.numerico(entrada) == Decimal(esperado)


def test_numerico_rechaza_valores_fuera_de_rango():
    assert lectura.numerico("1e20") is None, "no cabe en numeric(20,6)"
    assert lectura.numerico("abc") is None


def test_entero_tolera_decimales_y_vacios():
    assert lectura.entero("1311793") == 1311793
    assert lectura.entero("42.0") == 42
    assert lectura.entero("") is None
    assert lectura.entero("N/A") is None


def test_cedula_conserva_los_ceros_a_la_izquierda():
    """'0702490992' NO puede convertirse a entero: perdería el cero inicial."""
    assert lectura.cedula("0702490992") == "0702490992"
    assert lectura.cedula(" 3-101-677835 ") == "3101677835", "normaliza guiones y espacios"
    assert lectura.cedula("") is None


def test_si_no_mapea_las_variantes_del_origen():
    assert lectura.si_no("Si") is True
    assert lectura.si_no("S") is True
    assert lectura.si_no("N") is False
    assert lectura.si_no("No") is False
    assert lectura.si_no("") is None
    assert lectura.si_no("quizás") is None


def test_texto_recorta_a_la_longitud_declarada():
    assert lectura.texto("  hola  ") == "hola"
    assert lectura.texto("abcdefghij", 4) == "abcd"
    assert lectura.texto("") is None


# --- Lectura del CSV -------------------------------------------------------


def test_lee_delimitador_punto_y_coma_con_comillas(tmp_path):
    contenido = (
        "NRO_SICOP;NOMBRE;MONTO\r\n"
        '"20260603670";"EMPRESA; CON PUNTO Y COMA";1500.50\r\n'
        '"20260603671";"OTRA";2000\r\n'
    )
    ruta = _zip_con(tmp_path, "t.csv", contenido)
    filas = list(lectura.leer(ruta, "t.csv"))
    assert len(filas) == 2
    assert filas[0]["NOMBRE"] == "EMPRESA; CON PUNTO Y COMA", "la comilla protege el delimitador"
    assert filas[1]["NRO_SICOP"] == "20260603671"


def test_lee_delimitador_coma_para_sancion_proveedores(tmp_path):
    contenido = "CEDULA_PROVEEDOR,NOMBRE_PROVEEDOR\r\n3101123456,ACME S.A.\r\n"
    ruta = _zip_con(tmp_path, "s.csv", contenido)
    filas = list(lectura.leer(ruta, "s.csv", delimitador=","))
    assert filas == [{"CEDULA_PROVEEDOR": "3101123456", "NOMBRE_PROVEEDOR": "ACME S.A."}]


def test_campos_vacios_se_vuelven_none(tmp_path):
    ruta = _zip_con(tmp_path, "t.csv", "A;B;C\r\n1;;3\r\n")
    fila = next(iter(lectura.leer(ruta, "t.csv")))
    assert fila == {"A": "1", "B": None, "C": "3"}


def test_maneja_bom_y_acentos(tmp_path):
    contenido = "INSTITUCION;CIUDAD\r\nMUNICIPALIDAD DE HEREDIA;SAN JOSÉ\r\n"
    ruta = _zip_con(tmp_path, "t.csv", contenido, encoding="utf-8-sig")
    fila = next(iter(lectura.leer(ruta, "t.csv")))
    assert fila["CIUDAD"] == "SAN JOSÉ"
    assert fila["INSTITUCION"] == "MUNICIPALIDAD DE HEREDIA", "el BOM no ensucia el encabezado"


def test_archivo_solo_con_encabezado_no_produce_filas(tmp_path):
    """Siete tablas llegan vacías algunos meses; no puede ser un error."""
    ruta = _zip_con(tmp_path, "vacio.csv", "NRO_CONTRATO;SECUENCIA\r\n")
    assert list(lectura.leer(ruta, "vacio.csv")) == []


def test_fila_con_columnas_de_menos_se_completa(tmp_path):
    ruta = _zip_con(tmp_path, "t.csv", "A;B;C\r\n1;2\r\n")
    res = lectura.ResultadoLectura()
    filas = list(lectura.leer(ruta, "t.csv", res))
    assert filas[0] == {"A": "1", "B": "2", "C": None}
    assert res.filas_malas == 1, "se contabiliza como fila irregular"


def test_fila_con_columnas_de_mas_se_recorta(tmp_path):
    ruta = _zip_con(tmp_path, "t.csv", "A;B\r\n1;2;3;4\r\n")
    filas = list(lectura.leer(ruta, "t.csv"))
    assert filas[0] == {"A": "1", "B": "2"}


def test_repara_fila_partida_por_delimitador_en_texto_libre(tmp_path):
    """Caso real: una descripción con ';' corre las columnas y mete un contrato en un monto."""
    contenido = (
        "NRO_CONTRATO;DESC_PRODUCTO;MONTO\r\n"
        "CE202604001894;QUESO CREMA; GRASA 21%; ENVASE 3,7 L;1500.50\r\n"
    )
    ruta = _zip_con(tmp_path, "t.csv", contenido)

    sin_reparar = next(iter(lectura.leer(ruta, "t.csv")))
    assert sin_reparar["MONTO"] == " GRASA 21%", "sin reparación el monto queda corrupto"

    res = lectura.ResultadoLectura()
    fila = next(iter(lectura.leer(ruta, "t.csv", res, columna_libre="DESC_PRODUCTO")))
    assert fila["NRO_CONTRATO"] == "CE202604001894"
    assert fila["DESC_PRODUCTO"] == "QUESO CREMA; GRASA 21%; ENVASE 3,7 L"
    assert fila["MONTO"] == "1500.50", "el monto vuelve a su columna"
    assert res.filas_reparadas == 1


def test_reparar_fila_no_altera_filas_correctas():
    fila = ["a", "b", "c"]
    assert lectura.reparar_fila(fila, 3, 1, ";") == fila


def test_reparar_fila_ignora_indice_invalido():
    fila = ["a", "b", "c", "d"]
    assert lectura.reparar_fila(fila, 3, -1, ";") == fila


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("29062026", date(2026, 6, 29)),
        ("08042010", date(2010, 4, 8)),
        ("No aplica", None),
        ("", None),
        ("3", None),
        ("99999999", None),
    ],
)
def test_fecha_compacta_ddmmyyyy(entrada, esperado):
    """'29062026' es una fecha, no el número 29 062 026."""
    assert lectura.fecha_compacta(entrada) == esperado


def test_muchas_filas_malas_abortan_la_carga(tmp_path):
    """Un archivo mayormente ilegible debe fallar, no cargarse a medias."""
    lineas = ["A;B;C"] + ["1;2" for _ in range(200)]
    ruta = _zip_con(tmp_path, "t.csv", "\r\n".join(lineas) + "\r\n")
    res = lectura.ResultadoLectura()
    with pytest.raises(lectura.LecturaError):
        list(lectura.leer(ruta, "t.csv", res))


def test_encabezado_se_lee_sin_cargar_el_archivo(tmp_path):
    ruta = _zip_con(tmp_path, "t.csv", "UNO;DOS;TRES\r\na;b;c\r\n")
    assert lectura.encabezado(ruta, "t.csv") == ["UNO", "DOS", "TRES"]


def test_lectura_es_perezosa(tmp_path):
    """Debe poder recorrer archivos grandes sin materializarlos en memoria."""
    filas = "\r\n".join(f"{i};valor{i}" for i in range(10_000))
    ruta = _zip_con(tmp_path, "t.csv", f"ID;V\r\n{filas}\r\n")
    it = lectura.leer(ruta, "t.csv")
    primera = next(it)
    assert primera["ID"] == "0"
    assert isinstance(it, type(x for x in []))
