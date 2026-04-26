/**
 * Núcleo de descarga: HEAD para metadatos, GET en stream con SHA256, validación de ZIP.
 * Usa solo APIs nativas de Node 18+: fetch, streams web→node, fs/promises.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';

import { withRetry } from './retry.js';

const DEFAULT_USER_AGENT = 'sicop-downloader/1.0 (+https://www.observatoriocomprapublica.go.cr)';

export class HttpError extends Error {
  constructor(statusCode, statusText, url) {
    super(`HTTP ${statusCode} ${statusText} ← ${url}`);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.url = url;
  }
}

function buildHeaders(extra = {}) {
  return {
    'User-Agent': DEFAULT_USER_AGENT,
    'Accept': 'application/zip,application/octet-stream,*/*',
    ...extra,
  };
}

function withTimeout(timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`Timeout tras ${timeoutMs} ms`)), timeoutMs);
  return {
    signal: ctrl.signal,
    cancel: () => clearTimeout(timer),
  };
}

/**
 * Hace una petición HEAD y retorna metadatos relevantes.
 * Si el servidor no soporta HEAD (raro en Azure Blob), cae a un GET con Range: bytes=0-0.
 */
export async function fetchMetadata(url, { timeoutMs = 30000, logger } = {}) {
  const doHead = async () => {
    const t = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, { method: 'HEAD', headers: buildHeaders(), signal: t.signal });
      if (!res.ok) throw new HttpError(res.status, res.statusText, url);
      return res;
    } finally {
      t.cancel();
    }
  };

  const doRangeGet = async () => {
    const t = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: buildHeaders({ Range: 'bytes=0-0' }),
        signal: t.signal,
      });
      if (!res.ok && res.status !== 206) throw new HttpError(res.status, res.statusText, url);
      // Drena el body para liberar el socket
      if (res.body) {
        try { await res.body.cancel(); } catch { /* noop */ }
      }
      return res;
    } finally {
      t.cancel();
    }
  };

  let res;
  try {
    res = await withRetry(doHead, { maxAttempts: 3, baseMs: 800 });
  } catch (err) {
    if (err.statusCode === 405 || err.statusCode === 501) {
      logger?.warn('HEAD no soportado, usando GET Range', { url });
      res = await withRetry(doRangeGet, { maxAttempts: 3, baseMs: 800 });
    } else {
      throw err;
    }
  }

  const etag = res.headers.get('etag') ?? null;
  const lastModified = res.headers.get('last-modified') ?? null;
  const contentLengthRaw = res.headers.get('content-length');
  // En Range: bytes=0-0 viene Content-Range con tamaño total; preferirlo si existe.
  const contentRange = res.headers.get('content-range');
  let contentLength = contentLengthRaw != null ? Number(contentLengthRaw) : null;
  if (contentRange) {
    const m = /\/(\d+)\s*$/.exec(contentRange);
    if (m) contentLength = Number(m[1]);
  }
  if (Number.isNaN(contentLength)) contentLength = null;

  return { etag, lastModified, contentLength, status: res.status };
}

/**
 * Sanity check de un ZIP: busca la firma EOCD en los últimos 64KB.
 * No valida CRC ni descomprime; solo detecta archivos truncados/corruptos básicos.
 */
export async function validateZipFile(filePath) {
  const stats = await stat(filePath);
  const size = stats.size;
  if (size < 22) {
    throw new Error(`ZIP demasiado pequeño (${size} bytes): probablemente corrupto.`);
  }
  const readSize = Math.min(65557, size); // 64KB + 22 (cabecera EOCD min)
  const fd = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(readSize);
    await fd.read(buffer, 0, readSize, size - readSize);
    const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]); // "PK\x05\x06"
    const idx = buffer.lastIndexOf(eocdSig);
    if (idx === -1) {
      throw new Error('No se encontró el registro EOCD: ZIP truncado o corrupto.');
    }
  } finally {
    await fd.close();
  }
}

/**
 * Descarga un archivo en streaming a `destPath`, calculando SHA256 al vuelo.
 * Estrategia:
 *  - Escribe a `<destPath>.part`
 *  - Si todo OK: valida ZIP y mueve a destPath
 *  - Si falla: limpia el .part
 *
 * @returns {Promise<{sha256: string, bytes: number, etag: string|null, lastModified: string|null, contentLength: number|null}>}
 */
export async function downloadToFile(url, destPath, { timeoutMs = 600000, logger, validateZip = true } = {}) {
  await mkdir(dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.part`;

  // Limpia un .part previo si quedó huérfano
  try { await unlink(tmpPath); } catch { /* noop */ }

  const t = withTimeout(timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'GET', headers: buildHeaders(), signal: t.signal, redirect: 'follow' });
  } catch (err) {
    t.cancel();
    throw err;
  }
  if (!res.ok) {
    t.cancel();
    throw new HttpError(res.status, res.statusText, url);
  }
  if (!res.body) {
    t.cancel();
    throw new Error('Respuesta sin body');
  }

  const etag = res.headers.get('etag') ?? null;
  const lastModified = res.headers.get('last-modified') ?? null;
  const contentLengthHeader = res.headers.get('content-length');
  const contentLength = contentLengthHeader != null ? Number(contentLengthHeader) : null;

  const hash = createHash('sha256');
  let bytes = 0;
  const tap = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      bytes += chunk.length;
      cb(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(res.body),
      tap,
      createWriteStream(tmpPath),
    );
  } catch (err) {
    t.cancel();
    try { await unlink(tmpPath); } catch { /* noop */ }
    throw err;
  }
  t.cancel();

  if (contentLength != null && contentLength > 0 && bytes !== contentLength) {
    try { await unlink(tmpPath); } catch { /* noop */ }
    throw new Error(`Tamaño descargado (${bytes}) ≠ Content-Length (${contentLength}).`);
  }

  if (validateZip) {
    try {
      await validateZipFile(tmpPath);
    } catch (err) {
      try { await unlink(tmpPath); } catch { /* noop */ }
      throw err;
    }
  }

  await rename(tmpPath, destPath);
  logger?.debug('descarga OK', { url, destPath, bytes });

  return {
    sha256: hash.digest('hex'),
    bytes,
    etag,
    lastModified,
    contentLength,
  };
}
