# SICOP Downloader

Pipeline en Node.js puro (cero dependencias) que **descarga**, **descomprime** y **lee** los ZIPs mensuales del Observatorio de Compras Públicas de Costa Rica (SICOP).

> URL base: `https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion/Zip/yyyymm.zip`
>
> Página oficial: https://www.observatoriocomprapublica.go.cr/descargas-sicop/

---

## Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Azure Blob     │───►│  data/raw/*.zip  │───►│  unzip + extract │───►│ data/extracted │
│  (yyyymm.zip)   │    │  manifest.json   │    │  + CRC32 check   │    │ /yyyymm/*.csv  │
└─────────────────┘    └──────────────────┘    └──────────────────┘    └────────────────┘
        │                       ▲                       │                       │
        │                       │                       ▼                       ▼
        │                       │              ┌──────────────────┐    ┌────────────────┐
        └─── HEAD: ETag ───────►│              │  csv.summarize() │───►│  catalog.json  │
             (idempotencia)                    │  (filas, sep,    │    │  (metadata)    │
                                               │   headers)       │    └────────────────┘
                                               └──────────────────┘
```

Tres etapas, todas idempotentes y con escritura atómica de estado.

---

## Decisiones técnicas

### Por qué cero dependencias
- **`fetch`** (Node 18+): HTTP con AbortController para timeout.
- **`node:zlib.createInflateRaw()`**: descompresión DEFLATE.
- **`node:crypto.createHash('sha256')`**: integridad y manifest.
- **`node:fs.promises` + streams**: I/O sin cargar archivos completos en memoria.
- **`node:test`**: framework de tests built-in.

Esto hace el módulo **portable** (cualquier Node ≥ 18.17), **auditable** (sin árbol de deps) y **fácil de mantener** (sin upgrades de paquetes).

### Idempotencia en cada etapa

| Etapa | Estado | Comparación |
|-------|--------|-------------|
| Descarga | `data/manifest.json` | ETag → Last-Modified → Content-Length |
| Extracción | `data/catalog.json` | Presencia de `extracted[yyyymm]` |
| Lectura | (sin estado) | Lee de catálogo + filesystem |

### Validación end-to-end de cada ZIP

1. Stream a `<archivo>.part`, calculando SHA256 al vuelo.
2. Verifica `bytes_recibidos == Content-Length`.
3. Verifica firma EOCD del ZIP (sanity check).
4. Si todo OK: `rename` atómico al destino.
5. Tras descomprimir: verifica CRC32 de cada entry contra el central directory.

Si algo falla en cualquier paso, el `.part` se borra y el manifest no se actualiza. La próxima corrida reintenta limpiamente.

### Path traversal en extracción

`safeJoinExtract()` rechaza:
- Filenames con `..`
- Filenames con drives absolutos (`C:/...`)
- Filenames que tras `resolve()` quedan fuera de `outDir`

Esto evita ZIPs maliciosos que escriban fuera del destino.

---

## Archivos del módulo

```
scripts/sicop-downloader/
├── index.js                 # CLI con subcomandos (download, extract, inspect, head, summary)
├── lib/
│   ├── orchestrator.js      # bucle por yyyymm: HEAD → decide → download → extract → catalog
│   ├── downloader.js        # fetchMetadata, downloadToFile, validateZipFile
│   ├── unzip.js             # extractZip, listZipEntries, safeJoinExtract (sin deps)
│   ├── csv.js               # parseCsvStream, previewCsv, countRows, summarizeCsv
│   ├── reader.js            # extractAndCatalog, listExtracted, head, summary
│   ├── manifest.js          # readManifest, writeManifest, shouldDownload
│   ├── catalog.js           # readCatalog, writeCatalog, makeCatalogEntry
│   ├── dates.js             # parseYearMonth, enumerateYearMonths, currentYearMonth
│   ├── retry.js             # withRetry, isTransient
│   └── logger.js            # createLogger (consola + archivo)
└── tests/                   # 77 tests con node --test
    ├── _zip-fixture.js      # constructor de ZIPs reales en memoria (helper)
    ├── dates.test.js        # 11 tests
    ├── retry.test.js        # 6 tests
    ├── manifest.test.js     # 11 tests
    ├── downloader.test.js   # 7 tests
    ├── orchestrator.test.js # 8 tests
    ├── unzip.test.js        # 11 tests
    ├── csv.test.js          # 17 tests
    └── reader.test.js       # 6 tests
```

---

## Subcomandos

### `download` (default)

Descarga incremental. Con `--extract` también descomprime y cataloga.

```bash
node scripts/sicop-downloader/index.js download [opciones]

# Opciones:
--from <yyyy-mm>      # default: 2010-01
--to <yyyy-mm>        # default: mes actual
--current-only        # solo mes en curso
--extract             # tras descargar, descomprime y cataloga
--skip-stats          # extracción sin contar filas (más rápido)
--encoding <enc>      # 'utf8' (default) | 'latin1'
--force               # re-descarga aunque manifest diga que está al día
--dry-run             # no descarga, solo reporta
```

### `extract`

Descomprime ZIPs ya descargados (sin tocar la red).

```bash
node scripts/sicop-downloader/index.js extract [opciones]
# --from / --to / --current-only / --force / --skip-stats / --encoding
```

Útil cuando ya descargaste todo pero querés re-extraer (ej: `--force`) o extraer un mes que se descargó sin `--extract`.

### `inspect [yyyymm]`

Lista el catálogo. Sin argumento muestra tabla de todos los meses; con `yyyymm` muestra el JSON detallado de ese mes.

```bash
$ node scripts/sicop-downloader/index.js inspect
yyyymm   archivos   filas       MB
-------  ---------  ----------  --------
202401          25      104287     28.62
202402          25       98712     27.10
```

### `head <ruta-csv> [--rows N] [--encoding enc]`

Preview de un CSV con detección automática de separador (`,` `;` `\t` `|`).

```bash
$ node scripts/sicop-downloader/index.js head data/extracted/202401/202401/Contratos.csv --rows 2
Separador: ';'  Encoding: utf8
Headers (12): NRO_CONTRATO | FECHA | MONTO | INSTITUCION | ...

[  1] 2024CT001 | 2024-01-15 | 1500000 | CCSS | ...
[  2] 2024CT002 | 2024-01-16 | 230000  | MEP  | ...
```

### `summary`

Reporte agregado del estado local.

```bash
$ node scripts/sicop-downloader/index.js summary
SICOP — estado local
====================
ZIPs descargados:   16
Meses extraídos:    16
Rango extraído:     202401 a 202504
Archivos CSV:       400
Filas totales:      2,134,567
Tamaño descomprim.: 487.21 MB
```

---

## Catálogo (`data/catalog.json`)

```json
{
  "schema_version": 1,
  "updated_at": "2026-04-25T14:00:00.000Z",
  "extracted": {
    "202401": {
      "extracted_at": "2026-04-25T14:00:01.234Z",
      "source_zip": "/.../data/raw/202401.zip",
      "source_sha256": "9f8e7d6c...",
      "out_dir": "/.../data/extracted/202401",
      "files": [
        {
          "name": "Contratos.csv",
          "path": "202401/Contratos.csv",
          "bytes": 540275,
          "rows": 1234,
          "headers_count": 12,
          "separator": ";"
        }
      ],
      "total_bytes": 30032456,
      "total_rows": 104287
    }
  }
}
```

Permite a otros sistemas (la app React de SICOP, scripts de análisis, etc.) saber sin abrir cada CSV qué hay disponible y cuán grande es.

---

## Cómo otros sistemas pueden consumir los datos

Una vez ejecutado `npm run download:all`, los CSVs quedan en `data/extracted/yyyymm/<n>/Archivo.csv`. Cualquier sistema (Python pandas, Power BI, R, la app React de SICOP via fetch, etc.) puede leer directo del filesystem.

Desde Node, lectura programática:

```js
import { listExtracted, head, summary } from './scripts/sicop-downloader/lib/reader.js';
import { parseCsvStream } from './scripts/sicop-downloader/lib/csv.js';
import { createReadStream } from 'node:fs';

// Listar qué hay disponible
const all = await listExtracted('data/catalog.json');

// Preview rápido
const preview = await head({ csvPath: 'data/extracted/202401/202401/Contratos.csv', rows: 5 });

// Iterar streaming sobre todo un CSV (constante en memoria)
for await (const row of parseCsvStream(createReadStream('data/extracted/202401/202401/Contratos.csv'))) {
  // row es string[]; primera iteración = headers
  procesar(row);
}
```

---

## Programación

### Windows Task Scheduler

```powershell
# Como Administrador, una sola vez:
.\scripts\scheduler\install-task.ps1 -Time '08:30'
```

Crea la tarea **SICOP-Daily-Download** que ejecuta diariamente `sicop-daily.bat` con `--current-only --extract`.

### cron

```cron
30 8 * * *  cd /ruta && /usr/bin/node scripts/sicop-downloader/index.js --current-only --extract >> data/logs/cron.log 2>&1
```

### GitHub Actions

Workflow `.github/workflows/sicop-download.yml` corre diariamente a las 09:00 CR. Permite tres modos vía dispatch manual:
- `current-only` (default)
- `full-backfill`
- `custom` con `from`/`to`

Sube todo (`raw/`, `extracted/`, `manifest.json`, `catalog.json`, `logs/`) como artifact retenido 7 días.

---

## Códigos de salida

| Código | Significado |
|--------|-------------|
| 0 | Todo OK |
| 1 | Argumento de CLI inválido |
| 2 | Al menos una descarga o extracción falló |
| 3 | Error inesperado (excepción no controlada) |

---

## Tests (77 verde)

```bash
npm test
```

Cubre:
- **dates** (11): parseo, enumeración, comparación, mes actual.
- **retry** (6): clasificación transitorio vs permanente, backoff, agotamiento.
- **manifest** (11): round-trip, schema version, decisión de descarga.
- **downloader** (7): fetchMetadata real, downloadToFile, validación ZIP, truncamiento, no-zip.
- **orchestrator** (8): buildUrl, run E2E, --force, 404, dry-run.
- **unzip** (11): STORED + DEFLATE, archivos vacíos, listZipEntries, path traversal, CRC corrupto.
- **csv** (17): parser de líneas, escape "", separador auto, BOM, multi-línea quoted, preview, count, summarize.
- **reader** (6): extractAndCatalog, listExtracted, head, findCsvFiles, summary.

Todos los tests usan **datos reales construidos en memoria** (un servidor HTTP local + un fixture que arma ZIPs DEFLATE/STORED válidos con CRC32 correcto). Sin red real.

---

## Limitaciones conocidas

- **No soporta ZIP64** (archivos individuales > 4 GB). Los ZIPs SICOP son ~5-60 MB; muy lejos del límite.
- **No soporta encriptación de ZIP** ni métodos distintos a STORED/DEFLATE.
- **No paraleliza descargas** (intencional: evita rate-limit y mantiene logs lineales).
- **Conteo de filas en CSVs gigantes** es streaming pero hace pasada completa (O(N) tiempo, O(1) memoria). Use `--skip-stats` si solo querés extraer rápido.
- **Multi-línea quoted CSV** se soporta básicamente, pero CSVs que mezclan separadores entre filas no se manejan.
- **No hay locking entre instancias**: no lances dos corridas en paralelo sobre el mismo `data/`.
- **Encoding**: por defecto utf8. Si un CSV viene en latin1/cp1252, pasá `--encoding latin1` (los CSVs de SICOP que probé son utf8).

---

## Troubleshooting

| Síntoma | Causa probable | Acción |
|--------|----------------|--------|
| `HTTP 404` para mes X | Ese mes no existe (futuro o muy antiguo) | Es OK, se reporta como `not_published` y sigue |
| `HTTP 403` | Endpoint del blob cambió | Verificá la URL en la página oficial y pasá `--base-url` |
| `Tamaño ≠ Content-Length` | Conexión cortada a mitad | El `.part` se limpió. La próxima corrida reintenta |
| `CRC32 inválido` | ZIP corrupto en origen | Borrá el `.zip` y `--force` para re-descargar |
| `MaxListenersExceeded` | (resuelto en v1.1) | Si ves esto, actualizá; el extractor sube setMaxListeners proporcionalmente |
| `Headers (0)` en `head` | Archivo de 0 bytes en origen | Algunos meses traen CSVs vacíos para tablas sin movimiento |
