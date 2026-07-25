"""Descarga del ZIP mensual publicado por el Observatorio de Compra Pública.

La fuente expone una URL directa por periodo. El archivo del mes en curso se
regenera todos los días ~13:05 UTC; los meses cerrados quedan congelados, salvo
republicaciones puntuales que detectamos comparando el ETag.
"""

from __future__ import annotations

import hashlib
import logging
import os
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.etl.periodos import Periodo

log = logging.getLogger(__name__)


class DescargaError(Exception):
    pass


@dataclass(frozen=True)
class MetadatosRemoto:
    periodo: Periodo
    url: str
    etag: str | None
    last_modified: datetime | None
    bytes_: int | None

    @property
    def fecha_publicacion(self) -> str | None:
        return self.last_modified.isoformat() if self.last_modified else None


@dataclass(frozen=True)
class Descarga:
    periodo: Periodo
    ruta: Path
    sha256: str
    bytes_: int
    meta: MetadatosRemoto


def url_de(periodo: Periodo) -> str:
    return get_settings().sicop_zip_url.format(periodo=periodo)


def _parse_http_date(v: str | None) -> datetime | None:
    if not v:
        return None
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(v)
    except (TypeError, ValueError):
        return None


@retry(
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    reraise=True,
)
def consultar_metadatos(periodo: Periodo, client: httpx.Client | None = None) -> MetadatosRemoto:
    """HEAD al blob. Barato: permite saltarse la descarga si el ETag no cambió."""
    url = url_de(periodo)
    cerrar = client is None
    client = client or httpx.Client(timeout=30, follow_redirects=True)
    try:
        r = client.head(url)
        if r.status_code == 404:
            raise DescargaError(f"El periodo {periodo} no está publicado (404).")
        r.raise_for_status()
        largo = r.headers.get("content-length")
        return MetadatosRemoto(
            periodo=periodo,
            url=url,
            etag=(r.headers.get("etag") or "").strip('"') or None,
            last_modified=_parse_http_date(r.headers.get("last-modified")),
            bytes_=int(largo) if largo and largo.isdigit() else None,
        )
    finally:
        if cerrar:
            client.close()


def descargar(
    periodo: Periodo,
    destino_dir: str | os.PathLike[str] | None = None,
    etag_previo: str | None = None,
    client: httpx.Client | None = None,
) -> Descarga | None:
    """Descarga el ZIP del periodo.

    Devuelve None si el ETag coincide con el ya procesado (no hay nada nuevo).
    """
    s = get_settings()
    meta = consultar_metadatos(periodo, client=client)

    if etag_previo and meta.etag and meta.etag == etag_previo:
        log.info("Periodo %s sin cambios (etag %s); se omite la descarga.", periodo, meta.etag)
        return None

    if meta.bytes_ and meta.bytes_ > s.etl_max_zip_bytes:
        raise DescargaError(
            f"El ZIP de {periodo} pesa {meta.bytes_} bytes y supera el límite "
            f"de {s.etl_max_zip_bytes}. Revisar antes de cargar."
        )

    destino_dir = Path(destino_dir or s.etl_tmp_dir or tempfile.gettempdir())
    destino_dir.mkdir(parents=True, exist_ok=True)
    ruta = destino_dir / f"sicop_{periodo}.zip"

    cerrar = client is None
    client = client or httpx.Client(timeout=s.etl_http_timeout_s, follow_redirects=True)
    sha = hashlib.sha256()
    total = 0
    try:
        with client.stream("GET", meta.url) as r:
            r.raise_for_status()
            with open(ruta, "wb") as fh:
                for chunk in r.iter_bytes(1024 * 512):
                    total += len(chunk)
                    if total > s.etl_max_zip_bytes:
                        raise DescargaError(
                            f"La descarga de {periodo} superó {s.etl_max_zip_bytes} bytes."
                        )
                    sha.update(chunk)
                    fh.write(chunk)
    except Exception:
        ruta.unlink(missing_ok=True)
        raise
    finally:
        if cerrar:
            client.close()

    if not zipfile.is_zipfile(ruta):
        ruta.unlink(missing_ok=True)
        raise DescargaError(f"El archivo descargado para {periodo} no es un ZIP válido.")

    log.info(
        "Periodo %s descargado: %.1f MB, sha256 %s", periodo, total / 1_048_576, sha.hexdigest()[:12]
    )
    return Descarga(periodo=periodo, ruta=ruta, sha256=sha.hexdigest(), bytes_=total, meta=meta)


def listar_miembros(ruta_zip: Path) -> list[str]:
    with zipfile.ZipFile(ruta_zip) as z:
        return [n for n in z.namelist() if n.lower().endswith(".csv")]
