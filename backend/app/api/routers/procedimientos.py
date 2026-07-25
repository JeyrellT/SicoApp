"""Búsqueda de procedimientos y detalle de líneas adjudicadas.

El detalle exige el permiso 'detalle': es la consulta más cara del sistema y por
eso está reservada a los perfiles que realmente la necesitan.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response, status
from sqlalchemy import text

from app.api import cache
from app.api.deps import DB, Pag, UsuarioActual, UsuarioDetalle
from app.ratelimit import LIMITE_CONSULTA, LIMITE_PESADO, limiter
from app.schemas.comunes import Pagina
from app.schemas.datos import DetalleProcedimiento, LineaAdjudicada, ProcedimientoItem
from app.services import consultas

router = APIRouter(prefix="/v1/procedimientos", tags=["procedimientos"])

NroSicop = Annotated[str, Path(min_length=4, max_length=14, pattern=r"^[A-Za-z0-9\-]+$")]


@router.get("", response_model=Pagina[ProcedimientoItem], summary="Buscar procedimientos")
@limiter.limit(LIMITE_CONSULTA)
def buscar(
    request: Request,
    response: Response,
    db: DB,
    usuario: UsuarioActual,
    pag: Pag,
    buscar: Annotated[str | None, Query(max_length=160, description="Número o descripción")] = None,
    institucion: Annotated[str | None, Query(max_length=20)] = None,
    desde: Annotated[int | None, Query(ge=201001, le=210012)] = None,
    hasta: Annotated[int | None, Query(ge=201001, le=210012)] = None,
) -> Pagina[ProcedimientoItem]:
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, desde, hasta)
    clave = f"{buscar}-{institucion}-{d}-{h}-{pag.page}-{pag.page_size}"
    if cache.aplicar(request, response, db, extra=clave, usuario=usuario):
        return Pagina[ProcedimientoItem](items=[], total=0, page=pag.page, page_size=pag.page_size)

    condiciones = ["p.ultimo_periodo BETWEEN :d AND :h"]
    params: dict[str, object] = {"d": d, "h": h, "limit": pag.limit, "offset": pag.offset}
    if institucion:
        condiciones.append("p.ced_institucion = :inst")
        params["inst"] = "".join(ch for ch in institucion if ch.isalnum())
    if buscar:
        condiciones.append(
            "(p.numero_procedimiento ILIKE :patron OR p.descripcion ILIKE :patron "
            "OR p.nro_sicop LIKE :prefijo)"
        )
        params["patron"] = f"%{buscar.strip()}%"
        params["prefijo"] = f"{buscar.strip()}%"

    where = " AND ".join(condiciones)
    total = db.execute(
        text(f"SELECT COUNT(*) FROM sicop.dim_procedimiento p WHERE {where}"), params
    ).scalar() or 0

    filas = db.execute(
        text(
            f"""
            SELECT p.nro_sicop, p.numero_procedimiento, p.descripcion, p.ced_institucion,
                   i.nombre AS institucion, p.tipo_procedimiento, p.modalidad,
                   p.ultimo_periodo AS periodo,
                   COALESCE(inv.invitados, 0) AS invitados,
                   COALESCE(l.lineas, 0)      AS lineas,
                   COALESCE(l.monto_crc, 0)   AS monto_crc
            FROM sicop.dim_procedimiento p
            LEFT JOIN sicop.dim_institucion i ON i.cedula = p.ced_institucion
            LEFT JOIN LATERAL (
                SELECT SUM(invitados)::int AS invitados
                FROM sicop.agg_invitaciones_procedimiento a
                WHERE a.nro_sicop = p.nro_sicop AND a.periodo BETWEEN :d AND :h
            ) inv ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::bigint AS lineas,
                       COALESCE(SUM(monto_adju_linea_crc), 0) AS monto_crc
                FROM sicop.procedimiento_adjudicacion pa
                WHERE pa.nro_sicop = p.nro_sicop AND pa.periodo BETWEEN :d AND :h
            ) l ON TRUE
            WHERE {where}
            ORDER BY p.ultimo_periodo DESC, p.nro_sicop DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).all()

    return Pagina[ProcedimientoItem](
        items=[ProcedimientoItem(**dict(f._mapping)) for f in filas],
        total=int(total),
        page=pag.page,
        page_size=pag.page_size,
    )


@router.get(
    "/{nro_sicop}",
    response_model=DetalleProcedimiento,
    summary="Detalle de un procedimiento (requiere permiso 'detalle')",
)
@limiter.limit(LIMITE_PESADO)
def detalle(
    request: Request,
    nro_sicop: NroSicop,
    db: DB,
    usuario: UsuarioDetalle,
) -> DetalleProcedimiento:
    nro = "".join(ch for ch in nro_sicop if ch.isalnum())
    d, h, _ = consultas.ventana_permitida(db, usuario.perfil.meses_historia, None, None)

    cab = db.execute(
        text(
            """
            SELECT p.nro_sicop, p.numero_procedimiento, p.descripcion, p.ced_institucion,
                   i.nombre AS institucion, p.tipo_procedimiento, p.modalidad,
                   p.ultimo_periodo AS periodo
            FROM sicop.dim_procedimiento p
            LEFT JOIN sicop.dim_institucion i ON i.cedula = p.ced_institucion
            WHERE p.nro_sicop = :n
            """
        ),
        {"n": nro},
    ).first()
    if cab is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Procedimiento no encontrado."
        )

    lineas = db.execute(
        text(
            """
            SELECT pa.nro_sicop, pa.linea, pa.descr_bien_servicio AS descripcion,
                   pa.cantidad, pa.unidad_medida, pa.monto_unitario,
                   pa.moneda_adjudicada AS moneda,
                   pa.monto_adju_linea_crc AS monto_crc,
                   pa.monto_adju_linea_usd AS monto_usd,
                   pa.fecha_adjud_firme::date AS fecha_adjudicacion,
                   pa.cedula_proveedor, pr.nombre AS proveedor, pa.objeto_gasto
            FROM sicop.procedimiento_adjudicacion pa
            LEFT JOIN sicop.dim_proveedor pr ON pr.cedula_proveedor = pa.cedula_proveedor
            WHERE pa.nro_sicop = :n AND pa.periodo BETWEEN :d AND :h
            ORDER BY pa.linea
            LIMIT 500
            """
        ),
        {"n": nro, "d": d, "h": h},
    ).all()

    invitados = db.execute(
        text(
            "SELECT COALESCE(SUM(invitados),0) FROM sicop.agg_invitaciones_procedimiento "
            "WHERE nro_sicop = :n AND periodo BETWEEN :d AND :h"
        ),
        {"n": nro, "d": d, "h": h},
    ).scalar() or 0

    ofertas = db.execute(
        text(
            "SELECT COUNT(*) FROM sicop.ofertas WHERE nro_sicop = :n AND periodo BETWEEN :d AND :h"
        ),
        {"n": nro, "d": d, "h": h},
    ).scalar() or 0

    cabecera = ProcedimientoItem(**dict(cab._mapping))
    cabecera.lineas = len(lineas)
    cabecera.monto_crc = sum((f.monto_crc or 0) for f in lineas)
    cabecera.invitados = int(invitados)

    return DetalleProcedimiento(
        procedimiento=cabecera,
        lineas=[LineaAdjudicada(**dict(f._mapping)) for f in lineas],
        proveedores_invitados=int(invitados),
        ofertas_recibidas=int(ofertas),
    )
