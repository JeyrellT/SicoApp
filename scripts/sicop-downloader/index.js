#!/usr/bin/env node
/**
 * CLI del sistema SICOP. Subcomandos:
 *
 *   download   (default)     Descarga ZIPs incrementalmente
 *   extract                  Extrae ZIPs ya descargados
 *   inspect                  Lista archivos extraídos del catálogo
 *   head <ruta>              Muestra primeras N filas de un CSV
 *   summary                  Reporte agregado del estado local
 *
 * Ejemplos:
 *   node scripts/sicop-downloader/index.js                          # download default
 *   node scripts/sicop-downloader/index.js download --current-only --extract
 *   node scripts/sicop-downloader/index.js extract --from 2024-01 --to 2024-03
 *   node scripts/sicop-downloader/index.js inspect 202401
 *   node scripts/sicop-downloader/index.js head data/extracted/202401/SICOP_compras.csv --rows 5
 *   node scripts/sicop-downloader/index.js summary
 */

import { resolve, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { stat } from 'node:fs/promises';

import { createLogger } from './lib/logger.js';
import {
  DEFAULT_BASE_URL,
  resolveTargets,
  run,
} from './lib/orchestrator.js';
import { currentYearMonth } from './lib/dates.js';
import { extractAndCatalog, listExtracted, head as readHead, summary as readSummary } from './lib/reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const COMMANDS = ['download', 'extract', 'inspect', 'head', 'summary'];

const HELP = `
sicop-downloader — sistema de descarga + descompresión + lectura de SICOP.

USO
  node scripts/sicop-downloader/index.js <comando> [opciones]
  node scripts/sicop-downloader/index.js [opciones]                 # alias a 'download'

COMANDOS
  download       Descarga ZIPs incrementalmente (idempotente)
  extract        Extrae ZIPs ya descargados a CSV (no descarga)
  inspect        Lista archivos del catálogo (un yyyymm o todos)
  head <ruta>    Muestra primeras N filas de un CSV
  summary        Reporte agregado del estado local

OPCIONES COMUNES
  --from <yyyy-mm>          Mes inicial (default: 2010-01).
  --to <yyyy-mm>            Mes final (default: mes actual).
  --current-only            Solo el mes actual.
  --out <ruta>              Carpeta destino ZIPs (default: ./data/raw).
  --extracted-dir <ruta>    Carpeta destino CSVs (default: ./data/extracted).
  --manifest <ruta>         Archivo manifest (default: ./data/manifest.json).
  --catalog <ruta>          Archivo catálogo (default: ./data/catalog.json).
  --base-url <url>          URL base (default: ${DEFAULT_BASE_URL}).
  --quiet                   Suprime salida en consola.
  --verbose                 Muestra debug.
  --log <ruta>              Archivo de log (default: ./data/logs/<comando>-YYYY-MM-DD.log).

OPCIONES DE 'download'
  --force                   Re-descarga aunque el manifest diga que está al día.
  --dry-run                 No descarga; solo reporta qué haría.
  --extract                 Tras descargar (o si el ZIP ya está y falta extraer), extrae a CSV.
  --skip-stats              No cuenta filas tras extraer (más rápido).
  --encoding <enc>          Encoding de los CSVs ('utf8' | 'latin1', default 'utf8').
  --request-timeout <ms>    Timeout HEAD (default: 30000).
  --download-timeout <ms>   Timeout GET (default: 600000).

OPCIONES DE 'extract'
  --from / --to / --current-only / --skip-stats / --encoding   (igual que arriba)
  --force                   Re-extrae aunque el catálogo ya tenga el mes.

OPCIONES DE 'head'
  head <ruta-al-csv>
  --rows <n>                Filas a mostrar (default: 10).
  --encoding <enc>          'utf8' | 'latin1' (default: 'utf8').

OPCIONES DE 'inspect'
  inspect [yyyymm]          yyyymm opcional; si se omite, lista todos.

CÓDIGOS DE SALIDA
  0  todo OK     1  arg inválido     2  algo falló     3  error inesperado
`;

function parseArgs(argv) {
  const args = {
    command: 'download',
    positional: [],
    from: null,
    to: null,
    currentOnly: false,
    outDir: null,
    extractedDir: null,
    manifestPath: null,
    catalogPath: null,
    baseUrl: DEFAULT_BASE_URL,
    force: false,
    dryRun: false,
    extract: false,
    skipStats: false,
    encoding: 'utf8',
    quiet: false,
    verbose: false,
    logPath: null,
    rows: 10,
    requestTimeoutMs: 30000,
    downloadTimeoutMs: 600000,
    help: false,
  };

  // Detectar comando si el primer arg no empieza con --
  const list = [...argv];
  if (list.length > 0 && !list[0].startsWith('-') && COMMANDS.includes(list[0])) {
    args.command = list.shift();
  }

  const it = list[Symbol.iterator]();
  for (const arg of it) {
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--from': args.from = it.next().value; break;
      case '--to': args.to = it.next().value; break;
      case '--current-only': args.currentOnly = true; break;
      case '--out': args.outDir = it.next().value; break;
      case '--extracted-dir': args.extractedDir = it.next().value; break;
      case '--manifest': args.manifestPath = it.next().value; break;
      case '--catalog': args.catalogPath = it.next().value; break;
      case '--base-url': args.baseUrl = it.next().value; break;
      case '--force': args.force = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '--extract': args.extract = true; break;
      case '--skip-stats': args.skipStats = true; break;
      case '--encoding': args.encoding = it.next().value; break;
      case '--quiet': args.quiet = true; break;
      case '--verbose': args.verbose = true; break;
      case '--log': args.logPath = it.next().value; break;
      case '--rows': args.rows = Number(it.next().value); break;
      case '--request-timeout': args.requestTimeoutMs = Number(it.next().value); break;
      case '--download-timeout': args.downloadTimeoutMs = Number(it.next().value); break;
      default:
        if (arg.startsWith('-')) throw new Error(`Argumento desconocido: ${arg}`);
        args.positional.push(arg);
    }
  }
  return args;
}

function resolveDefaults(args) {
  return {
    outDir: args.outDir ?? join(PROJECT_ROOT, 'data', 'raw'),
    extractedDir: args.extractedDir ?? join(PROJECT_ROOT, 'data', 'extracted'),
    manifestPath: args.manifestPath ?? join(PROJECT_ROOT, 'data', 'manifest.json'),
    catalogPath: args.catalogPath ?? join(PROJECT_ROOT, 'data', 'catalog.json'),
    logPath: args.logPath ?? join(
      PROJECT_ROOT, 'data', 'logs',
      `${args.command}-${new Date().toISOString().slice(0, 10)}.log`,
    ),
  };
}

function makeLogger(args, logPath) {
  return createLogger({
    level: args.verbose ? 'debug' : 'info',
    quiet: args.quiet,
    filePath: logPath,
  });
}

async function cmdDownload(args, paths, logger) {
  const from = args.from ?? '2010-01';
  const to = args.to ?? currentYearMonth();
  let targets;
  try {
    targets = resolveTargets({ from, to, currentOnly: args.currentOnly });
  } catch (err) {
    logger.error('rango inválido', { err: String(err) });
    return 1;
  }

  logger.info('inicio download', {
    from: args.currentOnly ? currentYearMonth() : from,
    to: args.currentOnly ? currentYearMonth() : to,
    count: targets.length,
    extract: args.extract,
  });

  const result = await run({
    baseUrl: args.baseUrl,
    outDir: paths.outDir,
    manifestPath: paths.manifestPath,
    targets,
    dryRun: args.dryRun,
    force: args.force,
    logger,
    requestTimeoutMs: args.requestTimeoutMs,
    downloadTimeoutMs: args.downloadTimeoutMs,
    extract: args.extract,
    extractedDir: paths.extractedDir,
    catalogPath: paths.catalogPath,
    extractEncoding: args.encoding,
    extractSkipStats: args.skipStats,
  });

  const { summary } = result;
  logger.info('resumen', summary);
  if (!args.quiet) {
    const mb = (summary.bytes_downloaded / (1024 * 1024)).toFixed(2);
    process.stdout.write(
      `\nResumen download: ${summary.downloaded} descargado, ${summary.skipped} sin cambios, ` +
      `${summary.not_published} no publicado, ${summary.failed} fallido — ${mb} MB\n` +
      (args.extract
        ? `Extracción: ${summary.extracted} extraído, ${summary.extract_failed} fallido\n`
        : '') +
      `Manifest: ${paths.manifestPath}\n` +
      (args.extract ? `Catálogo: ${paths.catalogPath}\n` : '') +
      `Log: ${paths.logPath}\n`,
    );
  }
  return summary.failed > 0 || summary.extract_failed > 0 ? 2 : 0;
}

async function cmdExtract(args, paths, logger) {
  const from = args.from ?? '2010-01';
  const to = args.to ?? currentYearMonth();
  let targets;
  try {
    targets = resolveTargets({ from, to, currentOnly: args.currentOnly });
  } catch (err) {
    logger.error('rango inválido', { err: String(err) });
    return 1;
  }

  // Necesitamos el manifest para conocer el sha256 (informativo) y validar que el ZIP existe.
  const { readManifest } = await import('./lib/manifest.js');
  const manifest = await readManifest(paths.manifestPath);
  const { readCatalog } = await import('./lib/catalog.js');
  const catalog = await readCatalog(paths.catalogPath);

  let ok = 0, skipped = 0, failed = 0, missing = 0;
  for (const yyyymm of targets) {
    const zipEntry = manifest.files[yyyymm];
    const zipPath = zipEntry?.local_path ?? join(paths.outDir, `${yyyymm}.zip`);
    try {
      await stat(zipPath);
    } catch {
      logger.warn('zip ausente', { yyyymm, zipPath });
      missing++;
      continue;
    }
    if (catalog.extracted[yyyymm] && !args.force) {
      logger.info('skip (ya en catálogo)', { yyyymm });
      skipped++;
      continue;
    }
    try {
      await extractAndCatalog({
        zipPath,
        yyyymm,
        outDir: join(paths.extractedDir, yyyymm),
        catalogPath: paths.catalogPath,
        sourceSha256: zipEntry?.sha256 ?? null,
        encoding: args.encoding,
        skipStats: args.skipStats,
        logger,
      });
      ok++;
    } catch (err) {
      logger.error('extracción fallida', { yyyymm, err: String(err) });
      failed++;
    }
  }

  if (!args.quiet) {
    process.stdout.write(
      `\nResumen extract: ${ok} extraído, ${skipped} ya en catálogo, ` +
      `${missing} sin ZIP, ${failed} fallido\n` +
      `Catálogo: ${paths.catalogPath}\n` +
      `Log: ${paths.logPath}\n`,
    );
  }
  return failed > 0 ? 2 : 0;
}

async function cmdInspect(args, paths, logger) {
  const yyyymm = args.positional[0] ?? null;
  const data = await listExtracted(paths.catalogPath, yyyymm);
  if (!data) {
    process.stdout.write(`No hay registro en catálogo${yyyymm ? ` para ${yyyymm}` : ''}.\n`);
    return 0;
  }
  if (yyyymm) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return 0;
  }
  // Resumen tabular de todos los meses
  const months = Object.keys(data).sort();
  if (months.length === 0) {
    process.stdout.write('Catálogo vacío. Corré primero "download --extract" o "extract".\n');
    return 0;
  }
  process.stdout.write(`yyyymm   archivos   filas       MB\n`);
  process.stdout.write(`-------  ---------  ----------  --------\n`);
  for (const ym of months) {
    const e = data[ym];
    const mb = (e.total_bytes / (1024 * 1024)).toFixed(2).padStart(8);
    process.stdout.write(
      `${ym.padEnd(7)}  ${String(e.files.length).padStart(9)}  ${String(e.total_rows ?? 0).padStart(10)}  ${mb}\n`,
    );
  }
  return 0;
}

async function cmdHead(args, paths, logger) {
  const csvArg = args.positional[0];
  if (!csvArg) {
    process.stderr.write('Falta ruta del CSV. Uso: head <ruta>\n');
    return 1;
  }
  const csvPath = isAbsolute(csvArg) ? csvArg : resolve(process.cwd(), csvArg);
  try {
    const result = await readHead({ csvPath, rows: args.rows, encoding: args.encoding });
    process.stdout.write(`Separador: '${result.separator}'  Encoding: ${result.encoding}\n`);
    process.stdout.write(`Headers (${result.headers.length}): ${result.headers.join(' | ')}\n\n`);
    for (const [i, row] of result.rows.entries()) {
      process.stdout.write(`[${String(i + 1).padStart(3)}] ${row.join(' | ')}\n`);
    }
    return 0;
  } catch (err) {
    process.stderr.write(`Error leyendo ${csvPath}: ${err.message}\n`);
    return 2;
  }
}

async function cmdSummary(args, paths, logger) {
  const data = await readSummary(paths.catalogPath, paths.manifestPath);
  process.stdout.write(`SICOP — estado local\n`);
  process.stdout.write(`====================\n`);
  if (data.manifest) {
    process.stdout.write(`ZIPs descargados:   ${data.manifest.total_zips}\n`);
  }
  process.stdout.write(`Meses extraídos:    ${data.months_count}\n`);
  if (data.months_range) {
    process.stdout.write(`Rango extraído:     ${data.months_range[0]} a ${data.months_range[1]}\n`);
  }
  process.stdout.write(`Archivos CSV:       ${data.files_count}\n`);
  process.stdout.write(`Filas totales:      ${data.total_rows.toLocaleString()}\n`);
  process.stdout.write(`Tamaño descomprim.: ${(data.total_bytes / (1024 * 1024)).toFixed(2)} MB\n`);
  return 0;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n${HELP}\n`);
    process.exit(1);
  }
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const paths = resolveDefaults(args);
  const logger = makeLogger(args, paths.logPath);

  try {
    switch (args.command) {
      case 'download': return await cmdDownload(args, paths, logger);
      case 'extract':  return await cmdExtract(args, paths, logger);
      case 'inspect':  return await cmdInspect(args, paths, logger);
      case 'head':     return await cmdHead(args, paths, logger);
      case 'summary':  return await cmdSummary(args, paths, logger);
      default:
        process.stderr.write(`Comando desconocido: ${args.command}\n${HELP}\n`);
        return 1;
    }
  } catch (err) {
    logger.error('error inesperado', { err: String(err), stack: err?.stack });
    return 3;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`fatal: ${err.stack ?? err}\n`);
    process.exit(3);
  });
