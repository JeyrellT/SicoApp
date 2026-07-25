"""Esquemas compartidos: paginación, filtros y envoltorios de respuesta."""

from __future__ import annotations

from datetime import date, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")

PAGE_SIZE_MAX_ABSOLUTO = 200


class Pagina(BaseModel, Generic[T]):
    items: list[T]
    total: int = Field(description="Total de filas que cumplen el filtro")
    page: int
    page_size: int

    @property
    def paginas(self) -> int:
        return max(1, -(-self.total // self.page_size)) if self.page_size else 1


class FiltroPeriodo(BaseModel):
    """Rango de periodos yyyymm. Sin valores se asume toda la ventana disponible."""

    model_config = ConfigDict(extra="forbid")

    desde: int | None = Field(default=None, ge=201001, le=210012)
    hasta: int | None = Field(default=None, ge=201001, le=210012)

    @field_validator("desde", "hasta")
    @classmethod
    def _mes_valido(cls, v: int | None) -> int | None:
        if v is not None and not 1 <= v % 100 <= 12:
            raise ValueError("El periodo debe tener formato yyyymm con mes entre 01 y 12.")
        return v


class SaludDatos(BaseModel):
    """Estado de la base: qué hay cargado y de cuándo."""

    estado: str
    periodos: list[int]
    periodo_min: int | None
    periodo_max: int | None
    ultima_carga: datetime | None
    ultima_carga_periodo: int | None
    ultima_carga_estado: str | None
    ultima_carga_exito: bool | None
    filas_totales: int
    meses_retencion: int
    version_api: str


class ErrorRespuesta(BaseModel):
    detalle: str
    codigo: str | None = None


class RangoFechas(BaseModel):
    desde: date | None = None
    hasta: date | None = None
