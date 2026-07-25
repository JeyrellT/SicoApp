"""Entrada de línea de comandos del ETL. Es lo que ejecuta el cron de Railway.

    python -m app.etl.run diario        # mes en curso (+ cierre del anterior si toca)
    python -m app.etl.run periodo 202606
    python -m app.etl.run backfill      # carga los 24 meses de la ventana
    python -m app.etl.run republicados  # revisa meses cerrados que el origen rehizo
    python -m app.etl.run estado

El proceso termina siempre con código 0 o 1: el cron de Railway usa la salida
del contenedor para marcar la corrida como exitosa o fallida.
"""

from __future__ import annotations

import logging
import sys

from app.config import get_settings
from app.logging_setup import configurar_logging

log = logging.getLogger("sicop.etl")


def _uso() -> None:
    print(__doc__)


def main(argv: list[str] | None = None) -> int:
    argv = list(argv if argv is not None else sys.argv[1:])
    s = get_settings()
    configurar_logging(s.log_level, literales=s.secretos())

    if not s.etl_habilitado:
        log.warning("ETL deshabilitado por configuración (ETL_HABILITADO=0). No se hace nada.")
        return 0

    comando = argv[0] if argv else "diario"

    # Import diferido: arrancar la app no debe pagar el costo de cargar el ETL.
    from app.etl import pipeline
    from app.etl.periodos import periodo_actual

    try:
        if comando == "diario":
            resultados = pipeline.ejecutar_diario()
            for r in resultados:
                log.info(
                    "Periodo %s: %s (%d filas, %.1f s) %s",
                    r.periodo,
                    "cargado" if r.ejecutado else "sin cambios",
                    r.filas,
                    r.duracion_s,
                    r.motivo,
                )
            # La revisión de republicaciones cuesta 3 peticiones HEAD por corrida.
            pipeline.revisar_republicaciones()

        elif comando == "periodo":
            if len(argv) < 2:
                log.error("Falta el periodo (yyyymm).")
                return 2
            periodo = int(argv[1])
            forzar = "--forzar" in argv
            r = pipeline.ejecutar_periodo(periodo, forzar=forzar)
            log.info("Periodo %s: %d filas.", r.periodo, r.filas)

        elif comando == "backfill":
            meses = int(argv[1]) if len(argv) > 1 and argv[1].isdigit() else None
            resultados = pipeline.backfill(meses)
            log.info(
                "Backfill terminado: %d periodos, %d filas.",
                len(resultados),
                sum(r.filas for r in resultados),
            )

        elif comando == "republicados":
            recargados = pipeline.revisar_republicaciones()
            log.info("Periodos republicados y recargados: %s", recargados or "ninguno")

        elif comando == "estado":
            estado = pipeline.estado_datos()
            log.info(
                "Periodos en base: %s | filas acumuladas: %s | periodo actual: %s",
                estado["periodos"],
                estado["filas_totales"],
                periodo_actual(),
            )

        else:
            _uso()
            return 2

    except Exception:
        log.exception("El ETL terminó con error.")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
