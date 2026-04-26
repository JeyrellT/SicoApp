/**
 * Manifest de estado local. JSON en disco con escritura atómica.
 *
 * Schema:
 * {
 *   "schema_version": 1,
 *   "source": "https://dlsaobservatorioprod.blob.core.windows.net/...",
 *   "updated_at": "ISO date",
 *   "files": {
 *     "201001": {
 *       "url": "...",
 *       "downloaded_at": "ISO",
 *       "etag": "...",
 *       "last_modified": "...",
 *       "content_length": 12345,
 *       "sha256": "...",
 *       "is_current_month_at_dl": false,
 *       "download_count": 1,
 *       "local_path": "data/raw/201001.zip"
 *     }
 *   }
 * }
 */

import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

export const SCHEMA_VERSION = 1;

export function emptyManifest(source = '') {
  return {
    schema_version: SCHEMA_VERSION,
    source,
    updated_at: new Date().toISOString(),
    files: {},
  };
}

/**
 * Lee el manifest desde disco. Retorna manifest vacío si no existe.
 * Si existe pero es inválido o de versión incompatible, lanza.
 */
export async function readManifest(filePath, sourceUrl = '') {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Manifest no es un objeto JSON');
    }
    if (parsed.schema_version !== SCHEMA_VERSION) {
      throw new Error(
        `Manifest schema_version=${parsed.schema_version} incompatible (esperado ${SCHEMA_VERSION}). ` +
        `Migre o elimine ${filePath}.`,
      );
    }
    if (!parsed.files || typeof parsed.files !== 'object') {
      parsed.files = {};
    }
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return emptyManifest(sourceUrl);
    }
    throw err;
  }
}

/**
 * Escribe el manifest atómicamente: escribe a un .tmp y luego rename.
 */
export async function writeManifest(filePath, manifest) {
  manifest.updated_at = new Date().toISOString();
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
  const content = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, filePath);
}

/**
 * Construye la entrada del manifest para un archivo.
 */
export function makeEntry({
  yyyymm,
  url,
  etag,
  lastModified,
  contentLength,
  sha256,
  localPath,
  isCurrentMonth,
  previousEntry = null,
}) {
  const now = new Date().toISOString();
  return {
    url,
    downloaded_at: now,
    etag: etag ?? null,
    last_modified: lastModified ?? null,
    content_length: contentLength ?? null,
    sha256: sha256 ?? null,
    is_current_month_at_dl: Boolean(isCurrentMonth),
    download_count: (previousEntry?.download_count ?? 0) + 1,
    local_path: localPath,
  };
}

/**
 * Decide si un archivo debe descargarse comparando headers actuales vs manifest.
 *
 * Reglas:
 * - Si no hay entrada → descargar.
 * - Si force=true → descargar.
 * - Si el archivo local no existe → descargar.
 * - Si es mes actual: comparar ETag → Last-Modified → Content-Length. Cualquier cambio = descargar.
 * - Si es mes pasado y entrada existe: NO descargar (los meses cerrados no cambian).
 */
export async function shouldDownload({
  entry,
  headers,
  isCurrentMonth,
  force,
  localPath,
}) {
  if (force) return { download: true, reason: 'force' };
  if (!entry) return { download: true, reason: 'no-entry' };

  // Verifica que el archivo realmente existe en disco
  try {
    const st = await stat(localPath);
    if (!st.isFile() || st.size === 0) {
      return { download: true, reason: 'local-missing-or-empty' };
    }
  } catch {
    return { download: true, reason: 'local-missing' };
  }

  if (!isCurrentMonth) {
    return { download: false, reason: 'past-month-cached' };
  }

  // Mes actual: comparar headers
  if (headers.etag && entry.etag && headers.etag !== entry.etag) {
    return { download: true, reason: 'etag-changed' };
  }
  if (headers.lastModified && entry.last_modified && headers.lastModified !== entry.last_modified) {
    return { download: true, reason: 'last-modified-changed' };
  }
  if (
    headers.contentLength != null &&
    entry.content_length != null &&
    headers.contentLength !== entry.content_length
  ) {
    return { download: true, reason: 'content-length-changed' };
  }
  // Si no tenemos headers comparables, conservador: re-descargar para no perder updates diarios
  if (!headers.etag && !headers.lastModified && headers.contentLength == null) {
    return { download: true, reason: 'no-comparable-headers' };
  }
  return { download: false, reason: 'unchanged' };
}
