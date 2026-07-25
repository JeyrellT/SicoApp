"""Genera app/etl/tablas.py infiriendo tipos de los CSV reales de SICOP."""
from __future__ import annotations

import csv
import re
import sys
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

CSV_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else "csv202607")
SALIDA = Path(sys.argv[2] if len(sys.argv) > 2 else "tablas.py")
MAX_MUESTRA = 400_000

csv.field_size_limit(2**31 - 1)

# --- Configuración por archivo ---------------------------------------------

DIMENSIONES = {
    "InstitucionesRegistradas.csv": ("dim_institucion", ("cedula",)),
    "Proveedores.csv": ("dim_proveedor", ("cedula_proveedor",)),
}

# Renombres obligatorios: carga.py inserta en dim_*(cedula|cedula_proveedor, nombre).
RENOMBRES = {
    "InstitucionesRegistradas.csv": {"CEDULA": "cedula", "NOMBRE_INSTITUCION": "nombre",
                                     "ZONA_GEO_INST": "zona_geo"},
    "Proveedores.csv": {"CEDULA_PROVEEDOR": "cedula_proveedor", "NOMBRE_PROVEEDOR": "nombre",
                        "zona_geo_prov": "zona_geo"},
}

DELIMITADORES = {"SancionProveedores.csv": ","}
DEDUP = {"Remates.csv", "SistemaEvaluacionOfertas.csv", "ReajustePrecios.csv"}
OPCIONALES = {"Contratos.csv", "DetalleCarteles.csv", "DetalleLineaCartel.csv",
              "FechaPorEtapas.csv", "Garantias.csv", "ProcedimientoADM.csv", "Sistemas.csv"}

CLAVES = {
    "AdjudicacionesFirme.csv": ("nro_acto",),
    "Contratos.csv": ("nro_contrato", "secuencia"),
    "DetalleCarteles.csv": ("nro_sicop",),
    "DetalleLineaCartel.csv": ("nro_sicop", "numero_linea", "numero_partida"),
    "FechaPorEtapas.csv": ("nro_sicop", "linea"),
    "FuncionariosInhibicion.csv": ("ced_institucion", "ced_funcionario"),
    "Garantias.csv": ("nro_garantia",),
    "InstitucionesRegistradas.csv": ("cedula",),
    "InvitacionProcedimiento.csv": ("nro_sicop", "cedula_proveedor"),
    "LineasAdjudicadas.csv": ("nro_sicop", "nro_oferta", "nro_linea"),
    "LineasContratadas.csv": ("nro_sicop", "nro_contrato", "nro_linea_contrato"),
    "LineasOfertadas.csv": ("nro_sicop", "nro_oferta", "nro_linea"),
    "LineasRecibidas.csv": ("nro_sicop", "nro_linea"),
    "Ofertas.csv": ("nro_sicop", "nro_oferta"),
    "OrdenPedido.csv": ("nro_orden", "linea_ord_pedido"),
    "ProcedimientoADM.csv": ("nro_sicop", "numero_pa"),
    "ProcedimientoAdjudicacion.csv": ("nro_sicop", "linea"),
    "Proveedores.csv": ("cedula_proveedor",),
    "ReajustePrecios.csv": ("nro_contrato", "numero_reajuste"),
    "Recepciones.csv": ("nro_sicop", "nro_recep_definitiva"),
    "RecursosObjecion.csv": ("nro_recurso",),
    "Remates.csv": ("nro_sicop", "ced_proveedor"),
    "SancionProveedores.csv": ("cedula_proveedor", "no_resolucion"),
    "SistemaEvaluacionOfertas.csv": ("nro_sicop", "eval_item_seqno"),
    "Sistemas.csv": ("nro_sicop", "numero_linea"),
}

# Columnas de texto redundantes: no se guardan, alimentan dimensiones.
NOMBRE_INSTITUCION = {"INSTITUCION", "NOMBRE_INSTITUCION"}
NOMBRE_PROVEEDOR = {"NOMBRE_PROVEEDOR", "nombre_proveedor"}
NUM_PROCEDIMIENTO = {"NUMERO_PROCEDIMIENTO", "NRO_PROCEDIMIENTO", "nro_procedimiento"}
DESC_PROCEDIMIENTO = {"DESCR_PROCEDIMIENTO", "DESC_PROCEDIMIENTO",
                      "DESCRIPCION_PROCEDIMIENTO", "desc_procedimiento"}
CED_INSTITUCION = ["CED_INSTITUCION", "CEDULA_INSTITUCION", "cedula_institucion"]
CED_PROVEEDOR = ["CEDULA_PROVEEDOR", "CEDULAPROVEEDOR", "CED_PROVEEDOR", "cedula_proveedor"]

# ProcedimientoAdjudicacion define el procedimiento: conserva su número.
CONSERVA_NUM_PROC = {"ProcedimientoAdjudicacion.csv"}
# En ProcedimientoAdjudicacion la cédula de la institución se llama CEDULA a secas.
CED_INST_ESPECIAL = {"ProcedimientoAdjudicacion.csv": "CEDULA"}

# Identificadores: SIEMPRE texto (ceros a la izquierda / alfanuméricos).
ID_TEXTO = {
    "NRO_SICOP", "NUMERO_PROCEDIMIENTO", "NRO_PROCEDIMIENTO", "nro_procedimiento",
    "NRO_CONTRATO", "NRO_CONTRATO_WEB", "CONTRACT_NO", "NRO_ORDEN", "NRO_OFERTA",
    "CODIGO_PRODUCTO", "CODIGO_PRODUCTO_CL", "PROD_ID", "PROD_ID_CL", "NUMERO_PA",
    "NRO_RECURSO", "NRO_RECEP_PROVISIONAL", "NRO_RECEP_DEFINITIVA", "nro_garantia",
    "ID_CONSORCIO", "OBJETO_GASTO", "CLAS_OBJ", "COD_EXCEPCION", "CODIGO_BPIP",
    "CODIGO_IDENTIFICACION", "NO_RESOLUCION", "NUMERO_REAJUSTE", "CARTEL_NM",
    "garantia_NM", "reqer_nm", "ANO", "ced_garante", "CEDULA_REPRESENTANTE",
}
# Contadores internos seguros como entero.
ID_ENTERO = {
    "SECUENCIA", "NRO_ACTO", "EVAL_ITEM_SEQNO", "LINEA", "NRO_LINEA", "NUMERO_LINEA",
    "NUMERO_PARTIDA", "LINEA_ORD_PEDIDO", "NRO_LINEA_CONTRATO", "NRO_LINEA_CARTEL",
    "CARTEL_SEQ", "PARTIDA", "gara_seq", "LINEA_OBJETADA", "SECUENCIA_CONTRATO",
    "MESES_APP", "DIAS_APP", "dias_adelanto_atraso", "ENTREGA",
}
BOOLEANOS = {"PERMITE_RECURSOS", "DESIERTO", "INHAB_APERC", "MULTA_CAUSULA"}
# Fechas DDMMYYYY sin separadores, confirmadas en los datos.
FECHAS_COMPACTAS = {
    "FECHA_CONSTITUCION", "FECHA_EXPIRACION", "INICIO_SANCION", "FINAL_SANCION",
}


def snake(nombre: str) -> str:
    n = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    n = re.sub(r"[^0-9a-zA-Z_]", "_", n)
    n = re.sub(r"__+", "_", n).strip("_").lower()
    return n


def nombre_tabla(archivo: str) -> str:
    if archivo in DIMENSIONES:
        return DIMENSIONES[archivo][0]
    base = archivo[:-4]
    s = re.sub(r"(?<!^)(?=[A-Z])", "_", base).lower()
    return re.sub(r"__+", "_", s)


def es_entero(v: str) -> bool:
    return bool(re.fullmatch(r"-?\d{1,18}", v))


def es_decimal(v: str) -> bool:
    try:
        Decimal(v.replace(",", "."))
        return True
    except (InvalidOperation, ValueError):
        return False


def es_fecha(v: str) -> bool:
    x = v.split(".")[0].replace("T", " ")
    for f in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            datetime.strptime(x, f)
            return True
        except ValueError:
            continue
    return False


def tiene_hora(v: str) -> bool:
    x = v.split(".")[0]
    return " " in x and x.split(" ")[-1] != "00:00:00"


def perfilar(ruta: Path, delim: str):
    """Devuelve {columna: (n_no_nulos, max_len, todos_int, todos_dec, todos_fecha, hay_hora, bools, cero_izq)}."""
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        r = csv.reader(f, delimiter=delim, quotechar='"')
        try:
            cols = [c.strip().strip('"') for c in next(r)]
        except StopIteration:
            return [], {}
        est = {c: {"n": 0, "max": 0, "int": True, "dec": True, "fec": True,
                   "hora": False, "bool": True, "cero": False} for c in cols}
        for i, fila in enumerate(r):
            if i >= MAX_MUESTRA:
                break
            for c, v in zip(cols, fila, strict=False):
                v = (v or "").strip()
                if not v:
                    continue
                e = est[c]
                e["n"] += 1
                e["max"] = max(e["max"], len(v))
                if len(v) > 1 and v[0] == "0" and v[1] != ".":
                    e["cero"] = True
                if e["int"] and not es_entero(v):
                    e["int"] = False
                if e["dec"] and not es_decimal(v):
                    e["dec"] = False
                if e["fec"] and not es_fecha(v):
                    e["fec"] = False
                elif e["fec"] and tiene_hora(v):
                    e["hora"] = True
                if e["bool"] and v.lower() not in ("si", "sí", "s", "no", "n"):
                    e["bool"] = False
        return cols, est


def es_fecha_compacta(e: dict | None) -> bool:
    """8 dígitos sin separadores: '29062026' = 29/06/2026."""
    return bool(e and e["n"] and e["int"] and e["max"] == 8 and not e["cero"])


def inferir_tipo(col: str, e: dict | None) -> str:
    u = col.upper()
    # Longitud uniforme en identificadores: si una tabla truncara más que otra,
    # los joins entre ellas empezarían a fallar en silencio.
    if "CEDULA" in u or u.startswith("CED_"):
        return "cedula(20)"
    if u == "NRO_SICOP":
        return "varchar(20)"
    if col in FECHAS_COMPACTAS or (
        es_fecha_compacta(e) and any(k in u for k in ("FECHA", "SANCION", "INICIO", "FINAL"))
    ):
        return "fecha_compacta"
    if col in ID_TEXTO:
        largo = max(14, (e or {}).get("max", 0) + 6)
        return f"varchar({min(largo, 60)})"
    if col in BOOLEANOS:
        return "boolean"
    # Montos, precios y cantidades son numéricos por definición: si el perfilado
    # los ve como texto es por filas corruptas, no porque el campo sea texto.
    if any(u.startswith(p) or f"_{p}" in u for p in ("MONTO", "PRECIO", "CANTIDAD")) or u in (
        "IVA", "DESCUENTO", "ACARREOS", "OTROS_IMPUESTOS", "TIPO_CAMBIO_CRC",
        "TIPO_CAMBIO_DOLAR", "TIPO_CAMBIO_MONEDA", "PORC_EVAL", "PORC_INCR_ULT_RJ",
        "NUEVO_PRECIO", "PRECIO", "TOTAL_ORDEN", "TOTALESTIMADO", "USD_MONT",
    ):
        return "numeric(20,6)"
    if col in ID_ENTERO:
        return "bigint"
    if e is None or e["n"] == 0:
        # Archivo vacío este mes: se infiere por el nombre.
        u = col.upper()
        if u.startswith("FECHA") or "FECHA" in u:
            return "timestamp"
        if any(k in u for k in ("MONTO", "PRECIO", "CANTIDAD", "PLAZO", "PORC", "TIPO_CAMBIO")):
            return "numeric(20,6)"
        return "varchar(120)"
    if e["fec"]:
        return "timestamp" if e["hora"] else "date"
    if e["bool"]:
        return "boolean"
    if e["int"] and not e["cero"] and e["max"] <= 18:
        return "bigint"
    if e["dec"] and not e["cero"]:
        return "numeric(20,6)"
    largo = int(e["max"] * 1.3) + 8
    return "text" if largo > 300 else f"varchar({largo})"


def columna_libre_de(cols: list[str], est: dict) -> str | None:
    """La columna de texto más larga: la única capaz de traer el delimitador sin comillas."""
    candidatas = [
        c for c in cols
        if est.get(c, {}).get("max", 0) >= 40
        and any(k in c.upper() for k in ("DESC", "DES_", "NOMBRE", "OBSERV", "DETALLE"))
    ]
    if not candidatas:
        return None
    return max(candidatas, key=lambda c: est[c]["max"])


# Índices acotados a mano donde el costo de almacenamiento manda sobre la
# comodidad de consulta. Medido: cada índice sobre invitaciones cuesta ~10 MB por
# mes (240 MB en la ventana de 24). El conteo de invitados sale del agregado, y
# un filtro por proveedor recorre una sola partición mensual.
INDICES_FIJOS = {
    "invitacion_procedimiento": (("nro_sicop",),),
}


def indices_de(tabla: str, destino: list[str]) -> list[tuple[str, ...]]:
    if tabla in INDICES_FIJOS:
        return [i for i in INDICES_FIJOS[tabla] if all(c in destino for c in i)]
    idx: list[tuple[str, ...]] = []
    for cand in ("nro_sicop", "ced_institucion", "cedula_institucion", "cedula",
                 "cedula_proveedor", "cedulaproveedor", "ced_proveedor", "nro_contrato"):
        if cand in destino and len(idx) < 3:
            if tabla.startswith("dim_") and cand in ("cedula", "cedula_proveedor"):
                continue
            idx.append((cand,))
    return idx[:3]


def generar() -> str:
    partes = [
        '"""Declaración de las 25 tablas del ZIP mensual de SICOP.',
        "",
        "GENERADO por scripts/generar_tablas.py a partir de los CSV reales: los tipos",
        "salen de los datos observados, no de suposiciones. Al cambiar el origen,",
        "regenerar y revisar el diff (tests/test_tablas_spec.py valida contra el ZIP).",
        "",
        "Criterios fijos:",
        "  - Cédulas e identificadores son texto: llevan ceros a la izquierda.",
        "  - Los nombres de institución, proveedor y procedimiento NO se guardan en los",
        "    hechos; se derivan por join a las dimensiones. Sobre la tabla de",
        "    invitaciones eso elimina ~52 % del volumen.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from app.etl.tipos import Columna, Enriquecimiento, TablaSpec, validar_specs",
        "",
        "TABLAS: tuple[TablaSpec, ...] = (",
    ]

    archivos = sorted(p.name for p in CSV_DIR.glob("*.csv"))
    for archivo in archivos:
        delim = DELIMITADORES.get(archivo, ";")
        cols, est = perfilar(CSV_DIR / archivo, delim)
        tabla = nombre_tabla(archivo)
        es_dim = archivo in DIMENSIONES
        renombres = RENOMBRES.get(archivo, {})

        ced_inst = CED_INST_ESPECIAL.get(archivo)
        if not ced_inst:
            ced_inst = next((c for c in CED_INSTITUCION if c in cols), None)
        ced_prov = next((c for c in CED_PROVEEDOR if c in cols), None)
        tiene_sicop = "NRO_SICOP" in cols

        enriquece: list[str] = []
        campos_inst: dict[str, str] = {}
        campos_prov: dict[str, str] = {}
        campos_proc: dict[str, str] = {}

        lineas_col: list[str] = []
        for c in cols:
            e = est.get(c)
            descartar = False
            if not es_dim:
                if c in NOMBRE_INSTITUCION and ced_inst:
                    descartar, campos_inst[c] = True, "nombre"
                elif c in NOMBRE_PROVEEDOR and ced_prov:
                    descartar, campos_prov[c] = True, "nombre"
                elif c in NUM_PROCEDIMIENTO and tiene_sicop and archivo not in CONSERVA_NUM_PROC:
                    descartar, campos_proc[c] = True, "numero_procedimiento"
                elif c in DESC_PROCEDIMIENTO and tiene_sicop:
                    descartar, campos_proc[c] = True, "descripcion"
                elif c in NUM_PROCEDIMIENTO and archivo in CONSERVA_NUM_PROC:
                    campos_proc[c] = "numero_procedimiento"

            if descartar:
                lineas_col.append(f'        Columna("{c}", None),')
            else:
                destino = renombres.get(c) or snake(c)
                tipo = inferir_tipo(c, e)
                lineas_col.append(f'        Columna("{c}", "{destino}", "{tipo}"),')

        if campos_inst and ced_inst:
            campos = ", ".join(f'"{k}": "{v}"' for k, v in campos_inst.items())
            enriquece.append(
                f'        Enriquecimiento("dim_institucion", "{ced_inst}", {{{campos}}}),'
            )
        if campos_prov and ced_prov:
            campos = ", ".join(f'"{k}": "{v}"' for k, v in campos_prov.items())
            enriquece.append(
                f'        Enriquecimiento("dim_proveedor", "{ced_prov}", {{{campos}}}),'
            )
        if campos_proc and tiene_sicop:
            if ced_inst:
                campos_proc[ced_inst] = "ced_institucion"
            campos = ", ".join(f'"{k}": "{v}"' for k, v in campos_proc.items())
            enriquece.append(
                f'        Enriquecimiento("dim_procedimiento", "NRO_SICOP", {{{campos}}}),'
            )

        destino = [
            (renombres.get(c) or snake(c))
            for c in cols
            if not (
                not es_dim
                and (
                    (c in NOMBRE_INSTITUCION and ced_inst)
                    or (c in NOMBRE_PROVEEDOR and ced_prov)
                    or (c in NUM_PROCEDIMIENTO and tiene_sicop and archivo not in CONSERVA_NUM_PROC)
                    or (c in DESC_PROCEDIMIENTO and tiene_sicop)
                )
            )
        ]
        clave = tuple(k for k in CLAVES.get(archivo, ()) if k in destino) or (destino[0],)
        idx = indices_de(tabla, destino)

        partes.append("    TablaSpec(")
        partes.append(f'        archivo="{archivo}",')
        partes.append(f'        tabla="{tabla}",')
        partes.append(f"        clave={clave!r},")
        if es_dim:
            partes.append("        particionada=False,")
        if delim != ";":
            partes.append(f'        delimitador="{delim}",')
        if archivo in DEDUP:
            partes.append("        dedup=True,")
        if archivo in OPCIONALES:
            partes.append("        opcional=True,")
        libre = columna_libre_de(cols, est)
        if libre:
            partes.append(f'        columna_libre="{libre}",')
        partes.append("        columnas=(")
        partes.extend(lineas_col)
        partes.append("        ),")
        if enriquece:
            partes.append("        enriquece=(")
            partes.extend(enriquece)
            partes.append("        ),")
        if idx:
            partes.append(f"        indices={tuple(idx)!r},")
        partes.append("    ),")

    partes += [
        ")",
        "",
        "validar_specs(list(TABLAS))",
        "",
        "POR_ARCHIVO = {t.archivo: t for t in TABLAS}",
        "POR_TABLA = {t.tabla: t for t in TABLAS}",
        "HECHOS = tuple(t for t in TABLAS if t.particionada)",
        "DIMENSIONES = tuple(t for t in TABLAS if not t.particionada)",
        "",
    ]
    return "\n".join(partes)


if __name__ == "__main__":
    SALIDA.write_text(generar(), encoding="utf-8")
    print(f"Escrito {SALIDA} ({len(SALIDA.read_text(encoding='utf-8').splitlines())} líneas)")
