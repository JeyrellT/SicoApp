/**
 * Logger minimalista: consola + archivo (append). Niveles debug/info/warn/error.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function nowIso() {
  return new Date().toISOString();
}

function format(level, msg, meta) {
  const base = `[${nowIso()}] [${level.toUpperCase()}] ${msg}`;
  if (!meta || Object.keys(meta).length === 0) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} [meta no serializable]`;
  }
}

export function createLogger({ level = 'info', filePath = null, quiet = false } = {}) {
  const minLevel = LEVELS[level] ?? LEVELS.info;
  let fileReady = false;

  async function ensureFile() {
    if (!filePath || fileReady) return;
    await mkdir(dirname(filePath), { recursive: true });
    fileReady = true;
  }

  async function emit(lvl, msg, meta) {
    if (LEVELS[lvl] < minLevel) return;
    const line = format(lvl, msg, meta);
    if (!quiet) {
      const stream = lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout;
      stream.write(line + '\n');
    }
    if (filePath) {
      try {
        await ensureFile();
        await appendFile(filePath, line + '\n', 'utf8');
      } catch {
        // No bloqueamos logging por errores en archivo
      }
    }
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
  };
}
