"""Catálogos de instituciones y proveedores: búsqueda y listados paginados."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request, Response
from sqlalchemy import text

from app.api import cache
from app.api.deps import DB, Pag, UsuarioActual
from app.ratelimit import LIMITE_PESADO, limiter
from app.schemas.comunes import Pagina
from app.schemas.datos import InstitucionItem, ProveedorItem
from app.services import consultas

router = APIRouter(prefix="/v1/catalogo", tags=["catálogo"])


@router.get("/instituciones", response_model=Pagina[InstitucionItem])
@limiter.limit(LIMITE_PESADO)
def instituciones(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    pag: Pag,
    buscar: Annotated[str | None, Query(max_length=120)] = None,
    con_actividad: Annotated[
        bool, Query(description="Solo las que tienen adjudicaciones en la ventana")
    ] = True,
) -> Pagina[InstitucionItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, None, None)
    if cache.aplicar(request, response, db, extra=f"{pag.page}-{pag.page_size}-{buscar}-{con_actividad}", usuario=usuario):
        return Pagina[InstitucionItem](items=[], total=0, page=pag.page, page_size=pag.page_size)

    filtro_texto = "AND i.nombre ILIKE :patron" if buscar else ""
    params = {"d": d, "h": h, "limit": pag.limit, "offset": pag.offset}
    if buscar:
        params["patron"] = f"%{buscar.strip()}%"

    if con_actividad:
        base = f"""
            FROM sicop.agg_mensual_institucion a
            LEFT JOIN sicop.dim_institucion i ON i.cedula = a.ced_institucion
            WHERE a.periodo BETWEEN :d AND :h {filtro_texto}
        """
        sql_items = f"""
            SELECT a.ced_institucion AS cedula, i.nombre,
                   SUM(a.procedimientos)::bigint AS procedimientos,
                   SUM(a.monto_crc) AS monto_crc
            {base}
            GROUP BY a.ced_institucion, i.nombre
            ORDER BY monto_crc DESC
            LIMIT :limit OFFSET :offset
        """
        sql_total = f"SELECT COUNT(DISTINCT a.ced_institucion) {base}"
    else:
        base = f"FROM sicop.dim_institucion i WHERE 1=1 {filtro_texto}"
        sql_items = f"""
            SELECT i.cedula, i.nombre, 0::bigint AS procedimientos, 0::numeric AS monto_crc
            {base}
            ORDER BY i.nombre NULLS LAST
            LIMIT :limit OFFSET :offset
        """
        sql_total = f"SELECT COUNT(*) {base}"

    total = db.execute(text(sql_total), params).scalar() or 0
    filas = db.execute(text(sql_items), params).all()
    return Pagina[InstitucionItem](
        items=[InstitucionItem(**dict(f._mapping)) for f in filas],
        total=int(total),
        page=pag.page,
        page_size=pag.page_size,
    )


@router.get("/proveedores", response_model=Pagina[ProveedorItem])
@limiter.limit(LIMITE_PESADO)
def proveedores(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    pag: Pag,
    buscar: Annotated[str | None, Query(max_length=120)] = None,
    con_actividad: Annotated[bool, Query()] = True,
) -> Pagina[ProveedorItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, None, None)
    if cache.aplicar(request, response, db, extra=f"{pag.page}-{pag.page_size}-{buscar}-{con_actividad}", usuario=usuario):
        return Pagina[ProveedorItem](items=[], total=0, page=pag.page, page_size=pag.page_size)

    # La búsqueda acepta nombre o cédula: es como la usa el analista.
    filtro = ""
    params = {"d": d, "h": h, "limit": pag.limit, "offset": pag.offset}
    if buscar:
        filtro = "AND (p.nombre ILIKE :patron OR p.cedula_proveedor LIKE :cedula)"
        params["patron"] = f"%{buscar.strip()}%"
        params["cedula"] = f"{''.join(ch for ch in buscar if ch.isalnum())}%"

    if con_actividad:
        base = f"""
            FROM sicop.agg_mensual_proveedor a
            LEFT JOIN sicop.dim_proveedor p ON p.cedula_proveedor = a.cedula_proveedor
            WHERE a.periodo BETWEEN :d AND :h {filtro}
        """
        sql_items = f"""
            SELECT a.cedula_proveedor AS cedula, p.nombre,
                   SUM(a.adjudicaciones)::bigint AS adjudicaciones,
                   SUM(a.monto_crc) AS monto_crc
            {base}
            GROUP BY a.cedula_proveedor, p.nombre
            ORDER BY monto_crc DESC
            LIMIT :limit OFFSET :offset
        """
        sql_total = f"SELECT COUNT(DISTINCT a.cedula_proveedor) {base}"
    else:
        base = f"FROM sicop.dim_proveedor p WHERE 1=1 {filtro}"
        sql_items = f"""
            SELECT p.cedula_proveedor AS cedula, p.nombre,
                   0::bigint AS adjudicaciones, 0::numeric AS monto_crc
            {base}
            ORDER BY p.nombre NULLS LAST
            LIMIT :limit OFFSET :offset
        """
        sql_total = f"SELECT COUNT(*) {base}"

    total = db.execute(text(sql_total), params).scalar() or 0
    filas = db.execute(text(sql_items), params).all()
    return Pagina[ProveedorItem](
        items=[ProveedorItem(**dict(f._mapping)) for f in filas],
        total=int(total),
        page=pag.page,
        page_size=pag.page_size,
    )
