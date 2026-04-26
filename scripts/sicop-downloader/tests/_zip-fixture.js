/**
 * Constructor de ZIPs in-memory para tests. Soporta STORED y DEFLATE.
 * Sin dependencias.
 */

import { deflateRawSync } from 'node:zlib';

const SIG_LFH = 0x04034b50;
const SIG_CDH = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Construye un ZIP a partir de una lista de entries.
 * @param {Array<{name: string, data: Buffer, method?: 'stored'|'deflate'}>} entries
 * @returns {Buffer}
 */
export function buildZip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const method = e.method ?? 'deflate';
    const methodNum = method === 'stored' ? 0 : 8;
    const raw = e.data;
    const compressed = method === 'stored' ? raw : deflateRawSync(raw);
    const crc = crc32(raw);
    const fname = Buffer.from(e.name, 'utf8');

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(SIG_LFH, 0);
    lfh.writeUInt16LE(20, 4);                   // version
    lfh.writeUInt16LE(0x0800, 6);               // flags: UTF-8 filename
    lfh.writeUInt16LE(methodNum, 8);
    lfh.writeUInt16LE(0, 10);                   // mod time
    lfh.writeUInt16LE(0, 12);                   // mod date
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compressed.length, 18);
    lfh.writeUInt32LE(raw.length, 22);
    lfh.writeUInt16LE(fname.length, 26);
    lfh.writeUInt16LE(0, 28);                   // extra len

    parts.push(lfh, fname, compressed);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(SIG_CDH, 0);
    cdh.writeUInt16LE(20, 4);                   // version made
    cdh.writeUInt16LE(20, 6);                   // version needed
    cdh.writeUInt16LE(0x0800, 8);               // flags
    cdh.writeUInt16LE(methodNum, 10);
    cdh.writeUInt16LE(0, 12);                   // mod time
    cdh.writeUInt16LE(0, 14);                   // mod date
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compressed.length, 20);
    cdh.writeUInt32LE(raw.length, 24);
    cdh.writeUInt16LE(fname.length, 28);
    cdh.writeUInt16LE(0, 30);                   // extra len
    cdh.writeUInt16LE(0, 32);                   // comment len
    cdh.writeUInt16LE(0, 34);                   // disk
    cdh.writeUInt16LE(0, 36);                   // internal attr
    cdh.writeUInt32LE(0, 38);                   // external attr
    cdh.writeUInt32LE(offset, 42);              // local offset

    central.push(cdh, fname);
    offset += lfh.length + fname.length + compressed.length;
  }

  const cdStart = offset;
  for (const p of central) parts.push(p);
  const cdSize = central.reduce((s, p) => s + p.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_EOCD, 0);
  eocd.writeUInt16LE(0, 4);                     // disk
  eocd.writeUInt16LE(0, 6);                     // disk start
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);                    // comment len
  parts.push(eocd);

  return Buffer.concat(parts);
}
