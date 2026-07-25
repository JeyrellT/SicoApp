"""Orquestación del ETL de un periodo.

Reglas de negocio:
  - El mes en curso se recarga a diario mientras el origen lo siga cambiando.
  - Un mes cerrado se descarga una última vez y queda marcado como 'final'.
  - Si el ETag no cambió no se descarga nada: la corrida cuesta una petición HEAD.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select, text

from app.db import SessionLocal, engine_etl
from app.etl import agregados, carga, ddl, descarga, retencion
from app.etl.periodos import Periodo, anterior, periodo_actual, valido
from app.etl.tablas import TABLAS
from app.models.ops import ESTADO_FINAL, ESTADO_PARCIAL, Carga, EstadoTabla

log = logging.getLogger(__name__)


@dataclass
class Resultado:
    periodo: Periodo
    ejecutado: bool
    estado: str = ESTADO_PARCIAL
    filas: int = 0
    tablas: list[carga.ResultadoTabla] = field(default_factory=list)
    duracion_s: float = 0.0
    motivo: str = ""
    error: str | None = None


def _ultimo_etag(periodo: Periodo) -> str | None:
    with SessionLocal() as db:
        return db.scalar(
            select(Carga.etag)
            .where(Carga.periodo == periodo, Carga.exito.is_(True))
            .order_by(Carga.iniciado_en.desc())
            .limit(1)
        )


def _estado_de(periodo: Periodo) -> str:
    """Un mes distinto al actual ya está cerrado en el origen."""
    return ESTADO_PARCIAL if periodo == periodo_actual() else ESTADO_FINAL


# Identificador del cerrojo de aplicación. Impide que el cron y una ejecución
# manual desde /v1/admin/etl/ejecutar carguen el mismo periodo a la vez: las dos
# harían TRUNCATE de las mismas particiones y una pisaría a la otra.
_LOCK_ETL = 8_150_726


def ejecutar_periodo(periodo: Periodo, forzar: bool = False) -> Resultado:
    if not valido(periodo):
        raise ValueError(f"Periodo inválido: {periodo}")

    inicio = time.monotonic()
    res = Resultado(periodo=periodo, ejecutado=False, estado=_estado_de(periodo))
    etag_previo = None if forzar else _ultimo_etag(periodo)

    try:
        bajada = descarga.descargar(periodo, etag_previo=etag_previo)
    except descarga.DescargaError as e:
        # Un periodo aún no publicado no es un fallo del sistema.
        log.warning("Descarga de %s no disponible: %s", periodo, e)
        res.motivo = str(e)
        return res

    if bajada is None:
        res.motivo = "sin cambios en el origen"
        log.info("Periodo %s: nada que hacer.", periodo)
        return res

    fila_carga = Carga(
        periodo=periodo,
        etag=bajada.meta.etag,
        last_modified=bajada.meta.last_modified,
        bytes_zip=bajada.bytes_,
        sha256=bajada.sha256,
        estado=res.estado,
        exito=False,
    )
    with SessionLocal() as db:
        db.add(fila_carga)
        db.commit()
        db.refresh(fila_carga)
        carga_id = fila_carga.id

    try:
        with engine_etl().begin() as conn:
            tomado = conn.execute(
                text("SELECT pg_try_advisory_xact_lock(:clave, :periodo)"),
                {"clave": _LOCK_ETL, "periodo": periodo},
            ).scalar()
            if not tomado:
                log.warning("Ya hay una carga en curso para el periodo %s; se omite.", periodo)
                res.motivo = "otra carga del mismo periodo está en curso"
                return res

            ddl.crear_esquema(conn, TABLAS)
            ddl.crear_particiones(conn, TABLAS, periodo)

            acc = carga.Acumulador()
            for spec in TABLAS:
                res.tablas.append(carga.cargar_tabla(conn, spec, bajada.ruta, periodo, acc))

            carga.fusionar_acumulado(conn, acc, periodo)
            agregados.recalcular(conn, periodo)
            descartadas = carga.descartar_detalle_voluminoso(conn, periodo)
            eliminados = retencion.aplicar(conn)

        if descartadas:
            log.info(
                "Detalle descartado tras agregar (ETL_INVITACIONES_DETALLE=0): %s",
                ", ".join(descartadas),
            )

        res.filas = sum(t.filas for t in res.tablas)
        res.ejecutado = True
        res.duracion_s = time.monotonic() - inicio

        with SessionLocal() as db:
            fila = db.get(Carga, carga_id)
            fila.exito = True
            fila.filas_total = res.filas
            fila.duracion_s = int(res.duracion_s)
            fila.finalizado_en = datetime.now(UTC)
            db.add_all(
                [
                    EstadoTabla(
                        carga_id=carga_id,
                        periodo=periodo,
                        tabla=t.tabla,
                        filas=t.filas,
                        filas_malas=t.filas_malas,
                    )
                    for t in res.tablas
                ]
            )
            db.commit()

        log.info(
            "Periodo %s cargado: %d filas en %.1f s (estado %s). Periodos eliminados: %s",
            periodo,
            res.filas,
            res.duracion_s,
            res.estado,
            eliminados or "ninguno",
        )
    except Exception as e:
        log.exception("Falló la carga del periodo %s", periodo)
        res.error = f"{type(e).__name__}: {e}"
        with SessionLocal() as db:
            fila = db.get(Carga, carga_id)
            if fila is not None:
                fila.exito = False
                fila.error = res.error[:4000]
                fila.finalizado_en = datetime.now(UTC)
                fila.duracion_s = int(time.monotonic() - inicio)
                db.commit()
        raise
    finally:
        bajada.ruta.unlink(missing_ok=True)

    return res


def ejecutar_diario() -> list[Resultado]:
    """Corrida diaria: mes en curso y, en los primeros días, cierre del anterior."""
    from app.etl.periodos import hoy_local

    resultados = [ejecutar_periodo(periodo_actual())]

    # Aprovecha la corrida diaria para limpiar sesiones vencidas: si no, la tabla
    # crece sin techo dentro del mismo volumen que se está cuidando.
    try:
        from app.services.usuarios import purgar_sesiones_vencidas

        with SessionLocal() as db:
            borradas = purgar_sesiones_vencidas(db)
        if borradas:
            log.info("Sesiones vencidas eliminadas: %d", borradas)
    except Exception:
        log.exception("No se pudieron purgar las sesiones vencidas; se continúa.")

    hoy = hoy_local()
    if hoy.day <= 5:
        previo = anterior(periodo_actual())
        if not _cerrado(previo):
            log.info("Cierre del mes anterior %s.", previo)
            resultados.append(ejecutar_periodo(previo))
    return resultados


def _cerrado(periodo: Periodo) -> bool:
    """Ya existe una carga exitosa marcada como final para ese periodo."""
    with SessionLocal() as db:
        return bool(
            db.scalar(
                select(Carga.id)
                .where(
                    Carga.periodo == periodo,
                    Carga.exito.is_(True),
                    Carga.estado == ESTADO_FINAL,
                )
                .limit(1)
            )
        )


def revisar_republicaciones(meses: int = 3) -> list[Periodo]:
    """Detecta meses cerrados que el origen volvió a publicar (ocurre de verdad).

    Comparar el ETag de los últimos meses cuesta 3 peticiones HEAD.
    """
    from app.etl.periodos import sumar_meses

    actual = periodo_actual()
    recargados: list[Periodo] = []
    for i in range(1, meses + 1):
        p = sumar_meses(actual, -i)
        previo = _ultimo_etag(p)
        if previo is None:
            continue
        try:
            meta = descarga.consultar_metadatos(p)
        except descarga.DescargaError:
            continue
        if meta.etag and meta.etag != previo:
            log.warning("El periodo %s fue republicado en el origen; se recarga.", p)
            ejecutar_periodo(p, forzar=True)
            recargados.append(p)
    return recargados


def backfill(meses: int | None = None) -> list[Resultado]:
    """Carga los periodos de la ventana que falten. Se usa en el arranque inicial."""
    with engine_etl().begin() as conn:
        ddl.crear_esquema(conn, TABLAS)
        faltantes = retencion.periodos_faltantes(conn, meses)

    log.info("Backfill: %d periodos por cargar %s", len(faltantes), faltantes)
    salida = []
    for p in faltantes:
        try:
            salida.append(ejecutar_periodo(p))
        except Exception:
            log.exception("Backfill: falló el periodo %s; se continúa con el resto.", p)
    return salida


def estado_datos() -> dict:
    """Resumen para el endpoint de salud."""
    with engine_etl().connect() as conn:
        periodos = ddl.periodos_existentes(conn)
        filas = conn.execute(
            text("SELECT COALESCE(SUM(filas_total),0) FROM ops.cargas WHERE exito")
        ).scalar_one()
    with SessionLocal() as db:
        ultima = db.scalar(select(Carga).order_by(Carga.iniciado_en.desc()).limit(1))
    return {
        "periodos": periodos,
        "filas_totales": int(filas or 0),
        "ultima": ultima,
    }
