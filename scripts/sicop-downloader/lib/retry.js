/**
 * Retry con backoff exponencial y jitter, sin dependencias.
 *
 * - Reintenta solo errores transitorios (network, 5xx, 408, 429).
 * - 4xx (excepto 408/429) no se reintentan: son errores deterministas.
 */

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Determina si un error es transitorio y vale la pena reintentar.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isTransient(err) {
  if (!err) return false;
  if (err.code) {
    const transientCodes = [
      'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND',
      'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH',
    ];
    if (transientCodes.includes(err.code)) return true;
  }
  if (typeof err.statusCode === 'number') {
    return TRANSIENT_HTTP_STATUSES.has(err.statusCode);
  }
  return false;
}

/**
 * Pausa async.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta `fn` con retries. Backoff exponencial: base * 2^n + jitter aleatorio.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} opts
 * @param {number} [opts.maxAttempts=5]
 * @param {number} [opts.baseMs=1000]
 * @param {number} [opts.maxMs=30000]
 * @param {(err: unknown) => boolean} [opts.shouldRetry]
 * @param {(info: {attempt: number, delayMs: number, err: unknown}) => void} [opts.onRetry]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const {
    maxAttempts = 5,
    baseMs = 1000,
    maxMs = 30000,
    shouldRetry = isTransient,
    onRetry = () => {},
  } = opts;

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err;
      }
      const exp = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      const jitter = Math.random() * (exp * 0.25);
      const delayMs = Math.floor(exp + jitter);
      onRetry({ attempt, delayMs, err });
      await sleep(delayMs);
    }
  }
  throw lastErr;
}
