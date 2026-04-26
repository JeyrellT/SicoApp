# SICOP — descarga, descompresión y lectura

Sistema autónomo para mantener una **copia local actualizada** de los ZIPs mensuales del Observatorio de Compras Públicas de Costa Rica (SICOP), descomprimirlos a CSV y permitir su inspección/lectura desde el mismo sistema.

- Página oficial: https://www.observatoriocomprapublica.go.cr/descargas-sicop/
- URL del lago: `https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion/Zip/yyyymm.zip`

## TL;DR

```bash
# Una vez:
git clone <este-repo>
cd <proyecto>

# Backfill inicial completo (descarga + descompresión + catálogo):
npm run download:all

# Diario (solo el mes en curso, segundos):
npm run download:current

# Ver estado:
npm run summary

# Listar meses extraídos:
npm run inspect

# Programar tarea diaria 08:30:
powershell -ExecutionPolicy Bypass -File scripts\scheduler\install-task.ps1
```

**Cero dependencias npm.** Solo Node.js ≥ 18.17.

## Pipeline completo

```
SICOP Azure Blob          data/raw/                data/extracted/         data/catalog.json
─────────────────         ─────────────            ────────────────        ──────────────────
yyyymm.zip       ──────►  yyyymm.zip      ──────►  yyyymm/*.csv      ────► metadata por mes:
(ETag/Last-Mod)           sha256+manifest          (deflate→raw)            archivos, filas,
                                                                            headers, separador
```

Cada etapa es **idempotente**:

- **Descarga**: solo si el ETag/Last-Modified/Content-Length cambió contra el manifest.
- **Extracción**: solo si el yyyymm no está ya en el catálogo (o `--force`).
- **Lectura**: lee del catálogo + filesystem; no toca la red.

## Comandos

```bash
node scripts/sicop-downloader/index.js <comando> [opciones]
```

| Comando | Qué hace |
|--------|----------|
| `download` (default) | Descarga ZIPs incrementalmente. Con `--extract` también descomprime y cataloga. |
| `extract` | Descomprime ZIPs ya descargados (sin tocar red). |
| `inspect [yyyymm]` | Muestra catálogo: tabla con archivos/filas/MB por mes, o detalle de un yyyymm. |
| `head <ruta-csv>` | Muestra las primeras N filas de un CSV con auto-detección de separador. |
| `summary` | Reporte agregado: meses, archivos, filas, MB. |

Atajos npm:

```bash
npm run download           # download
npm run download:current   # download --current-only --extract  (uso diario)
npm run download:all       # download --from 2010-01 --extract  (backfill)
npm run download:dry       # download --dry-run                 (ensayo)
npm run extract            # extract (todos los ZIPs descargados sin extraer)
npm run extract:current    # extract --current-only
npm run inspect            # inspect (tabla resumida)
npm run summary            # summary (totales)
npm test                   # 77 tests
```

## Ejemplo de salida

```
$ npm run summary
SICOP — estado local
====================
ZIPs descargados:   1
Meses extraídos:    1
Rango extraído:     202401 a 202401
Archivos CSV:       25
Filas totales:      104,287
Tamaño descomprim.: 28.62 MB
```

```
$ node scripts/sicop-downloader/index.js head data/extracted/202401/202401/AdjudicacionesFirme.csv --rows 3
Separador: ';'  Encoding: utf8
Headers (6): NRO_SICOP | NRO_ACTO | FECHA_ADJ_FIRME | PERMITE_RECURSOS | DESIERTO | FECHA_REV

[  1] 20230600173 | 932150 | 2024-01-15 00:00:00.0000000 | Si | N |
[  2] 20230600173 | 931989 | 2024-01-15 00:00:00.0000000 | Si | N |
[  3] 20230301221 | 929052 | 2024-01-03 00:00:00.0000000 | Si | N |
```

## Estructura

```
.
├── scripts/
│   ├── sicop-downloader/
│   │   ├── index.js              # CLI con subcomandos
│   │   ├── lib/
│   │   │   ├── orchestrator.js   # bucle yyyymm + manifest + extract
│   │   │   ├── downloader.js     # HEAD/GET stream + validación ZIP + SHA256
│   │   │   ├── unzip.js          # extracción ZIP streaming (STORED + DEFLATE)
│   │   │   ├── csv.js            # parser CSV streaming (auto-detect separador)
│   │   │   ├── reader.js         # extract+catalog, head, summary
│   │   │   ├── catalog.js        # data/catalog.json con escritura atómica
│   │   │   ├── manifest.js       # data/manifest.json con escritura atómica
│   │   │   ├── dates.js          # enumeración yyyymm
│   │   │   ├── retry.js          # backoff exponencial + jitter
│   │   │   └── logger.js         # consola + archivo
│   │   ├── tests/                # 77 tests con node --test
│   │   └── README.md             # documentación detallada del módulo
│   └── scheduler/                # .bat + .ps1 + install/uninstall task
├── .github/workflows/            # GitHub Action diaria opcional
├── data/                         # gitignored
│   ├── raw/yyyymm.zip            # ZIPs descargados
│   ├── extracted/yyyymm/*.csv    # CSVs extraídos
│   ├── manifest.json             # estado de descarga
│   ├── catalog.json              # estado de extracción + stats por archivo
│   └── logs/                     # logs por día y por comando
└── package.json                  # scripts npm
```

Documentación detallada: [scripts/sicop-downloader/README.md](scripts/sicop-downloader/README.md).

## Tests

```bash
npm test
# 77 tests, 0 fallidos
# Cubre: dates, retry, manifest, downloader, orchestrator, unzip, csv, reader
```

Los tests no usan red real: levantan un servidor HTTP local y construyen ZIPs reales en memoria con DEFLATE/STORED para validar el extractor.

## Programación

| Plataforma | Cómo |
|---|---|
| **Windows Task Scheduler** | `powershell -ExecutionPolicy Bypass -File scripts\scheduler\install-task.ps1` (como Admin) |
| **cron (Linux/macOS)** | `30 8 * * *  cd /ruta && /usr/bin/node scripts/sicop-downloader/index.js --current-only --extract` |
| **GitHub Actions** | Ya incluido en `.github/workflows/sicop-download.yml` (cron 09:00 CR) |

## Licencia

Privada. Ver `LICENSE`.
