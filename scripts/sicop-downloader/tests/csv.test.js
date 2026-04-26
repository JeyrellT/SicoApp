import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseCsvLine,
  detectSeparator,
  parseCsvStream,
  previewCsv,
  countRows,
  summarizeCsv,
} from '../lib/csv.js';
import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';

let workDir;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'sicop-csv-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

test('parseCsvLine: campos simples con coma', () => {
  assert.deepEqual(parseCsvLine('a,b,c', ','), ['a', 'b', 'c']);
});

test('parseCsvLine: campos con comillas y separador interno', () => {
  assert.deepEqual(parseCsvLine('"hola, mundo",b,"c"', ','), ['hola, mundo', 'b', 'c']);
});

test('parseCsvLine: escape de comillas con ""', () => {
  assert.deepEqual(parseCsvLine('"dijo ""hola""",b', ','), ['dijo "hola"', 'b']);
});

test('parseCsvLine: separador semicolon (formato europeo CR)', () => {
  assert.deepEqual(parseCsvLine('a;b;c', ';'), ['a', 'b', 'c']);
});

test('parseCsvLine: campo vacío', () => {
  assert.deepEqual(parseCsvLine('a,,c', ','), ['a', '', 'c']);
});

test('detectSeparator: prefiere ; si predomina', () => {
  assert.equal(detectSeparator('a;b;c;d'), ';');
});

test('detectSeparator: ignora separadores dentro de quotes', () => {
  assert.equal(detectSeparator('a;b;"c,d,e";f'), ';');
});

test('detectSeparator: tab y pipe', () => {
  assert.equal(detectSeparator('a\tb\tc'), '\t');
  assert.equal(detectSeparator('a|b|c|d'), '|');
});

test('parseCsvStream: parsea CSV simple', async () => {
  const stream = Readable.from(['a,b,c\n1,2,3\n4,5,6\n']);
  const out = [];
  for await (const r of parseCsvStream(stream)) out.push(r);
  assert.deepEqual(out, [['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']]);
});

test('parseCsvStream: maneja CRLF', async () => {
  const stream = Readable.from(['a,b\r\n1,2\r\n3,4\r\n']);
  const out = [];
  for await (const r of parseCsvStream(stream)) out.push(r);
  assert.deepEqual(out, [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('parseCsvStream: BOM UTF-8 al inicio se descarta', async () => {
  const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('h1,h2\nv1,v2\n')]);
  const stream = Readable.from([buf.toString('utf8')]);
  const out = [];
  for await (const r of parseCsvStream(stream)) out.push(r);
  assert.deepEqual(out[0], ['h1', 'h2']);
});

test('parseCsvStream: campo quoted multi-línea', async () => {
  const stream = Readable.from(['a,b\n"linea1\nlinea2",c\n']);
  const out = [];
  for await (const r of parseCsvStream(stream)) out.push(r);
  assert.deepEqual(out, [['a', 'b'], ['linea1\nlinea2', 'c']]);
});

test('parseCsvStream: maxRecords corta temprano', async () => {
  const lines = Array.from({ length: 100 }, (_, i) => `${i},x`).join('\n') + '\n';
  const stream = Readable.from([lines]);
  const out = [];
  for await (const r of parseCsvStream(stream, { maxRecords: 5 })) out.push(r);
  assert.equal(out.length, 5);
});

test('previewCsv: lee headers y N filas', async () => {
  const csvPath = join(workDir, 'p.csv');
  await writeFile(csvPath, 'h1;h2;h3\n1;2;3\n4;5;6\n7;8;9\n');
  const r = await previewCsv(csvPath, { rows: 2 });
  assert.deepEqual(r.headers, ['h1', 'h2', 'h3']);
  assert.equal(r.rows.length, 2);
  assert.equal(r.separator, ';');
});

test('countRows: cuenta filas excluyendo header por default', async () => {
  const csvPath = join(workDir, 'c.csv');
  await writeFile(csvPath, 'h\n1\n2\n3\n');
  assert.equal(await countRows(csvPath), 3);
});

test('summarizeCsv: retorna bytes, separador, headers, sample, totalRows', async () => {
  const csvPath = join(workDir, 's.csv');
  await writeFile(csvPath, 'a;b;c\n1;2;3\n4;5;6\n');
  const s = await summarizeCsv(csvPath);
  assert.equal(s.separator, ';');
  assert.deepEqual(s.headers, ['a', 'b', 'c']);
  assert.equal(s.totalRows, 2);
  assert.equal(s.sampleRows.length, 2);
  assert.ok(s.bytes > 0);
});

test('summarizeCsv: CSV con quoted fields y comas internas', async () => {
  const csvPath = join(workDir, 'q.csv');
  await writeFile(csvPath, 'desc,monto\n"servicio, alquiler",1000\n"otro",2000\n');
  const s = await summarizeCsv(csvPath);
  assert.equal(s.separator, ',');
  assert.equal(s.totalRows, 2);
  assert.deepEqual(s.sampleRows[0], ['servicio, alquiler', '1000']);
});
