import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  extractAndCatalog,
  listExtracted,
  head,
  findCsvFiles,
  summary,
} from '../lib/reader.js';
import { createLogger } from '../lib/logger.js';
import { buildZip } from './_zip-fixture.js';

let workDir;

function silentLogger() {
  return createLogger({ level: 'error', quiet: true });
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-reader-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

test('extractAndCatalog: extrae ZIP, registra en catálogo y cuenta filas', async () => {
  const zipPath = join(workDir, '202401.zip');
  const csv = Buffer.from('id;monto;inst\n' + '1;100;CR\n'.repeat(50), 'utf8');
  await writeFile(zipPath, buildZip([{ name: 'compras.csv', data: csv, method: 'deflate' }]));

  const catalogPath = join(workDir, 'catalog.json');
  const outDir = join(workDir, 'extracted', '202401');
  const entry = await extractAndCatalog({
    zipPath,
    yyyymm: '202401',
    outDir,
    catalogPath,
    sourceSha256: 'deadbeef',
    logger: silentLogger(),
  });
  assert.equal(entry.files.length, 1);
  assert.equal(entry.files[0].rows, 50);
  assert.equal(entry.files[0].headers_count, 3);
  assert.equal(entry.source_sha256, 'deadbeef');
  // Catálogo en disco
  const cat = JSON.parse(await readFile(catalogPath, 'utf8'));
  assert.ok(cat.extracted['202401']);
});

test('extractAndCatalog: --skip-stats omite conteo de filas', async () => {
  const zipPath = join(workDir, '202402.zip');
  const csv = Buffer.from('a;b\n1;2\n3;4\n', 'utf8');
  await writeFile(zipPath, buildZip([{ name: 'x.csv', data: csv, method: 'stored' }]));

  const entry = await extractAndCatalog({
    zipPath,
    yyyymm: '202402',
    outDir: join(workDir, 'ex'),
    catalogPath: join(workDir, 'cat.json'),
    skipStats: true,
    logger: silentLogger(),
  });
  assert.equal(entry.files[0].rows, null);
});

test('listExtracted: filtra por yyyymm o devuelve todos', async () => {
  const catalogPath = join(workDir, 'c.json');
  const csv = Buffer.from('h\n1\n', 'utf8');
  for (const ym of ['202401', '202402']) {
    await writeFile(join(workDir, `${ym}.zip`), buildZip([{ name: 'x.csv', data: csv, method: 'stored' }]));
    await extractAndCatalog({
      zipPath: join(workDir, `${ym}.zip`),
      yyyymm: ym,
      outDir: join(workDir, 'ex', ym),
      catalogPath,
      logger: silentLogger(),
    });
  }

  const all = await listExtracted(catalogPath);
  assert.deepEqual(Object.keys(all).sort(), ['202401', '202402']);

  const one = await listExtracted(catalogPath, '202401');
  assert.ok(one);
  assert.equal(one.files.length, 1);

  const missing = await listExtracted(catalogPath, '999999');
  assert.equal(missing, null);
});

test('head: muestra primeras N filas', async () => {
  const csvPath = join(workDir, 't.csv');
  await writeFile(csvPath, 'a;b\n1;2\n3;4\n5;6\n7;8\n');
  const r = await head({ csvPath, rows: 2 });
  assert.deepEqual(r.headers, ['a', 'b']);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], ['1', '2']);
});

test('findCsvFiles: encuentra CSVs recursivamente', async () => {
  const root = join(workDir, 'root');
  await writeFile(join(workDir, 'fake.zip'), buildZip([
    { name: 'a.csv', data: Buffer.from('x\n1\n'), method: 'stored' },
    { name: 'sub/b.csv', data: Buffer.from('y\n2\n'), method: 'stored' },
    { name: 'readme.txt', data: Buffer.from('not csv'), method: 'stored' },
  ]));
  await extractAndCatalog({
    zipPath: join(workDir, 'fake.zip'),
    yyyymm: '202403',
    outDir: root,
    catalogPath: join(workDir, 'c.json'),
    logger: silentLogger(),
  });
  const found = await findCsvFiles(root);
  assert.equal(found.length, 2);
  assert.ok(found.some((p) => p.endsWith('a.csv')));
  assert.ok(found.some((p) => p.endsWith('b.csv')));
});

test('summary: agrega meses, archivos, bytes y filas', async () => {
  const catalogPath = join(workDir, 'c.json');
  const csv = Buffer.from('h;k\n' + '1;2\n'.repeat(10), 'utf8');
  for (const ym of ['202301', '202302', '202303']) {
    await writeFile(join(workDir, `${ym}.zip`), buildZip([{ name: 'data.csv', data: csv, method: 'deflate' }]));
    await extractAndCatalog({
      zipPath: join(workDir, `${ym}.zip`),
      yyyymm: ym,
      outDir: join(workDir, 'ex', ym),
      catalogPath,
      logger: silentLogger(),
    });
  }

  const s = await summary(catalogPath);
  assert.equal(s.months_count, 3);
  assert.deepEqual(s.months_range, ['202301', '202303']);
  assert.equal(s.files_count, 3);
  assert.equal(s.total_rows, 30);
});
