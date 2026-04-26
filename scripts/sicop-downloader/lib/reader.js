/**
 * Capa "lectura" del sistema: combina extracción + catálogo + preview de CSVs.
 * Es el "el mismo sistema lo lea" del prompt del usuario.
 */

import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';

import { extractZip } from './unzip.js';
import { previewCsv, countRows, summarizeCsv } from './csv.js';
import { readCatalog, writeCatalog, makeCatalogEntry } from './catalog.js';
import { readManifest } from './manifest.js';

/**
 * Extrae un ZIP, computa estadísticas por archivo, y actualiza el catálogo.
 *
 * @param {object} cfg
 * @param {string} cfg.zipPath
 * @param {string} cfg.yyyymm
 * @param {string} cfg.outDir            - directorio donde se extrae (ej. data/extracted/yyyymm)
 * @param {string} cfg.catalogPath
 * @param {string|null} [cfg.sourceSha256]
 * @param {string} [cfg.encoding='utf8']
 * @param {boolean} [cfg.skipStats=false] - si true, no cuenta filas (más rápido)
 * @param {object} cfg.logger
 */
export async function extractAndCatalog({
  zipPath,
  yyyymm,
  outDir,
  catalogPath,
  sourceSha256 = null,
  encoding = 'utf8',
  skipStats = false,
  logger,
}) {
  await mkdir(outDir, { recursive: true });

  logger.info('extrayendo', { zipPath, outDir });
  const result = await extractZip(zipPath, outDir, {
    onEntry: ({ filename, index, total }) => {
      logger.debug('  entry', { filename, index, total });
    },
  });

  const fileSummaries = [];
  for (const filePath of result.files) {
    const name = basename(filePath);
    if (!/\.csv$/i.test(name)) {
      // Para archivos no-CSV solo guardamos size
      const st = await stat(filePath);
      fileSummaries.push({ name, path: relative(outDir, filePath), bytes: st.size, rows: null, headers_count: null });
      continue;
    }
    if (skipStats) {
      const st = await stat(filePath);
      fileSummaries.push({ name, path: relative(outDir, filePath), bytes: st.size, rows: null, headers_count: null });
      continue;
    }
    try {
      const summary = await summarizeCsv(filePath, { encoding });
      fileSummaries.push({
        name,
        path: relative(outDir, filePath),
        bytes: summary.bytes,
        rows: summary.totalRows,
        headers_count: summary.headers.length,
        separator: summary.separator,
      });
    } catch (err) {
      logger.warn('csv stat falló', { file: name, err: String(err) });
      const st = await stat(filePath).catch(() => ({ size: null }));
      fileSummaries.push({ name, path: relative(outDir, filePath), bytes: st.size, rows: null, headers_count: null, error: String(err) });
    }
  }

  const catalog = await readCatalog(catalogPath);
  catalog.extracted[yyyymm] = makeCatalogEntry({
    yyyymm,
    sourceZip: zipPath,
    sourceSha256,
    outDir,
    fileSummaries,
  });
  await writeCatalog(catalogPath, catalog);
  logger.info('extraído', {
    yyyymm,
    files: fileSummaries.length,
    totalRows: catalog.extracted[yyyymm].total_rows,
  });
  return catalog.extracted[yyyymm];
}

/**
 * Lista lo que el catálogo conoce (todos los yyyymm extraídos), o filtra por yyyymm.
 */
export async function listExtracted(catalogPath, yyyymm = null) {
  const catalog = await readCatalog(catalogPath);
  if (yyyymm) {
    return catalog.extracted[yyyymm] ?? null;
  }
  return catalog.extracted;
}

/**
 * Devuelve preview de un CSV (primeras N filas). Wrapper sobre csv.previewCsv pero
 * acepta refs lógicas (yyyymm + nombre de archivo) o paths absolutos.
 */
export async function head({ csvPath, rows = 10, encoding = 'utf8' }) {
  return previewCsv(csvPath, { rows, encoding });
}

/**
 * Listado plano de todos los CSVs disponibles bajo un directorio extraído (recursivo).
 */
export async function findCsvFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.csv$/i.test(e.name)) out.push(full);
    }
  }
  await walk(rootDir);
  return out;
}

/**
 * Reporte agregado: cuántos meses, cuántos archivos, cuántas filas en total.
 */
export async function summary(catalogPath, manifestPath = null) {
  const catalog = await readCatalog(catalogPath);
  const months = Object.keys(catalog.extracted).sort();
  let files = 0;
  let bytes = 0;
  let rows = 0;
  for (const ym of months) {
    const e = catalog.extracted[ym];
    files += e.files.length;
    bytes += e.total_bytes;
    rows += e.total_rows;
  }
  let manifestSummary = null;
  if (manifestPath) {
    try {
      const m = await readManifest(manifestPath);
      manifestSummary = {
        total_zips: Object.keys(m.files).length,
      };
    } catch { /* sin manifest, OK */ }
  }
  return {
    months_count: months.length,
    months_range: months.length ? [months[0], months[months.length - 1]] : null,
    files_count: files,
    total_bytes: bytes,
    total_rows: rows,
    manifest: manifestSummary,
  };
}
