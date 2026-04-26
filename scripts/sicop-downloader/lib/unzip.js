/**
 * Extractor de archivos ZIP en streaming, sin dependencias externas.
 *
 * Estrategia: parsea el End of Central Directory (EOCD) y el Central Directory,
 * luego para cada entrada hace seek al Local File Header y extrae los datos.
 * Soporta:
 *   - method=0 (STORED, sin compresión)
 *   - method=8 (DEFLATE, vía node:zlib createInflateRaw)
 * No soporta: ZIP64 (>4GB por archivo), encriptación, otros métodos.
 *
 * Defensas:
 *   - Path traversal: rechaza filenames con `..` o paths absolutos.
 *   - Escritura fuera del outDir: doble verificación con resolve()+startsWith.
 *   - Filenames con barras invertidas (Windows zips) se normalizan a /.
 */

import { open, mkdir, stat as fsStat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve, dirname, join, sep, posix } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createInflateRaw } from 'node:zlib';
import { createHash } from 'node:crypto';

const SIG_LFH = 0x04034b50;
const SIG_CDH = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

const MAX_EOCD_SCAN = 65557; // 22 (EOCD min) + 65535 (max comment)
const LFH_FIXED = 30;
const CDH_FIXED = 46;
const EOCD_FIXED = 22;

export class UnzipError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'UnzipError';
    this.code = code;
  }
}

/**
 * Localiza el End of Central Directory escaneando los últimos bytes del archivo.
 * @param {import('node:fs/promises').FileHandle} fd
 * @param {number} fileSize
 * @returns {Promise<{cdOffset:number,cdSize:number,totalEntries:number,commentLength:number}>}
 */
async function findEOCD(fd, fileSize) {
  if (fileSize < EOCD_FIXED) {
    throw new UnzipError(`ZIP demasiado pequeño (${fileSize} bytes).`, 'ZIP_TOO_SMALL');
  }
  const readSize = Math.min(MAX_EOCD_SCAN, fileSize);
  const buffer = Buffer.alloc(readSize);
  await fd.read(buffer, 0, readSize, fileSize - readSize);

  // Buscar firma de fin a fin
  for (let i = buffer.length - EOCD_FIXED; i >= 0; i--) {
    if (buffer.readUInt32LE(i) !== SIG_EOCD) continue;
    const commentLength = buffer.readUInt16LE(i + 20);
    if (i + EOCD_FIXED + commentLength !== buffer.length) continue;
    return {
      cdOffset: buffer.readUInt32LE(i + 16),
      cdSize: buffer.readUInt32LE(i + 12),
      totalEntries: buffer.readUInt16LE(i + 10),
      commentLength,
    };
  }
  throw new UnzipError('No se encontró el registro EOCD (ZIP corrupto).', 'EOCD_NOT_FOUND');
}

/**
 * Parsea el Central Directory completo y retorna una lista de entradas.
 * @param {Buffer} cdBuffer
 * @param {number} totalEntries
 */
function parseCentralDirectory(cdBuffer, totalEntries) {
  const entries = [];
  let off = 0;
  for (let i = 0; i < totalEntries; i++) {
    if (cdBuffer.readUInt32LE(off) !== SIG_CDH) {
      throw new UnzipError(`Firma CDH inválida en offset ${off}.`, 'CDH_BAD_SIG');
    }
    const flags = cdBuffer.readUInt16LE(off + 8);
    const method = cdBuffer.readUInt16LE(off + 10);
    const crc32 = cdBuffer.readUInt32LE(off + 16);
    const compressedSize = cdBuffer.readUInt32LE(off + 20);
    const uncompressedSize = cdBuffer.readUInt32LE(off + 24);
    const fnLen = cdBuffer.readUInt16LE(off + 28);
    const extraLen = cdBuffer.readUInt16LE(off + 30);
    const commentLen = cdBuffer.readUInt16LE(off + 32);
    const externalAttr = cdBuffer.readUInt32LE(off + 38);
    const localOffset = cdBuffer.readUInt32LE(off + 42);

    // Bit 11: filename en UTF-8 explícito. Si no, asumimos cp437≈latin1 fallback.
    // Para CSVs SICOP los nombres son ASCII; usamos utf8 que es seguro para ASCII.
    const isUtf8 = (flags & 0x0800) !== 0;
    const fnBuf = cdBuffer.subarray(off + CDH_FIXED, off + CDH_FIXED + fnLen);
    const filename = isUtf8 ? fnBuf.toString('utf8') : fnBuf.toString('utf8'); // ASCII safe
    const isDir = filename.endsWith('/') || filename.endsWith('\\') || (externalAttr & 0x10) !== 0;

    entries.push({
      filename: filename.replace(/\\/g, '/'),
      isDir,
      flags,
      method,
      crc32,
      compressedSize,
      uncompressedSize,
      localOffset,
    });

    off += CDH_FIXED + fnLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Calcula el offset real de los datos comprimidos: el LFH puede tener filename/extra
 * de tamaño distinto al CDH, así que hay que leer su cabecera fija (30 bytes).
 */
async function getDataOffset(fd, localOffset) {
  const buf = Buffer.alloc(LFH_FIXED);
  await fd.read(buf, 0, LFH_FIXED, localOffset);
  if (buf.readUInt32LE(0) !== SIG_LFH) {
    throw new UnzipError(`Firma LFH inválida en offset ${localOffset}.`, 'LFH_BAD_SIG');
  }
  const fnLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  return localOffset + LFH_FIXED + fnLen + extraLen;
}

/**
 * Sanitiza un path relativo extraído de un ZIP.
 * Rechaza paths absolutos, "..", drives Windows, etc.
 */
export function safeJoinExtract(outDir, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new UnzipError(`Filename vacío o inválido.`, 'BAD_FILENAME');
  }
  // Normaliza separadores
  let p = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  // Rechaza drive letters tipo "C:/"
  if (/^[a-zA-Z]:/.test(p)) {
    throw new UnzipError(`Filename con drive absoluto: ${relativePath}`, 'ABS_PATH');
  }
  // Rechaza segmentos ".."
  if (p.split('/').some((seg) => seg === '..')) {
    throw new UnzipError(`Filename con traversal: ${relativePath}`, 'PATH_TRAVERSAL');
  }
  const target = resolve(outDir, p);
  const root = resolve(outDir);
  // Verifica que el target queda DENTRO de outDir
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new UnzipError(`Filename escaparía a outDir: ${relativePath}`, 'OUT_OF_BOUNDS');
  }
  return target;
}

/**
 * Stream que valida CRC32 y tamaño descomprimido al cierre.
 */
function makeCrcSizeValidator(expectedCrc, expectedSize) {
  // Tabla CRC32 (precalculada en runtime; ~2KB)
  const TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    TABLE[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  let bytes = 0;
  const stream = new Transform({
    transform(chunk, _enc, cb) {
      for (let i = 0; i < chunk.length; i++) {
        crc = TABLE[(crc ^ chunk[i]) & 0xff] ^ (crc >>> 8);
      }
      bytes += chunk.length;
      cb(null, chunk);
    },
    flush(cb) {
      const finalCrc = (crc ^ 0xffffffff) >>> 0;
      if (expectedSize > 0 && bytes !== expectedSize) {
        return cb(new UnzipError(
          `Tamaño descomprimido (${bytes}) ≠ esperado (${expectedSize}).`,
          'SIZE_MISMATCH',
        ));
      }
      if (expectedCrc !== 0 && finalCrc !== (expectedCrc >>> 0)) {
        return cb(new UnzipError(
          `CRC32 inválido (calc=${finalCrc.toString(16)} esperado=${expectedCrc.toString(16)}).`,
          'CRC_MISMATCH',
        ));
      }
      cb();
    },
  });
  return stream;
}

/**
 * Extrae un único entry a `outPath`, usando un FileHandle abierto.
 */
async function extractEntry(fd, entry, outPath, { skipCrc = false } = {}) {
  await mkdir(dirname(outPath), { recursive: true });
  const dataOffset = await getDataOffset(fd, entry.localOffset);
  const end = dataOffset + entry.compressedSize - 1;

  // Caso especial: archivo de tamaño 0
  if (entry.compressedSize === 0 && entry.uncompressedSize === 0) {
    const writer = createWriteStream(outPath);
    await new Promise((res, rej) => writer.end((err) => err ? rej(err) : res()));
    return { bytes: 0 };
  }

  const reader = fd.createReadStream({ start: dataOffset, end, autoClose: false });
  const writer = createWriteStream(outPath);

  const stages = [reader];
  if (entry.method === METHOD_DEFLATE) {
    stages.push(createInflateRaw());
  } else if (entry.method !== METHOD_STORED) {
    throw new UnzipError(`Método ${entry.method} no soportado (solo STORED y DEFLATE).`, 'UNSUPPORTED_METHOD');
  }
  if (!skipCrc) {
    stages.push(makeCrcSizeValidator(entry.crc32, entry.uncompressedSize));
  }
  stages.push(writer);

  await pipeline(...stages);
  return { bytes: entry.uncompressedSize };
}

/**
 * Lista entries de un ZIP sin extraerlo.
 * @param {string} zipPath
 * @returns {Promise<Array<{filename:string,isDir:boolean,method:number,compressedSize:number,uncompressedSize:number,crc32:number,localOffset:number}>>}
 */
export async function listZipEntries(zipPath) {
  const fd = await open(zipPath, 'r');
  try {
    const stats = await fd.stat();
    const eocd = await findEOCD(fd, stats.size);
    const cdBuf = Buffer.alloc(eocd.cdSize);
    await fd.read(cdBuf, 0, eocd.cdSize, eocd.cdOffset);
    return parseCentralDirectory(cdBuf, eocd.totalEntries);
  } finally {
    await fd.close();
  }
}

/**
 * Extrae todo un ZIP a `outDir`. Sobreescribe archivos existentes.
 *
 * @param {string} zipPath
 * @param {string} outDir
 * @param {object} [opts]
 * @param {boolean} [opts.skipCrc=false]   Si true, omite la verificación CRC32 (~5% más rápido).
 * @param {(progress:{filename:string,index:number,total:number,bytes:number}) => void} [opts.onEntry]
 * @returns {Promise<{entries:number, bytes:number, files:string[]}>}
 */
export async function extractZip(zipPath, outDir, { skipCrc = false, onEntry } = {}) {
  await mkdir(outDir, { recursive: true });
  const fd = await open(zipPath, 'r');
  let totalBytes = 0;
  const files = [];
  try {
    const stats = await fd.stat();
    const eocd = await findEOCD(fd, stats.size);
    const cdBuf = Buffer.alloc(eocd.cdSize);
    await fd.read(cdBuf, 0, eocd.cdSize, eocd.cdOffset);
    const entries = parseCentralDirectory(cdBuf, eocd.totalEntries);

    // Cada entry crea un readStream sobre el mismo FileHandle, lo que añade listeners.
    // Subimos el límite proporcionalmente a las entries para evitar el warning.
    if (typeof fd.setMaxListeners === 'function') {
      fd.setMaxListeners(Math.max(20, entries.length + 10));
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isDir) {
        // Directorio explícito: lo creamos
        const dir = safeJoinExtract(outDir, entry.filename);
        await mkdir(dir, { recursive: true });
        continue;
      }
      const outPath = safeJoinExtract(outDir, entry.filename);
      const res = await extractEntry(fd, entry, outPath, { skipCrc });
      totalBytes += res.bytes;
      files.push(outPath);
      if (onEntry) {
        onEntry({ filename: entry.filename, index: i + 1, total: entries.length, bytes: res.bytes });
      }
    }
    return { entries: entries.length, bytes: totalBytes, files };
  } finally {
    await fd.close();
  }
}
