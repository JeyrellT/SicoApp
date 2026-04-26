import { test } from 'node:test';
import assert from 'node:assert/strict';

import { withRetry, isTransient, sleep } from '../lib/retry.js';

test('isTransient detecta códigos de red', () => {
  assert.equal(isTransient({ code: 'ECONNRESET' }), true);
  assert.equal(isTransient({ code: 'ETIMEDOUT' }), true);
  assert.equal(isTransient({ code: 'ENOENT' }), false);
});

test('isTransient detecta status 5xx y 408/429', () => {
  assert.equal(isTransient({ statusCode: 503 }), true);
  assert.equal(isTransient({ statusCode: 429 }), true);
  assert.equal(isTransient({ statusCode: 404 }), false);
  assert.equal(isTransient({ statusCode: 401 }), false);
});

test('withRetry no reintenta error no transitorio', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        const e = new Error('boom');
        e.statusCode = 404;
        throw e;
      },
      { maxAttempts: 5, baseMs: 1 },
    ),
    /boom/,
  );
  assert.equal(calls, 1);
});

test('withRetry reintenta error transitorio y converge', async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) {
        const e = new Error('temp');
        e.statusCode = 503;
        throw e;
      }
      return 'ok';
    },
    { maxAttempts: 5, baseMs: 1 },
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry agota intentos y lanza el último error', async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls++;
        const e = new Error('persistente');
        e.statusCode = 503;
        throw e;
      },
      { maxAttempts: 3, baseMs: 1 },
    ),
    /persistente/,
  );
  assert.equal(calls, 3);
});

test('sleep espera al menos N ms', async () => {
  const start = Date.now();
  await sleep(20);
  assert.ok(Date.now() - start >= 18);
});
