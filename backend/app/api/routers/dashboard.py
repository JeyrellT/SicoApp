"""Dashboard principal: KPIs, series y rankings.

Todo se responde desde agregados. El cliente pide solo lo que muestra en pantalla.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request, Response

from app.api import cache
from app.api.deps import DB, UsuarioActual
from app.ratelimit import LIMITE_CONSULTA, limiter
from app.schemas.datos import (
    CategoriaItem,
    InstitucionItem,
    OpcionesFiltro,
    ProveedorItem,
    PuntoSerie,
    ResumenKPI,
    TipoProcedimientoItem,
)
from app.services import consultas

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])

Desde = Annotated[int | None, Query(ge=201001, le=210012, description="Periodo inicial yyyymm")]
Hasta = Annotated[int | None, Query(ge=201001, le=210012, description="Periodo final yyyymm")]


@router.get("/resumen", response_model=ResumenKPI, summary="KPIs del rango seleccionado")
@limiter.limit(LIMITE_CONSULTA)
def resumen(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
) -> ResumenKPI:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return ResumenKPI(periodo_desde=d, periodo_hasta=h)
    return consultas.resumen(db, d, h)


@router.get("/serie", response_model=list[PuntoSerie], summary="Evolución mensual")
@limiter.limit(LIMITE_CONSULTA)
def serie(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
) -> list[PuntoSerie]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return []
    return consultas.serie_mensual(db, d, h)


@router.get(
    "/top-instituciones", response_model=list[InstitucionItem], summary="Instituciones por monto"
)
@limiter.limit(LIMITE_CONSULTA)
def top_instituciones(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
    limite: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[InstitucionItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return []
    return consultas.top_instituciones(db, d, h, limite)


@router.get("/top-proveedores", response_model=list[ProveedorItem], summary="Proveedores por monto")
@limiter.limit(LIMITE_CONSULTA)
def top_proveedores(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
    limite: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[ProveedorItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return []
    return consultas.top_proveedores(db, d, h, limite)


@router.get("/categorias", response_model=list[CategoriaItem], summary="Gasto por objeto de gasto")
@limiter.limit(LIMITE_CONSULTA)
def categorias(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[CategoriaItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return []
    return consultas.categorias(db, d, h, limite)


@router.get(
    "/tipos-procedimiento",
    response_model=list[TipoProcedimientoItem],
    summary="Distribución por tipo de procedimiento",
)
@limiter.limit(LIMITE_CONSULTA)
def tipos_procedimiento(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    desde: Desde = None,
    hasta: Hasta = None,
) -> list[TipoProcedimientoItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    if cache.aplicar(request, response, db, usuario=usuario):
        return []
    return consultas.tipos_procedimiento(db, d, h)


@router.get("/filtros", response_model=OpcionesFiltro, summary="Valores para poblar los selectores")
@limiter.limit(LIMITE_CONSULTA)
def filtros(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
) -> OpcionesFiltro:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, None, None)
    if cache.aplicar(request, response, db, usuario=usuario):
        return OpcionesFiltro()
    return consultas.opciones_filtro(db, d, h)
