"""Esquemas de respuesta de los datos de SICOP."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class InstitucionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cedula: str
    nombre: str | None = None
    procedimientos: int = 0
    monto_crc: Decimal = Decimal(0)


class ProveedorItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cedula: str
    nombre: str | None = None
    adjudicaciones: int = 0
    monto_crc: Decimal = Decimal(0)


class PuntoSerie(BaseModel):
    periodo: int
    etiqueta: str
    procedimientos: int = 0
    lineas: int = 0
    monto_crc: Decimal = Decimal(0)
    monto_usd: Decimal = Decimal(0)


class ResumenKPI(BaseModel):
    """Tarjetas del dashboard principal."""

    periodo_desde: int | None = None
    periodo_hasta: int | None = None
    procedimientos: int = 0
    lineas_adjudicadas: int = 0
    monto_crc: Decimal = Decimal(0)
    monto_usd: Decimal = Decimal(0)
    instituciones: int = 0
    proveedores: int = 0
    ofertas: int = 0
    ordenes: int = 0
    monto_ordenes_crc: Decimal = Decimal(0)
    invitaciones: int = 0
    monto_promedio_crc: Decimal = Decimal(0)
    variacion_monto_pct: float | None = Field(
        default=None, description="Variación contra el periodo previo de igual longitud"
    )


class CategoriaItem(BaseModel):
    objeto_gasto: str
    lineas: int = 0
    monto_crc: Decimal = Decimal(0)
    monto_usd: Decimal = Decimal(0)
    proveedores_distintos: int = 0
    participacion_pct: float = 0.0


class TipoProcedimientoItem(BaseModel):
    tipo_procedimiento: str
    procedimientos: int = 0
    lineas: int = 0
    monto_crc: Decimal = Decimal(0)
    participacion_pct: float = 0.0


class ContraparteItem(BaseModel):
    cedula: str
    nombre: str | None = None
    lineas: int = 0
    monto_crc: Decimal = Decimal(0)
    participacion_pct: float = 0.0


class PerfilInstitucion(BaseModel):
    """Ficha completa de una institución: KPIs, evolución y contrapartes."""

    cedula: str
    nombre: str | None = None
    periodo_desde: int
    periodo_hasta: int
    resumen: ResumenKPI
    serie: list[PuntoSerie] = Field(default_factory=list)
    top_proveedores: list[ContraparteItem] = Field(default_factory=list)
    categorias: list[CategoriaItem] = Field(default_factory=list)
    tipos_procedimiento: list[TipoProcedimientoItem] = Field(default_factory=list)
    indice_concentracion: float | None = Field(
        default=None,
        description="Herfindahl-Hirschman sobre el monto por proveedor (0 a 1). "
        "Cerca de 1 significa que casi todo el gasto va a un solo proveedor.",
    )


class PerfilProveedor(BaseModel):
    cedula: str
    nombre: str | None = None
    periodo_desde: int
    periodo_hasta: int
    resumen: ResumenKPI
    serie: list[PuntoSerie] = Field(default_factory=list)
    top_instituciones: list[ContraparteItem] = Field(default_factory=list)
    categorias: list[CategoriaItem] = Field(default_factory=list)
    tasa_exito_pct: float | None = Field(
        default=None, description="Adjudicaciones sobre invitaciones recibidas"
    )


class ProcedimientoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nro_sicop: str
    numero_procedimiento: str | None = None
    descripcion: str | None = None
    ced_institucion: str | None = None
    institucion: str | None = None
    tipo_procedimiento: str | None = None
    modalidad: str | None = None
    periodo: int | None = None
    lineas: int = 0
    monto_crc: Decimal = Decimal(0)
    invitados: int = 0


class LineaAdjudicada(BaseModel):
    nro_sicop: str
    linea: int | None = None
    descripcion: str | None = None
    cantidad: Decimal | None = None
    unidad_medida: str | None = None
    monto_unitario: Decimal | None = None
    moneda: str | None = None
    monto_crc: Decimal | None = None
    monto_usd: Decimal | None = None
    fecha_adjudicacion: date | None = None
    cedula_proveedor: str | None = None
    proveedor: str | None = None
    objeto_gasto: str | None = None


class DetalleProcedimiento(BaseModel):
    procedimiento: ProcedimientoItem
    lineas: list[LineaAdjudicada] = Field(default_factory=list)
    proveedores_invitados: int = 0
    ofertas_recibidas: int = 0


class OpcionesFiltro(BaseModel):
    """Valores disponibles para poblar los selectores del frontend."""

    periodos: list[int] = Field(default_factory=list)
    anios: list[int] = Field(default_factory=list)
    tipos_procedimiento: list[str] = Field(default_factory=list)
    objetos_gasto: list[str] = Field(default_factory=list)
    monedas: list[str] = Field(default_factory=list)
    actualizado_en: datetime | None = None
