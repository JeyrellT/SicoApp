# Despliegue en Railway

Tres servicios en un proyecto: **Postgres**, **api** (FastAPI) y **etl** (cron diario).
La misma imagen sirve para api y etl; solo cambia el comando de arranque.

```
Blob del Observatorio ──HTTP──> [etl] ──COPY──> [Postgres] <──SELECT── [api] ──JSON──> Frontend
                                cron 14:00 UTC   volumen                        (GitHub Pages)
```

## Paso 0 — Autenticación de la CLI

**Este es el único paso que no se puede automatizar.** La CLI usa OAuth y el token
de esta máquina está vencido.

```bash
railway login
```

Para un pipeline sin navegador, generá un **Project Token** en el dashboard
(Project Settings → Tokens) y exportalo; la CLI lo detecta sin `railway login`:

```bash
export RAILWAY_TOKEN="<project-token>"
```

`RAILWAY_TOKEN` fija proyecto y entorno. `RAILWAY_API_TOKEN` es de cuenta y obliga a
pasar `--project` / `--environment` / `--service` en cada comando.

## Paso 1 — Proyecto y base de datos

```bash
railway init --name sicop
```

```bash
railway add --database postgres
```

Railway crea el servicio Postgres con su volumen y publica `DATABASE_URL`.

## Paso 2 — Servicio de la API

```bash
railway add --service api
```

Variables (sustituí los valores; el secreto se genera, no se inventa):

```bash
railway variables --service api \
  --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
  --set "JWT_SECRET=$(python -c 'import secrets;print(secrets.token_urlsafe(48))')" \
  --set "ENTORNO=prod" \
  --set "CORS_ORIGINS=https://jeyrellt.github.io" \
  --set "ADMIN_EMAIL=gerencia@jcanalytic.com" \
  --set "ADMIN_PASSWORD=<generada, ver abajo>" \
  --set "RETENTION_MONTHS=24" \
  --set "TZ=America/Costa_Rica"
```

> **`ADMIN_PASSWORD` es obligatoria en producción.** Si falta, el servicio se
> niega a arrancar a propósito: la alternativa sería generar una contraseña y
> escribirla en el log, donde la vería cualquiera con acceso al proyecto o a un
> agregador de logs, y entraría como administrador antes que el dueño. Generala
> localmente y pegala como variable (Railway la guarda cifrada):
>
> ```bash
> python -c "from app.security import generar_password_segura; print(generar_password_segura())"
> ```
>
> Cambiala desde la aplicación en el primer ingreso. Mientras el usuario tenga
> `debe_cambiar_password`, su token **solo** sirve para cambiar la contraseña:
> el resto de la API le responde 403.

> **`JWT_SECRET` se genera una sola vez.** Volver a generarlo en cada despliegue
> cierra en silencio la sesión de todos los usuarios. El script de despliegue lo
> respeta si ya existe.

**El contexto de build es `backend/`, no la raíz del repositorio.** El Dockerfile
copia rutas relativas a esa carpeta (`COPY app ./app`), así que hay que desplegar
desde ahí:

```bash
cd backend && railway up --service api --detach
```

Si conectás el servicio a GitHub en vez de subirlo desde la CLI, poné
**Root Directory = `backend`** en Settings del servicio. Sin eso el build falla
con "COPY failed: file not found".

`backend/railway.json` declara el Dockerfile, el healthcheck en `/salud/vivo`
y la política de reinicio.

Dominio público:

```bash
railway domain --service api
```

## Paso 3 — Servicio del ETL (cron)

```bash
railway add --service etl
```

```bash
railway variables --service etl \
  --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}" \
  --set "JWT_SECRET=\${{api.JWT_SECRET}}" \
  --set "ENTORNO=prod" \
  --set "TZ=America/Costa_Rica" \
  --set "RAILWAY_CONFIG_PATH=railway.etl.json"
```

`backend/railway.etl.json` fija `cronSchedule: "0 14 * * *"`. Este servicio también
necesita **Root Directory = `backend`**.

**El cron de Railway corre siempre en UTC.** Las 14:00 UTC son las 08:00 en Costa
Rica, aproximadamente una hora después de que el Observatorio regenera el archivo
del mes (~13:05 UTC), con margen para que la publicación termine.

```bash
cd backend && railway up --service etl --detach
```

## Paso 4 — Carga inicial

El cron solo trae el mes en curso. Para poblar los 24 meses, una vez:

```bash
railway run --service etl -- python -m app.etl.run backfill
```

Toma entre 30 y 90 minutos y descarga ~900 MB. La descarga es *ingress*: Railway no
la cobra. También puede lanzarse desde la API con `POST /v1/admin/etl/ejecutar`
por cada periodo.

## Paso 5 — Verificación

```bash
curl -s https://<dominio>/salud/datos | python -m json.tool
```

Debe responder `estado: "operativo"`, 24 periodos y la fecha de la última carga.

```bash
railway logs --service api
```

En el primer arranque aparece la contraseña temporal del administrador. Cambiala
de inmediato desde la aplicación: el usuario tiene `debe_cambiar_password`.

## Paso 6 — Frontend

En el repositorio del frontend, definir la URL de la API antes de compilar:

```bash
REACT_APP_API_URL=https://<dominio> npm run build && npm run deploy
```

Y agregar ese origen a `CORS_ORIGINS` en el servicio `api`.

## Operación

| Necesidad | Comando |
|---|---|
| Ver corridas del ETL | `GET /v1/admin/cargas` (perfil admin) |
| Forzar una carga | `POST /v1/admin/etl/ejecutar?periodo=202607&forzar=true` |
| Recargar un mes desde la CLI | `railway run --service etl -- python -m app.etl.run periodo 202606 --forzar` |
| Estado de los datos | `GET /salud/datos` (público) |
| Logs | `railway logs --service etl` |

## Costo esperado

No es una estimación de escritorio: sale de cargar el mes real de julio 2026
(254 MB de CSV, 1 286 246 filas) en un PostgreSQL 16 y medir
(`tests/test_etl_integracion.py::test_tamano_en_postgres`).

### Espacio medido

Julio 2026 estaba parcial (24 días) cuando se midió. Para proyectar los 24 meses
se usa el peso de los ZIP de la ventana contra el de julio: 949 MB / 35.6 MB =
**26.6 meses-julio equivalentes**. Las dimensiones se suman una sola vez porque
no crecen mes a mes.

| Escenario | Por mes | 24 meses |
|---|---:|---:|
| **Por defecto** (sin detalle de invitaciones) | 26.2 MB | **0.71 GB** |
| Con `ETL_INVITACIONES_DETALLE=1`, un índice | 135.2 MB | 3.55 GB |
| Lo mismo con los tres índices "obvios" | 154.2 MB | 4.04 GB |

Dimensiones (constantes, no crecen): 28.9 MB.

La diferencia entre la primera y la última fila es toda de diseño: descartar el
detalle de invitaciones conservando su agregado, y no crear los índices que el
agregado vuelve innecesarios. Sobre un volumen de 5 GB, es la diferencia entre
usar el 14 % y el 81 %.

### Tiempo medido de una corrida del ETL

Sobre el mes completo de julio 2026 (254 MB de CSV, 1 286 246 filas):

| Etapa | Segundos |
|---|---:|
| COPY de las 25 tablas | 125.0 |
| Fusión de dimensiones | 4.2 |
| Agregados y descarte del detalle | 7.2 |
| **Total sin descarga** | **136.5** |

Unos 2.3 minutos por corrida más la descarga del ZIP. Al ser un servicio cron,
Railway factura solo ese tiempo: entre 1.5 y 3 horas de cómputo al mes.

### Factura estimada — plan Hobby

| Concepto | Dimensionamiento | USD/mes |
|---|---|---:|
| Suscripción Hobby (incluye $5 de uso) | — | 5.00 |
| Postgres: RAM ~0.5 GB | 0.5 × $10 | 5.00 |
| Postgres: vCPU | ~0.03 × $20 | 0.60 |
| Volumen | 5 GB aprovisionados × $0.15 | 0.75 |
| API: RAM ~0.35 GB + vCPU ~0.02 | | 3.90 |
| ETL: 2.3 min medidos por corrida | ~1.5–3 h/mes | 0.10 |
| Egress | ver abajo | ~0.05 |
| **Uso total** | | **≈ 10.4** |
| **Factura** = $5 + max(0, uso − $5) | | **≈ $10–11 /mes** |

### Por qué el egress es despreciable

Tamaño real de las respuestas del dashboard, comprimidas:

| Endpoint | Bytes |
|---|---:|
| `/v1/dashboard/resumen` | 224 |
| `/v1/dashboard/serie` | 128 |
| `/v1/dashboard/top-instituciones?limite=10` | 551 |
| `/v1/dashboard/categorias?limite=20` | 838 |

Una sesión completa de dashboard mueve unos 8 KB. Diez mil sesiones al mes son
80 MB, es decir **menos de un centavo**. Antes, cada usuario descargaba un ZIP de
37 MB: diez mil descargas habrían sido 370 GB.

### Si se necesita el detalle de invitaciones

Con `ETL_INVITACIONES_DETALLE=1` la base llega a ~3.55 GB. Cabe en los 5 GB del
plan Hobby, pero al 71 % y creciendo, así que conviene el plan Pro (50 GB de
volumen, $20/mes de suscripción que incluye $20 de uso): la factura queda en
**≈ $21/mes**. El cambio no requiere migrar nada — el volumen se agranda en
caliente y el ETL vuelve a llenar la tabla en la siguiente corrida.

Qué se gana: poder responder *"qué proveedores exactos fueron invitados al
procedimiento X"* para cualquier mes de la ventana. Qué se conserva sin activarlo:
*cuántos* fueron invitados (el agregado siempre se calcula), que es lo que
alimenta los indicadores de competencia del dashboard.

## Qué está verificado y qué no

La CLI de Railway de esta máquina tiene el token vencido, así que **nada de este
documento se probó contra Railway**. Sí se probó todo lo demás:

| Verificado de verdad | Cómo |
|---|---|
| Descarga y salto por ETag contra el blob del Observatorio | peticiones reales; mes actual refrescado hoy 13:04 UTC, mes anterior congelado |
| Carga de las 25 tablas, 1 286 246 filas | PostgreSQL 16 local, 136.5 s |
| Cuadre de agregados contra el detalle | `tests/test_etl_integracion.py` (14 pruebas) |
| Ventana de 24 meses y borrado de particiones viejas | idem |
| API completa: login, perfiles, permisos, ETag 304 | smoke test contra el servicio real con datos cargados |
| Tamaños y tiempos del cálculo de costo | medidos, no estimados |
| Imagen Docker | **NO** — esta máquina no tiene Docker |

Puntos a confirmar en el primer despliegue:

- **`RAILWAY_CONFIG_PATH=railway.etl.json`** es la vía documentada para que el
  servicio `etl` use su propio archivo de configuración. Si el cron no aparece,
  configurá el schedule `0 14 * * *` desde Settings del servicio en el dashboard:
  es equivalente y no depende de esa variable.
- La sintaxis exacta de `railway variables --set` cambió entre versiones de la CLI.
  Corré `railway variables --help` antes de automatizarla en un pipeline.
- El build de la imagen no se pudo probar localmente. Si falla, el primer sospechoso
  es el contexto de build (ver arriba).

## Trampas conocidas

- El cron de Railway **siempre** es UTC, sin importar la zona del proyecto.
- `RAILWAY_TOKEN` (proyecto) y `RAILWAY_API_TOKEN` (cuenta) no son intercambiables;
  confundirlos es la causa más común de desplegar al proyecto equivocado.
- Un volumen se puede agrandar en caliente pero **no** achicar.
- El healthcheck apunta a `/salud/vivo`, que no consulta la base a propósito: si
  dependiera de Postgres, una caída de la base reiniciaría la API en bucle.
- Antes de desplegar: `pip-audit -r requirements.txt` debe salir en 0.
