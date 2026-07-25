"""Gestión de usuarios y operación del ETL. Requiere permiso 'admin'."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import DB, Pag, UsuarioAdmin
from app.models.auth import Usuario
from app.models.ops import Carga, EstadoTabla
from app.schemas.auth import (
    UsuarioActualizarIn,
    UsuarioCreadoOut,
    UsuarioCrearIn,
    UsuarioOut,
)
from app.schemas.comunes import Pagina
from app.services import usuarios as svc

router = APIRouter(prefix="/v1/admin", tags=["administración"])


@router.get("/usuarios", response_model=Pagina[UsuarioOut])
def listar_usuarios(
    db: DB,
    _: UsuarioAdmin,
    pag: Pag,
    buscar: str | None = Query(default=None, max_length=120),
) -> Pagina[UsuarioOut]:
    cond = []
    if buscar:
        patron = f"%{buscar.strip().lower()}%"
        cond.append(func.lower(Usuario.nombre).like(patron) | Usuario.email.like(patron))

    total = db.scalar(select(func.count()).select_from(Usuario).where(*cond)) or 0
    filas = db.scalars(
        select(Usuario).where(*cond).order_by(Usuario.creado_en.desc()).offset(pag.offset).limit(pag.limit)
    ).all()
    return Pagina[UsuarioOut](
        items=[UsuarioOut.model_validate(u) for u in filas],
        total=total,
        page=pag.page,
        page_size=pag.page_size,
    )


@router.post("/usuarios", response_model=UsuarioCreadoOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(datos: UsuarioCrearIn, db: DB, _: UsuarioAdmin) -> UsuarioCreadoOut:
    usuario, temporal = svc.crear_usuario(
        db,
        email=datos.email,
        nombre=datos.nombre,
        password=datos.password,
        perfil_codigo=datos.perfil_codigo,
        organizacion=datos.organizacion,
    )
    return UsuarioCreadoOut(
        usuario=UsuarioOut.model_validate(usuario), password_temporal=temporal
    )


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(
    usuario_id: uuid.UUID, datos: UsuarioActualizarIn, db: DB, admin: UsuarioAdmin
) -> UsuarioOut:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if datos.nombre is not None:
        usuario.nombre = datos.nombre
    if datos.organizacion is not None:
        usuario.organizacion = datos.organizacion or None
    if datos.perfil_codigo is not None:
        usuario.perfil_id = svc.obtener_perfil(db, datos.perfil_codigo).id
    if datos.activo is not None:
        if not datos.activo and usuario.id == admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puede desactivar su propia cuenta.",
            )
        usuario.activo = datos.activo
        if not datos.activo:
            svc.revocar_todas(db, usuario.id)

    db.commit()
    db.refresh(usuario)
    return UsuarioOut.model_validate(usuario)


@router.post("/usuarios/{usuario_id}/sesiones/revocar", status_code=status.HTTP_200_OK)
def revocar_sesiones(usuario_id: uuid.UUID, db: DB, _: UsuarioAdmin) -> dict[str, int]:
    if db.get(Usuario, usuario_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return {"sesiones_revocadas": svc.revocar_todas(db, usuario_id)}


# --- Operación del ETL -----------------------------------------------------


@router.get("/cargas")
def listar_cargas(db: DB, _: UsuarioAdmin, limite: int = Query(default=30, ge=1, le=200)) -> list[dict]:
    filas = db.scalars(select(Carga).order_by(Carga.iniciado_en.desc()).limit(limite)).all()
    return [
        {
            "id": c.id,
            "periodo": c.periodo,
            "estado": c.estado,
            "exito": c.exito,
            "filas_total": c.filas_total,
            "bytes_zip": c.bytes_zip,
            "etag": c.etag,
            "duracion_s": c.duracion_s,
            "iniciado_en": c.iniciado_en,
            "finalizado_en": c.finalizado_en,
            "error": c.error,
        }
        for c in filas
    ]


@router.get("/cargas/{carga_id}/tablas")
def detalle_carga(carga_id: int, db: DB, _: UsuarioAdmin) -> list[dict]:
    filas = db.scalars(
        select(EstadoTabla).where(EstadoTabla.carga_id == carga_id).order_by(EstadoTabla.tabla)
    ).all()
    if not filas:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga no encontrada.")
    return [
        {"tabla": f.tabla, "filas": f.filas, "filas_malas": f.filas_malas} for f in filas
    ]


@router.post("/etl/ejecutar", status_code=status.HTTP_202_ACCEPTED)
def ejecutar_etl(
    tareas: BackgroundTasks,
    _: UsuarioAdmin,
    periodo: int | None = Query(default=None, description="yyyymm; por defecto el mes en curso"),
    forzar: bool = Query(default=False, description="Ignora el ETag y recarga aunque no haya cambios"),
) -> dict[str, str]:
    """Dispara una corrida del ETL en segundo plano (además del cron diario)."""
    from app.etl.periodos import periodo_actual, valido
    from app.etl.pipeline import ejecutar_periodo

    p = periodo or periodo_actual()
    if not valido(p):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Periodo inválido.")

    tareas.add_task(ejecutar_periodo, p, forzar)
    return {"estado": "encolado", "periodo": str(p)}
