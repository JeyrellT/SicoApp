import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseYearMonth,
  formatYearMonth,
  enumerateYearMonths,
  addMonths,
  compareYearMonth,
  toYearMonthId,
  isCurrentMonth,
} from '../lib/dates.js';

test('parseYearMonth acepta yyyy-mm y yyyymm', () => {
  assert.deepEqual(parseYearMonth('2024-03'), { year: 2024, month: 3 });
  assert.deepEqual(parseYearMonth('202403'), { year: 2024, month: 3 });
  assert.deepEqual(parseYearMonth('2024/03'), { year: 2024, month: 3 });
});

test('parseYearMonth rechaza formato inválido', () => {
  assert.throws(() => parseYearMonth('2024-13'), /Mes fuera de rango/);
  assert.throws(() => parseYearMonth('1999-12'), /Año fuera de rango/);
  assert.throws(() => parseYearMonth('abc'), /Formato inválido/);
  assert.throws(() => parseYearMonth(''), /Formato inválido/);
});

test('formatYearMonth pad correcto', () => {
  assert.equal(formatYearMonth({ year: 2024, month: 3 }), '202403');
  assert.equal(formatYearMonth({ year: 2024, month: 12 }), '202412');
});

test('addMonths suma correctamente cruzando años', () => {
  assert.deepEqual(addMonths({ year: 2024, month: 11 }, 2), { year: 2025, month: 1 });
  assert.deepEqual(addMonths({ year: 2024, month: 1 }, -1), { year: 2023, month: 12 });
  assert.deepEqual(addMonths({ year: 2024, month: 6 }, 0), { year: 2024, month: 6 });
});

test('compareYearMonth ordena bien', () => {
  assert.equal(compareYearMonth({ year: 2024, month: 1 }, { year: 2024, month: 2 }), -1);
  assert.equal(compareYearMonth({ year: 2025, month: 1 }, { year: 2024, month: 12 }), 1);
  assert.equal(compareYearMonth({ year: 2024, month: 6 }, { year: 2024, month: 6 }), 0);
});

test('enumerateYearMonths produce rango cerrado-cerrado', () => {
  const got = enumerateYearMonths({ year: 2010, month: 1 }, { year: 2010, month: 4 });
  assert.deepEqual(got, ['201001', '201002', '201003', '201004']);
});

test('enumerateYearMonths cruza años', () => {
  const got = enumerateYearMonths({ year: 2023, month: 11 }, { year: 2024, month: 2 });
  assert.deepEqual(got, ['202311', '202312', '202401', '202402']);
});

test('enumerateYearMonths con mismo from/to retorna un único mes', () => {
  const got = enumerateYearMonths({ year: 2024, month: 6 }, { year: 2024, month: 6 });
  assert.deepEqual(got, ['202406']);
});

test('enumerateYearMonths from > to lanza', () => {
  assert.throws(
    () => enumerateYearMonths({ year: 2024, month: 6 }, { year: 2024, month: 5 }),
    /from .* > to/,
  );
});

test('toYearMonthId formato', () => {
  assert.equal(toYearMonthId(new Date('2024-03-15T12:00:00Z')), `2024${String(new Date('2024-03-15T12:00:00Z').getMonth() + 1).padStart(2, '0')}`);
});

test('isCurrentMonth detecta mes actual contra reloj fijo', () => {
  const now = new Date('2026-04-15T10:00:00Z');
  const ym = toYearMonthId(now);
  assert.equal(isCurrentMonth(ym, now), true);
  assert.equal(isCurrentMonth('190001', now), false);
});
