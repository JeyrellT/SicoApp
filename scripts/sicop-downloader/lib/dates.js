/**
 * Utilidades de fechas para enumerar meses (yyyymm) en un rango.
 * Sin dependencias externas. Usa zona horaria local del sistema.
 */

const MONTHS_PER_YEAR = 12;

/**
 * Convierte un Date al ID yyyymm (string de 6 caracteres).
 * @param {Date} date
 * @returns {string}
 */
export function toYearMonthId(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}${mm}`;
}

/**
 * Parsea un string "yyyy-mm" o "yyyymm" a {year, month}.
 * Lanza si el formato o rango es inválido.
 * @param {string} input
 * @returns {{year: number, month: number}}
 */
export function parseYearMonth(input) {
  if (typeof input !== 'string') {
    throw new TypeError(`Se esperaba string, se recibió ${typeof input}`);
  }
  const cleaned = input.trim().replace('-', '').replace('/', '');
  if (!/^\d{6}$/.test(cleaned)) {
    throw new Error(`Formato inválido: "${input}". Use yyyy-mm o yyyymm.`);
  }
  const year = Number(cleaned.slice(0, 4));
  const month = Number(cleaned.slice(4, 6));
  if (year < 2000 || year > 2100) {
    throw new RangeError(`Año fuera de rango razonable: ${year}`);
  }
  if (month < 1 || month > MONTHS_PER_YEAR) {
    throw new RangeError(`Mes fuera de rango: ${month}`);
  }
  return { year, month };
}

/**
 * Convierte {year, month} a yyyymm.
 * @param {{year: number, month: number}} ym
 * @returns {string}
 */
export function formatYearMonth({ year, month }) {
  return `${year}${String(month).padStart(2, '0')}`;
}

/**
 * Compara dos {year, month}. -1 si a<b, 0 si igual, 1 si a>b.
 */
export function compareYearMonth(a, b) {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  return 0;
}

/**
 * Suma `n` meses a {year, month} y retorna nuevo objeto.
 */
export function addMonths({ year, month }, n) {
  const total = (year * MONTHS_PER_YEAR + (month - 1)) + n;
  return {
    year: Math.floor(total / MONTHS_PER_YEAR),
    month: (total % MONTHS_PER_YEAR) + 1,
  };
}

/**
 * Enumera todos los yyyymm desde `from` (incluyente) hasta `to` (incluyente).
 * @param {{year: number, month: number}} from
 * @param {{year: number, month: number}} to
 * @returns {string[]} array de yyyymm
 */
export function enumerateYearMonths(from, to) {
  if (compareYearMonth(from, to) > 0) {
    throw new RangeError(
      `from (${formatYearMonth(from)}) > to (${formatYearMonth(to)})`,
    );
  }
  const result = [];
  let cursor = { ...from };
  while (compareYearMonth(cursor, to) <= 0) {
    result.push(formatYearMonth(cursor));
    cursor = addMonths(cursor, 1);
  }
  return result;
}

/**
 * Retorna el yyyymm del mes actual (según fecha del sistema).
 */
export function currentYearMonth() {
  return toYearMonthId(new Date());
}

/**
 * Retorna true si yyyymm corresponde al mes calendario en curso.
 */
export function isCurrentMonth(yyyymm, now = new Date()) {
  return yyyymm === toYearMonthId(now);
}
