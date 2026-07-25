"""Integración del ETL contra un ZIP real de SICOP y un PostgreSQL real.

Estas pruebas cargan datos de verdad: verifican que el conteo de filas coincide
con el CSV, que la normalización no pierde información, que la ventana de 24
meses elimina lo viejo y que volver a correr la carga no duplica nada.

Además miden el tamaño ocupado en Postgres, que es lo que determina el costo del
volumen en Railway.
"""

from __future__ import annotations

import os
import zipfile
from pathlib import Path

import pytest
from sqlalchemy import text

from app.etl import agregados, carga, ddl, lectura
from app.etl.tablas import POR_ARCHIVO, TABLAS

ZIP = os.environ.get("SICOP_ZIP_PRUEBA")
PERIODO = int(os.environ.get("SICOP_PERIODO_PRUEBA", "202607"))

pytestmark = [
    pytest.mark.integracion,
    pytest.mark.skipif(
        not (ZIP and Path(ZIP).exists()),
        reason="Definí SICOP_ZIP_PRUEBA con la ruta a un ZIP mensual real de SICOP.",
    ),
]


@pytest.fixture(scope="module")
def cargado(request):
    """Carga el ZIP real una sola vez para todo el módulo."""
    from app.db import engine_etl

    ruta = Path(ZIP)
    with engine_etl().begin() as conn:
        ddl.crear_esquema(conn, TABLAS)
        ddl.crear_particiones(conn, TABLAS, PERIODO)
        acc = carga.Acumulador()
        resultados = [carga.cargar_tabla(conn, s, ruta, PERIODO, acc) for s in TABLAS]
        carga.fusionar_acumulado(conn, acc, PERIODO)
        agregados.recalcular(conn, PERIODO)
    return {r.tabla: r for r in resultados}


def _filas_csv(archivo: str) -> int:
    spec = POR_ARCHIVO[archivo]
    with zipfile.ZipFile(ZIP) as z:
        if spec.archivo not in z.namelist():
            return 0
    return sum(1 for _ in lectura.leer(Path(ZIP), spec.archivo, delimitador=spec.delimitador))


def test_todas_las_tablas_se_cargan_sin_error(cargado):
    assert len(cargado) == len(TABLAS)
    fallidas = [t for t, r in cargado.items() if r.filas == 0 and not r.omitida and not r.motivo]
    assert not fallidas, f"tablas sin filas y sin motivo declarado: {fallidas}"


def test_el_conteo_coincide_con_el_csv(cargado, db):
    """La tabla grande es la prueba de fuego: 1.1 millones de filas sin perder ninguna."""
    esperado = _filas_csv("InvitacionProcedimiento.csv")
    real = db.execute(
        text("SELECT COUNT(*) FROM sicop.invitacion_procedimiento WHERE periodo = :p"),
        {"p": PERIODO},
    ).scalar()
    assert real == esperado, f"se esperaban {esperado} invitaciones, hay {real}"
    assert esperado > 100_000, "el archivo de muestra debería traer más de 100 mil invitaciones"


def test_las_tablas_con_duplicados_quedan_deduplicadas(cargado, db):
    """Remates trae ~85 % de filas idénticas; deben colapsarse."""
    if cargado["remates"].omitida:
        pytest.skip("Remates no vino en el ZIP")
    crudas = _filas_csv("Remates.csv")
    guardadas = db.execute(
        text("SELECT COUNT(*) FROM sicop.remates WHERE periodo = :p"), {"p": PERIODO}
    ).scalar()
    assert guardadas <= crudas
    if crudas > 500:
        assert guardadas < crudas, "el deduplicado no eliminó ninguna fila repetida"


def test_las_cedulas_conservan_los_ceros_iniciales(db):
    con_cero = db.execute(
        text(
            "SELECT COUNT(*) FROM sicop.dim_proveedor WHERE cedula_proveedor LIKE '0%'"
        )
    ).scalar()
    assert con_cero > 0, "si no hay cédulas que empiecen con 0, se perdieron al convertir"


def test_las_dimensiones_se_poblaron(db):
    inst = db.execute(text("SELECT COUNT(*) FROM sicop.dim_institucion")).scalar()
    prov = db.execute(text("SELECT COUNT(*) FROM sicop.dim_proveedor")).scalar()
    proc = db.execute(text("SELECT COUNT(*) FROM sicop.dim_procedimiento")).scalar()
    assert inst > 100, f"pocas instituciones: {inst}"
    assert prov > 10_000, f"pocos proveedores: {prov}"
    assert proc > 500, f"pocos procedimientos: {proc}"


def test_los_nombres_normalizados_se_recuperan_por_join(db):
    """Quitamos el nombre de la tabla de hechos: debe seguir siendo recuperable."""
    fila = db.execute(
        text(
            """
            SELECT i.nombre
            FROM sicop.invitacion_procedimiento v
            JOIN sicop.dim_institucion i ON i.cedula = v.ced_institucion
            WHERE v.periodo = :p AND i.nombre IS NOT NULL
            LIMIT 1
            """
        ),
        {"p": PERIODO},
    ).first()
    assert fila is not None and fila.nombre, "el join a la dimensión no devuelve el nombre"

    fila_prov = db.execute(
        text(
            """
            SELECT p.nombre
            FROM sicop.invitacion_procedimiento v
            JOIN sicop.dim_proveedor p ON p.cedula_proveedor = v.cedula_proveedor
            WHERE v.periodo = :p AND p.nombre IS NOT NULL
            LIMIT 1
            """
        ),
        {"p": PERIODO},
    ).first()
    assert fila_prov is not None and fila_prov.nombre


def test_los_agregados_cuadran_con_el_detalle(db):
    """El total agregado debe ser idéntico a la suma del detalle: si no, los KPIs mienten."""
    detalle = db.execute(
        text(
            "SELECT COALESCE(SUM(monto_adju_linea_crc),0), COUNT(*) "
            "FROM sicop.procedimiento_adjudicacion WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).first()
    agregado = db.execute(
        text(
            "SELECT monto_crc, lineas_adjudicadas FROM sicop.agg_mensual_global WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).first()
    assert agregado is not None, "no se calculó el agregado global"
    assert round(float(agregado.monto_crc), 2) == round(float(detalle[0]), 2)
    assert agregado.lineas_adjudicadas == detalle[1]


def test_la_suma_por_institucion_cuadra_con_el_total(db):
    total = db.execute(
        text("SELECT monto_crc FROM sicop.agg_mensual_global WHERE periodo = :p"), {"p": PERIODO}
    ).scalar()
    suma = db.execute(
        text(
            "SELECT COALESCE(SUM(monto_crc),0) FROM sicop.agg_mensual_institucion WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).scalar()
    assert round(float(suma), 2) == round(float(total), 2)


def test_las_invitaciones_agregadas_cuadran(db):
    detalle = db.execute(
        text(
            "SELECT COUNT(DISTINCT (nro_sicop, cedula_proveedor)) "
            "FROM sicop.invitacion_procedimiento WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).scalar()
    agregado = db.execute(
        text(
            "SELECT COALESCE(SUM(invitados),0) FROM sicop.agg_invitaciones_procedimiento "
            "WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).scalar()
    assert agregado == detalle


def test_recargar_el_mismo_periodo_no_duplica(db):
    """El reemplazo total de la partición es lo que hace la carga diaria idempotente."""
    from app.db import engine_etl

    antes = db.execute(
        text("SELECT COUNT(*) FROM sicop.procedimiento_adjudicacion WHERE periodo = :p"),
        {"p": PERIODO},
    ).scalar()

    # Cerrar la transacción de lectura ANTES de recargar: el TRUNCATE de la
    # partición necesita bloqueo exclusivo y una lectura abierta lo dejaría
    # esperando. Es el mismo motivo por el que la API usa
    # idle_in_transaction_session_timeout.
    db.rollback()

    spec = POR_ARCHIVO["ProcedimientoAdjudicacion.csv"]
    with engine_etl().begin() as conn:
        carga.cargar_tabla(conn, spec, Path(ZIP), PERIODO, carga.Acumulador())

    despues = db.execute(
        text("SELECT COUNT(*) FROM sicop.procedimiento_adjudicacion WHERE periodo = :p"),
        {"p": PERIODO},
    ).scalar()
    assert despues == antes, "recargar duplicó filas: la partición no se vació"


def test_la_retencion_elimina_los_periodos_viejos(db):
    from app.db import engine_etl
    from app.etl import retencion
    from app.etl.periodos import sumar_meses

    viejo = sumar_meses(PERIODO, -30)  # fuera de la ventana de 24 meses
    with engine_etl().begin() as conn:
        ddl.crear_particiones(conn, TABLAS, viejo)
        assert viejo in ddl.periodos_existentes(conn)

    with engine_etl().begin() as conn:
        eliminados = retencion.aplicar(conn)
        assert viejo in eliminados
        assert viejo not in ddl.periodos_existentes(conn)
        assert PERIODO in ddl.periodos_existentes(conn), "no puede borrar el periodo vigente"


def test_el_detalle_de_invitaciones_se_descarta_pero_el_agregado_queda(db, monkeypatch):
    """La decisión de costo central: sin detalle el volumen baja de ~3.8 GB a ~1.3 GB.

    El conteo de invitados por procedimiento debe sobrevivir, porque es el
    indicador de competencia que consumen los dashboards.
    """
    from app.config import get_settings
    from app.db import engine_etl

    agregado_antes = db.execute(
        text(
            "SELECT COALESCE(SUM(invitados),0) FROM sicop.agg_invitaciones_procedimiento "
            "WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).scalar()
    assert agregado_antes > 0, "el agregado debe existir antes de descartar el detalle"
    db.rollback()  # liberar la lectura antes del TRUNCATE

    monkeypatch.setattr(get_settings(), "etl_invitaciones_detalle", False)
    with engine_etl().begin() as conn:
        vaciadas = carga.descartar_detalle_voluminoso(conn, PERIODO)
    assert vaciadas, "debería haber vaciado la partición de invitaciones"

    detalle = db.execute(
        text("SELECT COUNT(*) FROM sicop.invitacion_procedimiento WHERE periodo = :p"),
        {"p": PERIODO},
    ).scalar()
    agregado_despues = db.execute(
        text(
            "SELECT COALESCE(SUM(invitados),0) FROM sicop.agg_invitaciones_procedimiento "
            "WHERE periodo = :p"
        ),
        {"p": PERIODO},
    ).scalar()

    assert detalle == 0, "el detalle debe quedar vacío"
    assert agregado_despues == agregado_antes, "el agregado no puede perderse"


def test_con_detalle_activado_no_se_descarta_nada(db, monkeypatch):
    from app.config import get_settings
    from app.db import engine_etl

    monkeypatch.setattr(get_settings(), "etl_invitaciones_detalle", True)
    with engine_etl().begin() as conn:
        assert carga.descartar_detalle_voluminoso(conn, PERIODO) == []


def test_tamano_en_postgres(db, capsys):
    """Mide el espacio real ocupado: es el insumo del cálculo de costo del volumen.

    Se cuentan las particiones (donde vive el dato); las tablas padre pesan cero.
    Las dimensiones se separan porque NO crecen con cada mes nuevo.
    """
    filas = db.execute(
        text(
            """
            SELECT c.relname AS tabla,
                   pg_total_relation_size(c.oid) AS bytes,
                   c.relispartition AS es_particion
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'sicop' AND c.relkind = 'r'
            ORDER BY bytes DESC
            """
        )
    ).all()
    hechos = sum(f.bytes for f in filas if f.es_particion)
    dimensiones = sum(f.bytes for f in filas if not f.es_particion)

    with capsys.disabled():
        print(f"\n--- Espacio en PostgreSQL, periodo {PERIODO} ---")
        for f in filas[:10]:
            if f.bytes > 0:
                print(f"  {f.tabla:<40} {f.bytes / 1_048_576:>8.1f} MB")
        print(f"  {'Hechos del mes (particiones)':<40} {hechos / 1_048_576:>8.1f} MB")
        print(f"  {'Dimensiones (no crecen por mes)':<40} {dimensiones / 1_048_576:>8.1f} MB")
        proyeccion = (hechos * 24 + dimensiones) / 1_073_741_824
        print(f"  {'Proyección de 24 meses':<40} {proyeccion:>8.2f} GB")
        print(f"  {'Volumen Hobby de Railway':<40} {5.0:>8.2f} GB")

    assert hechos > 0
