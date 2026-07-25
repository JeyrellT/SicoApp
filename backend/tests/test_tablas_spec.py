"""La especificación de tablas debe corresponder con los CSV reales.

Si el Observatorio agrega, quita o renombra una columna, esta prueba lo detecta
antes de que el ETL cargue datos incompletos en silencio.
"""

from __future__ import annotations

import os
import zipfile
from pathlib import Path

import pytest

from app.etl import lectura
from app.etl.tablas import DIMENSIONES, HECHOS, POR_ARCHIVO, TABLAS
from app.etl.tipos import validar_specs

ZIP = os.environ.get("SICOP_ZIP_PRUEBA")
sin_zip = pytest.mark.skipif(
    not (ZIP and Path(ZIP).exists()),
    reason="Definí SICOP_ZIP_PRUEBA con la ruta a un ZIP mensual real de SICOP.",
)


def test_la_especificacion_es_coherente():
    validar_specs(list(TABLAS))


def test_hay_25_tablas_declaradas():
    assert len(TABLAS) == 25, f"se esperaban las 25 tablas del ZIP, hay {len(TABLAS)}"
    assert len(DIMENSIONES) >= 2, "instituciones y proveedores son dimensiones maestras"
    assert len(HECHOS) == len(TABLAS) - len(DIMENSIONES)


def test_los_nombres_de_archivo_no_se_repiten():
    archivos = [t.archivo for t in TABLAS]
    assert len(archivos) == len(set(archivos))


def test_las_dimensiones_no_estan_particionadas():
    for d in DIMENSIONES:
        assert not d.particionada
        assert d.clave, f"{d.tabla} necesita clave primaria"


def test_los_hechos_estan_particionados():
    for h in HECHOS:
        assert h.particionada
        assert "periodo" in h.nombres_destino


def test_sancion_proveedores_usa_coma():
    """Es la única tabla con delimitador distinto; equivocarse la deja ilegible."""
    spec = POR_ARCHIVO.get("SancionProveedores.csv")
    assert spec is not None
    assert spec.delimitador == ","


def test_las_tablas_con_duplicados_exactos_deduplican():
    """El origen repite filas idénticas: Remates 85 %, SistemaEvaluacionOfertas 73 %."""
    for archivo in ("Remates.csv", "SistemaEvaluacionOfertas.csv", "ReajustePrecios.csv"):
        spec = POR_ARCHIVO.get(archivo)
        assert spec is not None, f"falta declarar {archivo}"
        assert spec.dedup, f"{archivo} debe deduplicar en la carga"


def test_las_tablas_que_llegan_vacias_son_opcionales():
    for archivo in (
        "Contratos.csv",
        "DetalleCarteles.csv",
        "DetalleLineaCartel.csv",
        "FechaPorEtapas.csv",
        "Garantias.csv",
        "ProcedimientoADM.csv",
        "Sistemas.csv",
    ):
        spec = POR_ARCHIVO.get(archivo)
        assert spec is not None, f"falta declarar {archivo}"
        assert spec.opcional, f"{archivo} llega vacío algunos meses y debe ser opcional"


def test_las_cedulas_nunca_son_enteras():
    """'0702490992' perdería el cero inicial como entero: los cruces dejarían de funcionar."""
    for spec in TABLAS:
        for c in spec.columnas_guardadas:
            nombre = (c.col or "").lower()
            if "cedula" in nombre or nombre in ("ced_institucion", "cedulaproveedor"):
                assert not c.tipo.lower().startswith(("bigint", "integer", "smallint")), (
                    f"{spec.tabla}.{c.col} está declarada como entero y es un identificador"
                )


def test_nro_sicop_es_texto_en_todas_las_tablas():
    for spec in TABLAS:
        for c in spec.columnas_guardadas:
            if c.col == "nro_sicop":
                assert c.tipo.lower().startswith(("varchar", "cedula", "text")), (
                    f"{spec.tabla}.nro_sicop debe ser texto, es {c.tipo}"
                )


def test_la_normalizacion_elimina_los_nombres_repetidos():
    """El ahorro del 52 % depende de NO guardar nombres derivables por join."""
    inv = POR_ARCHIVO.get("InvitacionProcedimiento.csv")
    assert inv is not None
    guardadas = {c.col for c in inv.columnas_guardadas}
    assert "institucion" not in guardadas, "el nombre de institución sale de dim_institucion"
    assert "nombre_proveedor" not in guardadas, "el nombre de proveedor sale de dim_proveedor"
    assert "numero_procedimiento" not in guardadas, "sale de dim_procedimiento"
    assert inv.enriquece, "debe alimentar las dimensiones con esos nombres"


def test_las_columnas_descartadas_alimentan_alguna_dimension():
    """Descartar un dato sin guardarlo en una dimensión sería perderlo."""
    for spec in TABLAS:
        descartadas = {c.csv for c in spec.columnas if not c.almacenada}
        if not descartadas:
            continue
        alimentadas = {campo for e in spec.enriquece for campo in e.campos}
        huerfanas = descartadas - alimentadas
        assert not huerfanas, f"{spec.tabla}: columnas descartadas sin destino: {huerfanas}"


@sin_zip
def test_las_columnas_declaradas_existen_en_el_zip_real():
    ruta = Path(ZIP)
    with zipfile.ZipFile(ruta) as z:
        miembros = {n.lower(): n for n in z.namelist()}

    problemas: list[str] = []
    for spec in TABLAS:
        miembro = miembros.get(spec.archivo.lower())
        if miembro is None:
            if not spec.opcional:
                problemas.append(f"{spec.archivo}: no está en el ZIP y no es opcional")
            continue

        reales = set(lectura.encabezado(ruta, miembro, spec.delimitador))
        declaradas = {c.csv for c in spec.columnas}

        faltan = declaradas - reales
        sobran = reales - declaradas
        if faltan:
            problemas.append(f"{spec.archivo}: declaradas pero ausentes en el CSV -> {sorted(faltan)}")
        if sobran:
            problemas.append(f"{spec.archivo}: en el CSV pero sin declarar -> {sorted(sobran)}")

    assert not problemas, "Desajustes entre la especificación y el ZIP real:\n" + "\n".join(problemas)


@sin_zip
def test_todos_los_csv_del_zip_estan_declarados():
    with zipfile.ZipFile(ZIP) as z:
        csvs = {n for n in z.namelist() if n.lower().endswith(".csv")}
    declarados = {t.archivo for t in TABLAS}
    faltantes = csvs - declarados
    assert not faltantes, f"El ZIP trae archivos sin declarar: {sorted(faltantes)}"
