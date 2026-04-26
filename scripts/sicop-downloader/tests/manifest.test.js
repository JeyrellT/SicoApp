import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readManifest,
  writeManifest,
  emptyManifest,
  shouldDownload,
  makeEntry,
  SCHEMA_VERSION,
} from '../lib/manifest.js';

let workDir;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-manifest-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

test('readManifest sobre archivo inexistente retorna manifest vacío', async () => {
  const m = await readManifest(join(workDir, 'no-existe.json'), 'http://x');
  assert.equal(m.schema_version, SCHEMA_VERSION);
  assert.equal(m.source, 'http://x');
  assert.deepEqual(m.files, {});
});

test('writeManifest + readManifest round-trip', async () => {
  const path = join(workDir, 'm.json');
  const m = emptyManifest('http://x');
  m.files['202401'] = makeEntry({
    yyyymm: '202401',
    url: 'http://x/202401.zip',
    etag: 'abc',
    lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
    contentLength: 1234,
    sha256: 'deadbeef',
    localPath: '/tmp/202401.zip',
    isCurrentMonth: false,
  });
  await writeManifest(path, m);

  const got = await readManifest(path);
  assert.equal(got.files['202401'].etag, 'abc');
  assert.equal(got.files['202401'].sha256, 'deadbeef');
  assert.equal(got.files['202401'].download_count, 1);
});

test('readManifest rechaza schema_version distinto', async () => {
  const path = join(workDir, 'bad.json');
  await writeFile(path, JSON.stringify({ schema_version: 999, files: {} }), 'utf8');
  await assert.rejects(() => readManifest(path), /schema_version/);
});

test('makeEntry incrementa download_count', () => {
  const e1 = makeEntry({
    yyyymm: '202401', url: 'u', etag: 'a', lastModified: null,
    contentLength: 1, sha256: 's', localPath: 'p', isCurrentMonth: false,
  });
  const e2 = makeEntry({
    yyyymm: '202401', url: 'u', etag: 'b', lastModified: null,
    contentLength: 2, sha256: 's2', localPath: 'p', isCurrentMonth: false,
    previousEntry: e1,
  });
  assert.equal(e1.download_count, 1);
  assert.equal(e2.download_count, 2);
});

test('shouldDownload: sin entrada → descarga', async () => {
  const r = await shouldDownload({
    entry: null, headers: {}, isCurrentMonth: true, force: false,
    localPath: join(workDir, 'no-existe.zip'),
  });
  assert.equal(r.download, true);
  assert.equal(r.reason, 'no-entry');
});

test('shouldDownload: force → descarga aunque haya entrada', async () => {
  const localPath = join(workDir, 'a.zip');
  await writeFile(localPath, 'x');
  const entry = { etag: 'a', last_modified: 'X', content_length: 1, local_path: localPath };
  const r = await shouldDownload({
    entry, headers: { etag: 'a', lastModified: 'X', contentLength: 1 },
    isCurrentMonth: false, force: true, localPath,
  });
  assert.equal(r.download, true);
  assert.equal(r.reason, 'force');
});

test('shouldDownload: mes pasado con entry → no descarga', async () => {
  const localPath = join(workDir, 'a.zip');
  await writeFile(localPath, 'x');
  const entry = { etag: 'a', last_modified: 'X', content_length: 1, local_path: localPath };
  const r = await shouldDownload({
    entry, headers: { etag: 'a', lastModified: 'X', contentLength: 1 },
    isCurrentMonth: false, force: false, localPath,
  });
  assert.equal(r.download, false);
  assert.equal(r.reason, 'past-month-cached');
});

test('shouldDownload: mes pasado pero archivo local borrado → descarga', async () => {
  const entry = { etag: 'a', last_modified: 'X', content_length: 1, local_path: '/no/existe' };
  const r = await shouldDownload({
    entry, headers: { etag: 'a', lastModified: 'X', contentLength: 1 },
    isCurrentMonth: false, force: false, localPath: join(workDir, 'no-existe.zip'),
  });
  assert.equal(r.download, true);
  assert.match(r.reason, /local-missing/);
});

test('shouldDownload: mes actual con etag distinto → descarga', async () => {
  const localPath = join(workDir, 'a.zip');
  await writeFile(localPath, 'x');
  const entry = { etag: 'a', last_modified: 'X', content_length: 1, local_path: localPath };
  const r = await shouldDownload({
    entry, headers: { etag: 'b', lastModified: 'X', contentLength: 1 },
    isCurrentMonth: true, force: false, localPath,
  });
  assert.equal(r.download, true);
  assert.equal(r.reason, 'etag-changed');
});

test('shouldDownload: mes actual con headers idénticos → no descarga', async () => {
  const localPath = join(workDir, 'a.zip');
  await writeFile(localPath, 'x');
  const entry = { etag: 'a', last_modified: 'X', content_length: 1, local_path: localPath };
  const r = await shouldDownload({
    entry, headers: { etag: 'a', lastModified: 'X', contentLength: 1 },
    isCurrentMonth: true, force: false, localPath,
  });
  assert.equal(r.download, false);
  assert.equal(r.reason, 'unchanged');
});

test('shouldDownload: mes actual sin headers comparables → descarga conservador', async () => {
  const localPath = join(workDir, 'a.zip');
  await writeFile(localPath, 'x');
  const entry = { etag: null, last_modified: null, content_length: null, local_path: localPath };
  const r = await shouldDownload({
    entry, headers: { etag: null, lastModified: null, contentLength: null },
    isCurrentMonth: true, force: false, localPath,
  });
  assert.equal(r.download, true);
  assert.equal(r.reason, 'no-comparable-headers');
});
