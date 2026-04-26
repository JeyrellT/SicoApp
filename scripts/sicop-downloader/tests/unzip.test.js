import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { extractZip, listZipEntries, safeJoinExtract, UnzipError } from '../lib/unzip.js';
import { buildZip } from './_zip-fixture.js';

let workDir;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-unzip-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

test('extractZip: extrae un único archivo DEFLATE y verifica contenido + CRC', async () => {
  const zipPath = join(workDir, 'a.zip');
  const original = Buffer.from('hola mundo SICOP\n'.repeat(100), 'utf8');
  await writeFile(zipPath, buildZip([{ name: 'archivo.txt', data: original, method: 'deflate' }]));

  const out = join(workDir, 'out');
  const res = await extractZip(zipPath, out);
  assert.equal(res.entries, 1);
  assert.equal(res.bytes, original.length);

  const got = await readFile(join(out, 'archivo.txt'));
  assert.deepEqual(got, original);
});

test('extractZip: extrae múltiples archivos con métodos mixtos', async () => {
  const zipPath = join(workDir, 'b.zip');
  const a = Buffer.from('A'.repeat(10), 'utf8');
  const b = Buffer.from('csv,data\n1,2\n3,4\n', 'utf8');
  await writeFile(zipPath, buildZip([
    { name: 'a.txt', data: a, method: 'stored' },
    { name: 'sub/b.csv', data: b, method: 'deflate' },
  ]));

  const out = join(workDir, 'out');
  const res = await extractZip(zipPath, out);
  assert.equal(res.entries, 2);
  assert.deepEqual(await readFile(join(out, 'a.txt')), a);
  assert.deepEqual(await readFile(join(out, 'sub', 'b.csv')), b);
});

test('extractZip: archivo vacío (size=0)', async () => {
  const zipPath = join(workDir, 'empty.zip');
  await writeFile(zipPath, buildZip([{ name: 'empty.txt', data: Buffer.alloc(0), method: 'stored' }]));
  const out = join(workDir, 'out');
  await extractZip(zipPath, out);
  const got = await readFile(join(out, 'empty.txt'));
  assert.equal(got.length, 0);
});

test('listZipEntries: lista sin extraer', async () => {
  const zipPath = join(workDir, 'l.zip');
  await writeFile(zipPath, buildZip([
    { name: 'x.csv', data: Buffer.from('hi'), method: 'stored' },
    { name: 'y.csv', data: Buffer.from('hello'), method: 'deflate' },
  ]));
  const list = await listZipEntries(zipPath);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((e) => e.filename).sort(), ['x.csv', 'y.csv']);
  assert.equal(list[0].method, 0);
  assert.equal(list[1].method, 8);
});

test('safeJoinExtract: rechaza path traversal con ".."', () => {
  assert.throws(() => safeJoinExtract('/tmp/out', '../etc/passwd'), UnzipError);
  assert.throws(() => safeJoinExtract('/tmp/out', 'a/../../escape.txt'), UnzipError);
});

test('safeJoinExtract: rechaza paths absolutos tipo C:/', () => {
  assert.throws(() => safeJoinExtract('C:/tmp/out', 'D:/escape.txt'), UnzipError);
});

test('safeJoinExtract: acepta paths relativos válidos', () => {
  const got = safeJoinExtract('/tmp/out', 'sub/dir/file.csv');
  assert.match(got, /sub.dir.file\.csv$/);
});

test('extractZip: rechaza ZIP corrupto (sin EOCD)', async () => {
  const zipPath = join(workDir, 'bad.zip');
  await writeFile(zipPath, Buffer.alloc(100, 0x00)); // 100 bytes de ceros
  await assert.rejects(extractZip(zipPath, join(workDir, 'out')), /EOCD/);
});

test('extractZip: rechaza intento de escape vía path traversal en filename', async () => {
  const zipPath = join(workDir, 'evil.zip');
  await writeFile(zipPath, buildZip([
    { name: '../escape.txt', data: Buffer.from('pwned'), method: 'stored' },
  ]));
  await assert.rejects(extractZip(zipPath, join(workDir, 'out')), /traversal/);
});

test('extractZip: detecta CRC corrupto', async () => {
  const zipPath = join(workDir, 'badcrc.zip');
  // Construir un ZIP válido y luego corromper un byte de los datos
  const data = Buffer.from('mensaje original');
  const zip = buildZip([{ name: 'a.txt', data, method: 'stored' }]);
  // Los datos del primer LFH están en offset 30 + nombre
  const dataOffset = 30 + 'a.txt'.length;
  zip[dataOffset] = (zip[dataOffset] + 1) & 0xff; // corrupción
  await writeFile(zipPath, zip);
  await assert.rejects(extractZip(zipPath, join(workDir, 'out')), /CRC/);
});

test('extractZip: ZIP grande con varios CSVs simulando SICOP', async () => {
  const zipPath = join(workDir, 'sicop.zip');
  const csv1 = Buffer.from('id;monto;institucion\n' + '1;1000;CR\n'.repeat(500), 'utf8');
  const csv2 = Buffer.from('id;proveedor\n' + '1;Acme\n'.repeat(300), 'utf8');
  await writeFile(zipPath, buildZip([
    { name: 'SICOP_compras_202401.csv', data: csv1, method: 'deflate' },
    { name: 'SICOP_proveedores_202401.csv', data: csv2, method: 'deflate' },
  ]));
  const out = join(workDir, 'out');
  const res = await extractZip(zipPath, out);
  assert.equal(res.entries, 2);
  assert.equal((await readFile(join(out, 'SICOP_compras_202401.csv'))).length, csv1.length);
});
