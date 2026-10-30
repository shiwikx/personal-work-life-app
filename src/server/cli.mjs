import { spawn } from 'node:child_process';
import { createApp } from './app.mjs';
import { resolveDataRoot, writeBootstrapConfig } from './paths.mjs';
import { runAutoBackup } from '../core/backup.mjs';
import { acquireSingleInstanceLock } from './single-instance.mjs';

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const testMode = args.includes('--test-mode');
const dataRoot = resolveDataRoot({
  cliDataDir: valueAfter('--data-dir'),
  envDataDir: process.env.PERSONAL_APP_DATA_DIR,
  testMode,
});
const port = Number(valueAfter('--port') || process.env.PERSONAL_APP_PORT || 4123);
const instanceLock = testMode ? { acquired: true, release() {} } : acquireSingleInstanceLock();
if (!instanceLock.acquired) {
  console.error('个人工作生活 APP 已在运行，未启动重复实例。');
  process.exit(0);
}

let app;
try {
  app = await createApp({ dataRoot, port });
} catch (error) {
  instanceLock.release();
  throw error;
}

if (!testMode) {
  try { runAutoBackup(app.store); } catch (error) { console.error('自动备份失败：' + (error instanceof Error ? error.message : String(error))); }
}
if (!testMode) writeBootstrapConfig({ dataRoot });
console.log(`PersonalWorkLifeApp running at http://127.0.0.1:${app.port}`);
console.log(`Data directory: ${dataRoot}`);
if (args.includes('--open') && !testMode) {
  const url = `http://127.0.0.1:${app.port}`;
  spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

const shutdown = async () => {
  await app.close();
  instanceLock.release();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
