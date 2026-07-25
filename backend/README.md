# Backend SICOP

API de consulta sobre los **últimos 24 meses** de contratación pública de Costa Rica.
Reemplaza la descarga manual de los ZIP mensuales del
[Observatorio de Compra Pública](https://www.observatoriocomprapublica.go.cr/descargas-sicop/):
el backend los ingiere todos los días y el frontend solo pide agregados ya calculados.

## Por qué está construido así

Cada decisión de diseño responde a una de dos preguntas: *¿es correcto?* y *¿cuánto cuesta al mes?*

| Decisión | Motivo |
|---|---|
| Ventana móvil de 24 meses con particiones por periodo | Recargar un mes es vaciar una partición; salir de la ventana es un `DROP` que libera el espacio de inmediato. |
| Nombres de institución, proveedor y procedimiento fuera de los hechos | Están en dimensiones y se recuperan por join. Sobre la tabla de invitaciones ahorra ~52 % del volumen. |
| Tablas de hechos **sin clave primaria** | Cada mes se reemplaza completo, así que la unicidad no protege de nada, y un índice único sobre decenas de millones de filas costaría cientos de megabytes de volumen pago. |
| Tablas `agg_*` precalculadas por el ETL | Un KPI lee miles de filas en vez de millones. El costo de agregar se paga una vez al día, no una vez por visita. |
| Perfiles con `meses_historia` y `limite_page_size` | El techo por perfil no es solo permisos: impide que una consulta barra 24 meses cuando el usuario necesita 12. |
| ETag + `Cache-Control` en todas las lecturas | Los datos cambian una vez al día; una respuesta 304 no cuesta ni CPU ni ancho de banda. |
| Un solo worker de uvicorn | La RAM se factura por GB/mes y la carga es de lectura cacheada. |

## Estructura

```
backend/
  app/
    main.py            arranque de FastAPI, middlewares y routers
    config.py          configuración; sin valores por defecto para secretos
    security.py        Argon2id + JWT (access + refresh rotativo)
    db.py              motores: uno para la API (timeout 25 s) y otro para el ETL (sin timeout)
    logging_setup.py   logs JSON con redacción obligatoria de secretos
    api/routers/       salud, autenticación, dashboard, catálogo, procedimientos,
                       proveedores, instituciones, administración
    services/          lógica de cuentas, siembra y consultas analíticas
    etl/
      tipos.py         modelo declarativo de tablas (única fuente de verdad)
      tablas.py        las 25 tablas, GENERADO desde los CSV reales
      ddl.py           genera el esquema a partir de las declaraciones
      descarga.py      descarga condicional por ETag desde el blob del Observatorio
      lectura.py       lectura tolerante de los CSV (incluye reparación de filas partidas)
      carga.py         COPY por partición + fusión de dimensiones
      agregados.py     recálculo de las tablas agg_*
      retencion.py     ventana de 24 meses
      pipeline.py      orquestación
      run.py           entrada del cron
  migrations/          Alembic (auth y ops; el esquema sicop lo genera ddl.py)
  scripts/generar_tablas.py   regenera app/etl/tablas.py desde un ZIP real
  tests/
```

## Desarrollo local

Requiere Python 3.12 y un PostgreSQL 15+.

```bash
cd backend
py -3.12 -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
```

Variables mínimas (nunca las comprometas en el repo):

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRET` | **sí** | Mínimo 32 caracteres. Sin ella el proceso no arranca, a propósito. |
| `DATABASE_URL` | sí | Railway la inyecta sola. Acepta `postgres://` y la normaliza. |
| `ENTORNO` | no | `dev`, `test` o `prod`. |
| `CORS_ORIGINS` | sí en prod | Lista separada por comas con el dominio del frontend. |
| `ADMIN_EMAIL` | no | Correo del administrador inicial. No puede usar un dominio reservado (`.local`, `.test`, `.example`): el validador los rechaza y la cuenta quedaría inutilizable. |
| `ADMIN_PASSWORD` | **sí en prod** | En producción es obligatoria; sin ella el servicio no arranca a propósito. Fuera de producción, si se omite se genera una y se imprime en consola — nunca se escribe al log. |
| `REGISTRO_ABIERTO` | no | `false` por defecto: las cuentas las crea un administrador. |
| `RETENTION_MONTHS` | no | 24 por defecto. |
| `ETL_HABILITADO` | no | `0` apaga el ETL sin tocar el código. |

Generar un secreto:

```bash
python -c "from app.config import generar_secreto; print(generar_secreto())"
```

Arrancar:

```bash
alembic upgrade head && uvicorn app.main:app --reload
```

Documentación interactiva en `/docs`.

## ETL

```bash
python -m app.etl.run diario          # mes en curso (+ cierre del anterior los días 1-5)
python -m app.etl.run periodo 202606  # un mes puntual (agregar --forzar ignora el ETag)
python -m app.etl.run backfill        # carga los 24 meses de la ventana
python -m app.etl.run republicados    # revisa meses cerrados que el origen rehizo
python -m app.etl.run estado
```

Reglas que implementa:

1. **Mes en curso**: se recarga a diario mientras el origen lo siga cambiando. Si el ETag no cambió, la corrida cuesta una petición HEAD y termina.
2. **Cierre de mes**: entre los días 1 y 5 se descarga por última vez el mes anterior y queda marcado como `final`.
3. **Republicaciones**: el Observatorio a veces rehace un mes ya cerrado (verificado: `202503.zip` se modificó un mes después de cerrar). Cada corrida compara el ETag de los últimos 3 meses.
4. **Retención**: lo que sale de la ventana de 24 meses se elimina con `DROP` de partición.

## Pruebas

```bash
# unitarias (requieren un PostgreSQL; por defecto 127.0.0.1:55432)
./.venv/Scripts/python.exe -m pytest -m "not integracion"

# integración contra datos reales
SICOP_ZIP_PRUEBA=/ruta/202607.zip ./.venv/Scripts/python.exe -m pytest -m integracion
```

`TEST_DATABASE_URL` permite apuntar a otro servidor. La base de prueba se crea sola.

## Regenerar la especificación de tablas

`app/etl/tablas.py` está generado a partir de los CSV reales: los tipos salen de los
datos observados, no de suposiciones. Si el Observatorio cambia el formato:

```bash
python scripts/generar_tablas.py /ruta/csv_extraidos app/etl/tablas.py
pytest tests/test_tablas_spec.py     # valida la especificación contra un ZIP real
```

Revisá siempre el diff: un cambio de tipo inesperado suele indicar un cambio en el origen.

## Despliegue en Railway

Ver [`docs/DESPLIEGUE_RAILWAY.md`](docs/DESPLIEGUE_RAILWAY.md).

## Seguridad

- Contraseñas con Argon2id (parámetros OWASP: 19 MiB, t=2, p=1), con un semáforo
  que acota a 4 los hashes concurrentes: sin él, 40 hilos × 19 MiB tumbarían el
  contenedor con puros intentos de login.
- Tokens de acceso de 60 minutos y refresh rotativo de 14 días, guardado **hasheado**.
  Reusar un refresh ya rotado cierra **todas** las sesiones del usuario, que es el
  caso de un token robado.
- Bloqueo temporal tras 5 intentos fallidos, devolviendo el **mismo** error que un
  correo inexistente: un mensaje distinto permitiría enumerar cuentas y dejar
  fuera al administrador a propósito.
- Una contraseña temporal solo sirve para cambiarla; el resto de la API responde 403.
- Límite de tasa por usuario autenticado, y por IP tomada del **último** valor de
  `X-Forwarded-For` (el primero lo escribe el cliente y permitiría rotarla).
- Logs con redacción obligatoria de secretos, verificada por
  `tests/test_logging_redaccion.py`. El filtro no toca los argumentos numéricos:
  convertirlos a texto rompía los formatos `%d`.
- `/docs` y `/openapi.json` quedan cerrados en producción.
- Dependencias bloqueadas en `requirements.lock.txt` (directas **y** transitivas);
  `pip-audit -r requirements.lock.txt` debe salir en 0 antes de desplegar.
