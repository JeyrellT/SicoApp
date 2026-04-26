/**
 * Parser CSV streaming sin dependencias.
 *
 * - Detección automática de separador en la primera línea: `,` `;` `\t` `|`.
 * - Quoted fields con escape "" → ".
 * - Soporta multi-line quoted fields (campos con saltos de línea internos entre comillas).
 * - Encoding configurable: 'utf8' (default) o 'latin1'.
 * - BOM UTF-8 al inicio se elimina automáticamente.
 *
 * Limitación: no maneja registros sin terminador final (pero los CSVs reales casi siempre lo tienen).
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const CANDIDATE_SEPARATORS = [',', ';', '\t', '|'];

/**
 * Detecta el separador más probable contando ocurrencias en la primera línea no vacía.
 */
export function detectSeparator(firstLine) {
  if (!firstLine) return ',';
  const counts = CANDIDATE_SEPARATORS.map((s) => ({ s, n: countOutsideQuotes(firstLine, s) }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].s : ',';
}

/**
 * Cuenta ocurrencias de `ch` fuera de comillas dobles.
 */
function countOutsideQuotes(line, ch) {
  let inQ = false;
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // doble comilla escape
      if (inQ && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQ = !inQ;
    } else if (!inQ && c === ch) {
      n++;
    }
  }
  return n;
}

/**
 * Parsea una línea CSV ya completa (sin saltos de línea internos sin cerrar).
 * @returns {string[]} campos
 */
export function parseCsvLine(line, sep = ',') {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === sep) {
        fields.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * Cuenta comillas no escapadas en una línea (para detectar quoted fields multi-línea).
 * @returns {number} cantidad de comillas que abren/cierran (par = balanceado)
 */
function countUnescapedQuotes(line) {
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (line[i + 1] === '"') {
        i++;
        continue;
      }
      n++;
    }
  }
  return n;
}

/**
 * Async generator de records (string[]) leyendo de un readable de bytes.
 *
 * @param {NodeJS.ReadableStream} readable
 * @param {object} [opts]
 * @param {string} [opts.encoding='utf8']
 * @param {string} [opts.separator] - si no se pasa, se detecta de la primera línea
 * @param {number} [opts.maxRecords=Infinity]
 * @returns {AsyncGenerator<string[]>}
 */
export async function* parseCsvStream(readable, opts = {}) {
  const { encoding = 'utf8', separator = null, maxRecords = Infinity } = opts;
  readable.setEncoding(encoding);

  let buffer = '';
  let firstChunk = true;
  let sep = separator;
  let lineBuffer = ''; // acumula líneas que pertenecen a un mismo record (quoted multi-line)
  let openQuotes = 0;
  let recordsEmitted = 0;

  for await (const chunk of readable) {
    buffer += chunk;
    if (firstChunk) {
      // Quitar BOM UTF-8
      if (buffer.charCodeAt(0) === 0xfeff) buffer = buffer.slice(1);
      firstChunk = false;
    }

    let nlIdx;
    while ((nlIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);

      if (sep === null) {
        sep = detectSeparator(line);
      }

      lineBuffer = lineBuffer ? lineBuffer + '\n' + line : line;
      openQuotes += countUnescapedQuotes(line);
      if (openQuotes % 2 !== 0) {
        // record continúa: hay campo quoted abierto que cruza líneas
        continue;
      }

      const fields = parseCsvLine(lineBuffer, sep);
      lineBuffer = '';
      openQuotes = 0;
      yield fields;
      recordsEmitted++;
      if (recordsEmitted >= maxRecords) {
        readable.destroy?.();
        return;
      }
    }
  }

  // Flush último record si quedó algo en buffer (sin newline final)
  const tail = (lineBuffer ? lineBuffer + '\n' : '') + buffer;
  if (tail.length > 0) {
    if (sep === null) sep = detectSeparator(tail);
    yield parseCsvLine(tail.replace(/\r?\n$/, ''), sep);
  }
}

/**
 * Lee primeros bytes del archivo para detectar separador en la línea cruda.
 */
async function sniffSeparator(filePath, encoding) {
  const sniff = createReadStream(filePath, { start: 0, end: 8192, encoding });
  let buf = '';
  for await (const chunk of sniff) {
    buf += chunk;
    const nlIdx = buf.indexOf('\n');
    if (nlIdx !== -1) {
      sniff.destroy();
      let firstLine = buf.slice(0, nlIdx);
      // Quitar BOM si está
      if (firstLine.charCodeAt(0) === 0xfeff) firstLine = firstLine.slice(1);
      if (firstLine.endsWith('\r')) firstLine = firstLine.slice(0, -1);
      return detectSeparator(firstLine);
    }
  }
  // Sin newline en los primeros 8KB: usa todo el buffer
  return detectSeparator(buf);
}

/**
 * Lee N primeras filas de un CSV. Retorna { headers, rows, separator, encoding, totalRead }.
 */
export async function previewCsv(filePath, { rows = 10, encoding = 'utf8', separator = null } = {}) {
  const sep = separator ?? await sniffSeparator(filePath, encoding);
  const stream = createReadStream(filePath);
  const out = [];
  let i = 0;
  for await (const rec of parseCsvStream(stream, { encoding, separator: sep, maxRecords: rows + 1 })) {
    out.push(rec);
    if (++i > rows) break;
  }
  return {
    headers: out[0] ?? [],
    rows: out.slice(1),
    separator: sep,
    encoding,
    totalRead: out.length,
  };
}

/**
 * Cuenta filas (excluye header). Streaming, no carga el archivo en memoria.
 */
export async function countRows(filePath, { encoding = 'utf8', separator = null, hasHeader = true } = {}) {
  const stream = createReadStream(filePath);
  let count = 0;
  for await (const _rec of parseCsvStream(stream, { encoding, separator })) {
    count++;
  }
  return hasHeader ? Math.max(0, count - 1) : count;
}

/**
 * Resumen rápido de un CSV: tamaño en bytes, separador detectado, headers, conteo aprox de filas.
 */
export async function summarizeCsv(filePath, { encoding = 'utf8', separator = null } = {}) {
  const st = await stat(filePath);
  const preview = await previewCsv(filePath, { rows: 3, encoding, separator });
  // Conteo exacto de filas: hace pasada completa (puede ser caro pero es streaming O(1) memoria)
  const totalRows = await countRows(filePath, { encoding, separator: preview.separator });
  return {
    bytes: st.size,
    separator: preview.separator,
    encoding,
    headers: preview.headers,
    sampleRows: preview.rows,
    totalRows,
  };
}
