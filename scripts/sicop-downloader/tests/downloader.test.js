/**
 * Tests de integración del downloader contra un servidor HTTP local.
 * No usa la red real.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fetchMetadata, downloadToFile, validateZipFile, HttpError } from '../lib/downloader.js';

// ZIP mínimo válido: archivo "empty.txt" vacío.
// Construido con la utilidad `node` en el momento de los tests para evitar binarios commiteados.
function makeMinimalZipBuffer() {
  // Local file header
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);     // signature
  localHeader.writeUInt16LE(20, 4);             // version
  localHeader.writeUInt16LE(0, 6);              // flags
  localHeader.writeUInt16LE(0, 8);              // method (stored)
  localHeader.writeUInt16LE(0, 10);             // mod time
  localHeader.writeUInt16LE(0, 12);             // mod date
  localHeader.writeUInt32LE(0, 14);             // crc32
  localHeader.writeUInt32LE(0, 18);             // compressed size
  localHeader.writeUInt32LE(0, 22);             // uncompressed size
  const fileName = Buffer.from('empty.txt');
  localHeader.writeUInt16LE(fileName.length, 26);
  localHeader.writeUInt16LE(0, 28);             // extra len

  // Central directory header
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(0, 20);
  central.writeUInt32LE(0, 24);
  central.writeUInt16LE(fileName.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + fileName.length, 12);  // size of central directory
  eocd.writeUInt32LE(30 + fileName.length, 16);  // offset of central directory
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([
    localHeader, fileName,
    central, fileName,
    eocd,
  ]);
}

let server;
let baseUrl;
let workDir;

const ETAG = '"test-etag-1"';
const LAST_MODIFIED = 'Mon, 01 Jan 2024 00:00:00 GMT';
const ZIP_BODY = makeMinimalZipBuffer();

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-dl-'));

  server = createServer((req, res) => {
    const url = req.url ?? '/';
    if (url === '/zip/202401.zip') {
      res.setHeader('ETag', ETAG);
      res.setHeader('Last-Modified', LAST_MODIFIED);
      res.setHeader('Content-Length', String(ZIP_BODY.length));
      res.setHeader('Content-Type', 'application/zip');
      if (req.method === 'HEAD') return res.end();
      res.statusCode = 200;
      return res.end(ZIP_BODY);
    }
    if (url === '/zip/notfound.zip') {
      res.statusCode = 404;
      return res.end('Not Found');
    }
    if (url === '/zip/truncated.zip') {
      res.setHeader('Content-Length', String(ZIP_BODY.length));
      if (req.method === 'HEAD') return res.end();
      res.statusCode = 200;
      // mandar la mitad para simular truncamiento
      return res.end(ZIP_BODY.subarray(0, Math.floor(ZIP_BODY.length / 2)));
    }
    if (url === '/zip/notazip.zip') {
      const body = Buffer.from('esto no es un zip de verdad'.repeat(100));
      res.setHeader('Content-Length', String(body.length));
      if (req.method === 'HEAD') return res.end();
      return res.end(body);
    }
    res.statusCode = 500;
    res.end('boom');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

test('fetchMetadata extrae etag, last-modified y content-length', async () => {
  const meta = await fetchMetadata(`${baseUrl}/zip/202401.zip`);
  assert.equal(meta.etag, ETAG);
  assert.equal(meta.lastModified, LAST_MODIFIED);
  assert.equal(meta.contentLength, ZIP_BODY.length);
  assert.equal(meta.status, 200);
});

test('fetchMetadata sobre 404 lanza HttpError con statusCode', async () => {
  await assert.rejects(
    fetchMetadata(`${baseUrl}/zip/notfound.zip`, { timeoutMs: 5000 }),
    (err) => err instanceof HttpError && err.statusCode === 404,
  );
});

test('downloadToFile guarda archivo, valida ZIP y retorna sha256', async () => {
  const dest = join(workDir, '202401.zip');
  const res = await downloadToFile(`${baseUrl}/zip/202401.zip`, dest);
  assert.equal(res.bytes, ZIP_BODY.length);
  assert.match(res.sha256, /^[a-f0-9]{64}$/);
  assert.equal(res.etag, ETAG);
  const st = await stat(dest);
  assert.equal(st.size, ZIP_BODY.length);
});

test('downloadToFile rechaza ZIP truncado y borra el .part', async () => {
  const dest = join(workDir, 'trunc.zip');
  // El servidor cierra la conexión a mitad → undici lanza "terminated" o
  // si llega a completar, nuestra validación de Content-Length / EOCD lo rechaza.
  await assert.rejects(
    downloadToFile(`${baseUrl}/zip/truncated.zip`, dest),
    /Content-Length|EOCD|truncado|terminated/i,
  );
  await assert.rejects(stat(dest));
  await assert.rejects(stat(`${dest}.part`));
});

test('downloadToFile rechaza archivo que no es ZIP', async () => {
  const dest = join(workDir, 'noazip.zip');
  await assert.rejects(
    downloadToFile(`${baseUrl}/zip/notazip.zip`, dest),
    /EOCD|corrupto/i,
  );
});

test('validateZipFile contra archivo demasiado pequeño', async () => {
  const tiny = join(workDir, 'tiny.zip');
  await writeFile(tiny, 'abc');
  await assert.rejects(validateZipFile(tiny), /demasiado pequeño/);
});

test('validateZipFile contra ZIP válido pasa', async () => {
  const ok = join(workDir, 'ok.zip');
  await writeFile(ok, ZIP_BODY);
  await validateZipFile(ok); // no lanza
});
