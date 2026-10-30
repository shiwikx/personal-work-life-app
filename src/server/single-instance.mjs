import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { bootstrapConfigPath } from './paths.mjs';

export function acquireSingleInstanceLock() {
  const lockPath = join(dirname(bootstrapConfigPath()), 'app.lock');
  if (existsSync(lockPath)) {
    try {
    mkdirSync(dirname(lockPath), { recursive: true });
      const pid = Number(readFileSync(lockPath, 'utf8').trim());
      if (pid > 0) {
        process.kill(pid, 0);
        return { acquired: false, pid, lockPath, release() {} };
      }
    } catch {
      try {
    mkdirSync(dirname(lockPath), { recursive: true }); rmSync(lockPath, { force: true }); } catch {}
    }
  }
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
    const fd = openSync(lockPath, 'wx');
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return {
      acquired: true,
      pid: process.pid,
      lockPath,
      release() { try { rmSync(lockPath, { force: true }); } catch {} },
    };
  } catch (error) {
    return { acquired: false, pid: null, lockPath, error, release() {} };
  }
}


