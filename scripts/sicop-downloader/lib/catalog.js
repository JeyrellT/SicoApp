/**
 * Catálogo de archivos extraídos. Estructura paralela al manifest pero del lado "post-extract".
 *
 * Schema (data/catalog.json):
 * {
 *   "schema_version": 1,
 *   "updated_at": "ISO",
 *   "extracted": {
 *     "201001": {
 *       "extracted_at": "ISO",
 *       "source_zip": "data/raw/201001.zip",
 *       "source_sha256": "...",        // del manifest
 *       "out_dir": "data/extracted/201001",
 *       "files": [
 *         { "name": "compras.csv", "bytes": 12345, "rows": 1234, "headers_count": 18 }
 *       ],
 *       "total_bytes": 67890,
 *       "total_rows": 12345
 *     }
 *   }
 * }
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

export const CATALOG_SCHEMA_VERSION = 1;

export function emptyCatalog() {
  return {
    schema_version: CATALOG_SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
    extracted: {},
  };
}

export async function readCatalog(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.schema_version !== CATALOG_SCHEMA_VERSION) {
      throw new Error(
        `Catalog schema_version=${parsed.schema_version} incompatible (esperado ${CATALOG_SCHEMA_VERSION}).`,
      );
    }
    if (!parsed.extracted) parsed.extracted = {};
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') return emptyCatalog();
    throw err;
  }
}

export async function writeCatalog(filePath, catalog) {
  catalog.updated_at = new Date().toISOString();
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  await rename(tmp, filePath);
}

/**
 * Construye un entry de catálogo desde la lista de archivos extraídos.
 */
export function makeCatalogEntry({ yyyymm, sourceZip, sourceSha256, outDir, fileSummaries }) {
  const totalBytes = fileSummaries.reduce((s, f) => s + (f.bytes ?? 0), 0);
  const totalRows = fileSummaries.reduce((s, f) => s + (f.rows ?? 0), 0);
  return {
    extracted_at: new Date().toISOString(),
    source_zip: sourceZip,
    source_sha256: sourceSha256 ?? null,
    out_dir: outDir,
    files: fileSummaries,
    total_bytes: totalBytes,
    total_rows: totalRows,
  };
}
