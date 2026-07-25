"""Perfil de proveedor: con quién contrata, cuánto y qué tan seguido gana."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response, status
from sqlalchemy import text

from app.api import cache
from app.api.deps import DB, UsuarioActual
from app.ratelimit import LIMITE_PESADO, limiter
from app.schemas.datos import PerfilProveedor
from app.services import consultas

router = APIRouter(prefix="/v1/proveedores", tags=["proveedores"])

Cedula = Annotated[str, Path(min_length=1, max_length=20, pattern=r"^[A-Za-z0-9\-]+$")]


@router.get("/{cedula}/perfil", response_model=PerfilProveedor)
@limiter.limit(LIMITE_PESADO)
def perfil(
    request: Request,
    response: Response,
    cedula: Cedula,
    db: DB,
    usuario: UsuarioActual,
    desde: Annotated[int | None, Query(ge=201001, le=210012)] = None,
    hasta: Annotated[int | None, Query(ge=201001, le=210012)] = None,
    top: Annotated[int, Query(ge=1, le=50)] = 10,
) -> PerfilProveedor:
    ced = "".join(ch for ch in cedula if ch.isalnum())
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)

    nombre = db.execute(
        text("SELECT nombre FROM sicop.dim_proveedor WHERE cedula_proveedor = :c"), {"c": ced}
    ).scalar()
    existe_actividad = db.execute(
        text(
            "SELECT 1 FROM sicop.agg_mensual_proveedor "
            "WHERE cedula_proveedor = :c AND periodo BETWEEN :d AND :h LIMIT 1"
        ),
        {"c": ced, "d": d, "h": h},
    ).scalar()
    if nombre is None and not existe_actividad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ningún proveedor con esa cédula en los datos disponibles.",
        )

    if cache.aplicar(request, response, db, extra=f"{ced}-{d}-{h}-{top}", usuario=usuario):
        return PerfilProveedor(
            cedula=ced,
            nombre=nombre,
            periodo_desde=d,
            periodo_hasta=h,
            resumen=consultas.ResumenKPI(periodo_desde=d, periodo_hasta=h),
        )

    resumen = consultas.resumen_proveedor(db, ced, d, h)
    tasa = None
    if resumen.invitaciones:
        # Cuántas de las invitaciones recibidas terminaron en adjudicación.
        tasa = round(float(resumen.procedimientos) / float(resumen.invitaciones) * 100, 2)

    return PerfilProveedor(
        cedula=ced,
        nombre=nombre,
        periodo_desde=d,
        periodo_hasta=h,
        resumen=resumen,
        serie=consultas.serie_proveedor(db, ced, d, h),
        top_instituciones=consultas.contrapartes_de_proveedor(db, ced, d, h, top),
        categorias=[],
        tasa_exito_pct=tasa,
    )
