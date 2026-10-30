import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

export const DEFAULT_DATA_ROOT = 'D:\\个人工作生活APP\\data';

export function bootstrapConfigPath() {
  const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  return join(base, 'PersonalWorkLifeApp', 'bootstrap.json');
}

export function readBootstrapConfig() {
  const path = bootstrapConfigPath();
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

export function writeBootstrapConfig(config) {
  const path = bootstrapConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
  return path;
}

export function resolveDataRoot({ cliDataDir, envDataDir, testMode = false } = {}) {
  if (cliDataDir) return resolve(cliDataDir);
  if (envDataDir) return resolve(envDataDir);
  if (testMode) return resolve(process.cwd(), 'data-test');
  const boot = readBootstrapConfig();
  return resolve(boot.dataRoot || DEFAULT_DATA_ROOT);
}

export function ensureDirectory(path) {
  mkdirSync(path, { recursive: true });
  return path;
}