/**
 * Orquestador: para cada yyyymm en el rango decide si descargar y delega al downloader.
 * Mantiene el manifest actualizado tras cada archivo (no espera al final).
 */

import { join, resolve } from 'node:path';

import { enumerateYearMonths, currentYearMonth, parseYearMonth, formatYearMonth } from './dates.js';
import { readManifest, writeManifest, makeEntry, shouldDownload } from './manifest.js';
import { fetchMetadata, downloadToFile } from './downloader.js';
import { withRetry } from './retry.js';
import { extractAndCatalog } from './reader.js';
import { readCatalog } from './catalog.js';

export const DEFAULT_BASE_URL =
  'https://dlsaobservatorioprod.blob.core.windows.net/fs-synapse-observatorio-produccion/Zip';

/**
 * Construye la URL del ZIP para un yyyymm dado.
 */
export function buildUrl(baseUrl, yyyymm) {
  return `${baseUrl.replace(/\/+$/, '')}/${yyyymm}.zip`;
}

/**
 * Resuelve los yyyymm a procesar según las opciones.
 */
export function resolveTargets({ from, to, currentOnly }) {
  if (currentOnly) {
    return [currentYearMonth()];
  }
  const fromYm = parseYearMonth(from);
  const toYm = parseYearMonth(to);
  return enumerateYearMonths(fromYm, toYm);
}

/**
 * Procesa todos los yyyymm. Reporta resultado por archivo.
 *
 * @param {object} cfg
 * @param {string} cfg.baseUrl
 * @param {string} cfg.outDir            - directorio donde se guardan los .zip
 * @param {string} cfg.manifestPath
 * @param {string[]} cfg.targets         - lista de yyyymm
 * @param {boolean} cfg.dryRun
 * @param {boolean} cfg.force
 * @param {object} cfg.logger
 * @param {number} [cfg.requestTimeoutMs]
 * @param {number} [cfg.downloadTimeoutMs]
 * @returns {Promise<{summary: object, results: Array}>}
 */
export async function run(cfg) {
  const {
    baseUrl,
    outDir,
    manifestPath,
    targets,
    dryRun,
    force,
    logger,
    requestTimeoutMs = 30000,
    downloadTimeoutMs = 600000,
    extract = false,
    extractedDir = null,
    catalogPath = null,
    extractEncoding = 'utf8',
    extractSkipStats = false,
  } = cfg;

  const manifest = await readManifest(manifestPath, baseUrl);
  manifest.source = baseUrl;

  // Catálogo (solo cuando --extract activo) para detectar ZIPs en disco aún no extraídos.
  let catalogSnapshot = null;
  if (extract && catalogPath) {
    catalogSnapshot = await readCatalog(catalogPath);
  }

  const currentYm = currentYearMonth();
  const results = [];
  const summary = {
    total: targets.length,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    not_published: 0,
    extracted: 0,
    extract_failed: 0,
    bytes_downloaded: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
  };

  for (const yyyymm of targets) {
    const url = buildUrl(baseUrl, yyyymm);
    const localPath = resolve(outDir, `${yyyymm}.zip`);
    const isCurrentMonth = yyyymm === currentYm;
    const entry = manifest.files[yyyymm] ?? null;

    const baseLog = { yyyymm, url };
    logger.info('procesando', baseLog);

    let metadata = null;
    try {
      metadata = await withRetry(
        () => fetchMetadata(url, { timeoutMs: requestTimeoutMs, logger }),
        {
          maxAttempts: 3,
          baseMs: 1000,
          onRetry: ({ attempt, delayMs, err }) => {
            logger.warn('reintentando HEAD', { ...baseLog, attempt, delayMs, err: String(err) });
          },
        },
      );
    } catch (err) {
      const status = err?.statusCode;
      // 404: no publicado todavía (o nunca). No es error fatal: lo registramos y seguimos.
      if (status === 404) {
        logger.info('no publicado', { ...baseLog });
        summary.not_published++;
        results.push({ yyyymm, status: 'not_published', url });
        continue;
      }
      logger.error('falló HEAD', { ...baseLog, err: String(err) });
      summary.failed++;
      results.push({ yyyymm, status: 'error', url, error: String(err) });
      continue;
    }

    const decision = await shouldDownload({
      entry,
      headers: metadata,
      isCurrentMonth,
      force,
      localPath,
    });

    if (!decision.download) {
      logger.info('skip', { ...baseLog, reason: decision.reason });
      summary.skipped++;

      // Caso: ZIP en disco pero aún no extraído (catálogo no lo conoce).
      // Si --extract está activo, extraemos ahora aunque hayamos saltado el download.
      let extractInfo = null;
      if (extract && extractedDir && catalogPath && !dryRun) {
        const alreadyExtracted = catalogSnapshot?.extracted?.[yyyymm];
        if (!alreadyExtracted) {
          const ymOutDir = resolve(extractedDir, yyyymm);
          try {
            extractInfo = await extractAndCatalog({
              zipPath: localPath,
              yyyymm,
              outDir: ymOutDir,
              catalogPath,
              sourceSha256: entry?.sha256 ?? null,
              encoding: extractEncoding,
              skipStats: extractSkipStats,
              logger,
            });
            summary.extracted++;
            // Refrescar snapshot para iteraciones siguientes en este mismo run
            catalogSnapshot = await readCatalog(catalogPath);
          } catch (err) {
            logger.error('extracción fallida (skip-branch)', { ...baseLog, err: String(err) });
            summary.extract_failed++;
            extractInfo = { error: String(err) };
          }
        }
      }

      results.push({ yyyymm, status: 'skipped', reason: decision.reason, extract: extractInfo });
      continue;
    }

    if (dryRun) {
      logger.info('[dry-run] descargaría', { ...baseLog, reason: decision.reason });
      summary.downloaded++;
      results.push({ yyyymm, status: 'would_download', reason: decision.reason });
      continue;
    }

    try {
      const dl = await withRetry(
        () => downloadToFile(url, localPath, { timeoutMs: downloadTimeoutMs, logger }),
        {
          maxAttempts: 3,
          baseMs: 2000,
          onRetry: ({ attempt, delayMs, err }) => {
            logger.warn('reintentando GET', { ...baseLog, attempt, delayMs, err: String(err) });
          },
        },
      );

      manifest.files[yyyymm] = makeEntry({
        yyyymm,
        url,
        etag: dl.etag,
        lastModified: dl.lastModified,
        contentLength: dl.contentLength,
        sha256: dl.sha256,
        localPath,
        isCurrentMonth,
        previousEntry: entry,
      });
      // Persistimos manifest inmediatamente para no perder estado si algo falla más tarde
      await writeManifest(manifestPath, manifest);

      summary.downloaded++;
      summary.bytes_downloaded += dl.bytes;
      logger.info('descargado', {
        ...baseLog,
        bytes: dl.bytes,
        sha256_prefix: dl.sha256?.slice(0, 12),
        reason: decision.reason,
      });

      let extractInfo = null;
      if (extract && extractedDir && catalogPath) {
        const ymOutDir = resolve(extractedDir, yyyymm);
        try {
          extractInfo = await extractAndCatalog({
            zipPath: localPath,
            yyyymm,
            outDir: ymOutDir,
            catalogPath,
            sourceSha256: dl.sha256,
            encoding: extractEncoding,
            skipStats: extractSkipStats,
            logger,
          });
          summary.extracted++;
        } catch (err) {
          logger.error('extracción fallida', { ...baseLog, err: String(err) });
          summary.extract_failed++;
          extractInfo = { error: String(err) };
        }
      }

      results.push({
        yyyymm,
        status: 'downloaded',
        bytes: dl.bytes,
        sha256: dl.sha256,
        reason: decision.reason,
        extract: extractInfo,
      });
    } catch (err) {
      logger.error('descarga fallida', { ...baseLog, err: String(err) });
      summary.failed++;
      results.push({ yyyymm, status: 'error', url, error: String(err) });
    }
  }

  summary.finished_at = new Date().toISOString();
  // Asegurar último flush del manifest
  await writeManifest(manifestPath, manifest);
  return { summary, results };
}

/**
 * Helper de display: convierte yyyymm a "yyyy-mm" para humanos.
 */
export function prettyYearMonth(yyyymm) {
  return `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}`;
}

export { formatYearMonth };
