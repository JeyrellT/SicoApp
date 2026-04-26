/**
 * Tests E2E del orquestador contra servidor HTTP local con manifest en disco.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run, buildUrl, resolveTargets } from '../lib/orchestrator.js';
import { createLogger } from '../lib/logger.js';
import { currentYearMonth } from '../lib/dates.js';

function silentLogger() {
  return createLogger({ level: 'error', quiet: true });
}

function makeMinimalZipBuffer() {
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  const fileName = Buffer.from('e.txt');
  localHeader.writeUInt16LE(fileName.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(fileName.length, 28);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + fileName.length, 12);
  eocd.writeUInt32LE(30 + fileName.length, 16);

  return Buffer.concat([localHeader, fileName, central, fileName, eocd]);
}

const ZIP_BODY = makeMinimalZipBuffer();

let server;
let baseUrl;
let workDir;
let etagCounter;
let requestLog;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-orq-'));
  etagCounter = 0;
  requestLog = [];

  server = createServer((req, res) => {
    requestLog.push({ method: req.method, url: req.url });
    const m = /^\/zip\/(\d{6})\.zip$/.exec(req.url ?? '');
    if (!m) {
      res.statusCode = 500;
      return res.end();
    }
    const yyyymm = m[1];
    if (yyyymm === '999999') {
      res.statusCode = 404;
      return res.end();
    }
    res.setHeader('ETag', `"v${etagCounter}"`);
    res.setHeader('Last-Modified', 'Mon, 01 Jan 2024 00:00:00 GMT');
    res.setHeader('Content-Length', String(ZIP_BODY.length));
    res.setHeader('Content-Type', 'application/zip');
    if (req.method === 'HEAD') return res.end();
    res.statusCode = 200;
    return res.end(ZIP_BODY);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/zip`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { recursive: true, force: true });
});

test('buildUrl arma URL correctamente sin barra duplicada', () => {
  assert.equal(buildUrl('https://x.com/Zip', '202403'), 'https://x.com/Zip/202403.zip');
  assert.equal(buildUrl('https://x.com/Zip/', '202403'), 'https://x.com/Zip/202403.zip');
});

test('resolveTargets respeta currentOnly', () => {
  const t = resolveTargets({ currentOnly: true });
  assert.deepEqual(t, [currentYearMonth()]);
});

test('resolveTargets enumera entre from y to', () => {
  const t = resolveTargets({ from: '2024-01', to: '2024-03' });
  assert.deepEqual(t, ['202401', '202402', '202403']);
});

test('run descarga primer archivo y crea entrada en manifest', async () => {
  const manifestPath = join(workDir, 'm.json');
  const outDir = join(workDir, 'raw');
  const { summary } = await run({
    baseUrl,
    outDir,
    manifestPath,
    targets: ['202401'],
    dryRun: false,
    force: false,
    logger: silentLogger(),
  });
  assert.equal(summary.downloaded, 1);
  assert.equal(summary.skipped, 0);
  assert.equal(summary.failed, 0);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.ok(manifest.files['202401']);
  assert.equal(manifest.files['202401'].sha256.length, 64);
});

test('run salta archivo de mes pasado en segunda corrida', async () => {
  const manifestPath = join(workDir, 'm.json');
  const outDir = join(workDir, 'raw');

  // Primera corrida: descarga
  await run({
    baseUrl, outDir, manifestPath, targets: ['202401'],
    dryRun: false, force: false, logger: silentLogger(),
  });
  requestLog.length = 0;

  // Segunda corrida: debería saltar (mes pasado, ya está cacheado)
  const { summary } = await run({
    baseUrl, outDir, manifestPath, targets: ['202401'],
    dryRun: false, force: false, logger: silentLogger(),
  });
  assert.equal(summary.downloaded, 0);
  assert.equal(summary.skipped, 1);
  // La heurística "past-month-cached" evita incluso la HEAD; debe haber 0 o 1 request
  // (depende de si decidimos optimizar; aquí nos basta con que no descargue)
});

test('run con --force re-descarga aunque haya manifest', async () => {
  const manifestPath = join(workDir, 'm.json');
  const outDir = join(workDir, 'raw');

  await run({
    baseUrl, outDir, manifestPath, targets: ['202401'],
    dryRun: false, force: false, logger: silentLogger(),
  });
  const m1 = JSON.parse(await readFile(manifestPath, 'utf8'));
  const dl1 = m1.files['202401'].download_count;

  etagCounter++; // simula cambio en el blob
  const { summary } = await run({
    baseUrl, outDir, manifestPath, targets: ['202401'],
    dryRun: false, force: true, logger: silentLogger(),
  });
  assert.equal(summary.downloaded, 1);
  const m2 = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(m2.files['202401'].download_count, dl1 + 1);
});

test('run con 404 reporta not_published sin fallar', async () => {
  const manifestPath = join(workDir, 'm.json');
  const outDir = join(workDir, 'raw');

  const { summary, results } = await run({
    baseUrl, outDir, manifestPath, targets: ['999999'],
    dryRun: false, force: false, logger: silentLogger(),
  });
  assert.equal(summary.not_published, 1);
  assert.equal(summary.failed, 0);
  assert.equal(results[0].status, 'not_published');
});

test('run dry-run no escribe archivos pero reporta would_download', async () => {
  const manifestPath = join(workDir, 'm.json');
  const outDir = join(workDir, 'raw');

  const { summary, results } = await run({
    baseUrl, outDir, manifestPath, targets: ['202401'],
    dryRun: true, force: false, logger: silentLogger(),
  });
  assert.equal(summary.downloaded, 1); // contado como "downloaded" en summary
  assert.equal(results[0].status, 'would_download');
  // No archivo en disco
  await assert.rejects(readFile(join(outDir, '202401.zip')));
});
