import { join } from 'path';
import { mkdirSync, statSync, renameSync, unlinkSync, existsSync } from 'fs';
import pino from 'pino';

const LOG_DIR = join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'logs');
const LOG_FILE = join(LOG_DIR, 'mcp-server.log');
const MAX_RESPONSE_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

function rotateIfNeeded(): void {
  try {
    if (!existsSync(LOG_FILE)) return;
    const { size } = statSync(LOG_FILE);
    if (size < MAX_FILE_SIZE) return;

    for (let i = MAX_FILES - 1; i >= 1; i--) {
      const older = `${LOG_FILE}.${i}`;
      const newer = i === 1 ? LOG_FILE : `${LOG_FILE}.${i - 1}`;
      if (existsSync(newer)) {
        if (i === MAX_FILES - 1 && existsSync(older)) unlinkSync(older);
        renameSync(newer, older);
      }
    }
  } catch {
    // Best-effort rotation — don't crash the server
  }
}

const noop = () => {};
const noopLogger = { info: noop, error: noop, warn: noop, debug: noop } as unknown as pino.Logger;

let _logger: pino.Logger | null = null;
let _enabled = true;

export function initLogger(enabled: boolean): void {
  _enabled = enabled;
  if (!enabled) {
    _logger = noopLogger;
    return;
  }
  mkdirSync(LOG_DIR, { recursive: true });
  rotateIfNeeded();
  const dest = pino.destination({ dest: LOG_FILE, sync: true });
  _logger = pino({ level: 'info' }, dest);
}

export function getLogger(): pino.Logger {
  if (!_logger) {
    initLogger(_enabled);
  }
  return _logger!;
}

export function isEnabled(): boolean {
  return _enabled;
}

export function truncate(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (str.length <= MAX_RESPONSE_LENGTH) return str;
  return str.slice(0, MAX_RESPONSE_LENGTH) + '...[truncated]';
}
