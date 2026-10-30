import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { localDateTimeString, localDateString } from './date.mjs';
import { createZip, readZip } from './archive.mjs';

function timestampForFile(date = new Date()) {
  return localDateTimeString(date).replace(/[-:T]/g, '').slice(0, 14);
}

export function backupDirectory(store, kind = 'manual') {
  const root = store.getSetting('backupDir') || join(store.dataRoot, '..', 'backups');
  return join(root, kind);
}

function pruneBackups(store, kind) {
  if (kind !== 'auto') return [];
  const retention = Math.max(1, Number(store.getSetting('backupRetention', 7)));
  const records = store.listBackupRecords(1000).filter((item) => item.kind === kind && item.status === 'success');
  const stale = records.slice(retention);
  for (const record of stale) {
    try { rmSync(record.path, { force: true }); } catch {}
    store.deleteBackupRecord(record.id);
  }
  return stale;
}

export function createBackup(store, { kind = 'manual', now = new Date(), message = '' } = {}) {
  const dir = backupDirectory(store, kind);
  mkdirSync(dir, { recursive: true });
  const createdAt = localDateTimeString(now);
  const path = join(dir, `backup-${timestampForFile(now)}-${randomUUID().slice(0, 8)}.zip`);
  const dbBytes = store.readDatabaseBytes();
  const settings = store.getSettings();
  const manifest = {
    format: 'personal-work-life-backup',
    version: 1,
    createdAt,
    kind,
    dataRoot: store.dataRoot,
    message,
  };
  const zip = createZip([
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
    { name: 'settings.json', data: Buffer.from(JSON.stringify(settings, null, 2), 'utf8') },
    { name: 'app.sqlite', data: dbBytes },
  ], now);
  writeFileSync(path, zip);
  const record = store.createBackupRecord({ kind, path, createdAt, status: 'success', message });
  store.setSetting('lastBackupAt', createdAt);
  store.setSetting('lastBackupStatus', 'success');
  store.setSetting('lastBackupPath', path);
  pruneBackups(store, kind);
  return record;
}

export function runAutoBackup(store, now = new Date()) {
  if (!store.getSetting('autoBackup', true)) return { skipped: true, reason: 'disabled' };
  const today = localDateString(now);
  if (store.getSetting('lastAutoBackupDate', '') === today) return { skipped: true, reason: 'already-done', date: today };
  try {
    const record = createBackup(store, { kind: 'auto', now, message: '每日自动备份' });
    store.setSetting('lastAutoBackupDate', today);
    return { skipped: false, record };
  } catch (error) {
    store.setSetting('lastBackupAt', localDateTimeString(now));
    store.setSetting('lastBackupStatus', 'failed');
    store.createBackupRecord({ kind: 'auto', createdAt: localDateTimeString(now), status: 'failed', message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export function validateBackup(buffer) {
  const files = readZip(buffer);
  const manifestBytes = files.get('manifest.json');
  const database = files.get('app.sqlite');
  if (!manifestBytes) throw new Error('备份包缺少 manifest.json');
  if (!database) throw new Error('备份包缺少 app.sqlite');
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { throw new Error('备份 manifest 无法解析'); }
  if (manifest.format !== 'personal-work-life-backup' || manifest.version !== 1) throw new Error('不支持的备份格式');
  return { files, manifest, database };
}

export function restoreBackup(store, backupPathOrId) {
  const record = store.listBackupRecords(1000).find((item) => item.id === backupPathOrId || item.path === backupPathOrId);
  const path = record?.path || backupPathOrId;
  if (!path || !existsSync(path)) throw new Error('备份文件不存在');
  const backup = validateBackup(readFileSync(path));
  const safety = createBackup(store, { kind: 'pre-restore', message: '恢复前自动安全备份' });
  try {
    store.restoreDatabaseBytes(backup.database);
    store.createBackupRecord({ id: safety.id, kind: safety.kind, path: safety.path, createdAt: safety.createdAt, status: safety.status, message: safety.message });
    store.setSetting('lastRestoreAt', localDateTimeString());
    store.setSetting('lastRestoreStatus', 'success');
    store.setSetting('lastRestoreSource', path);
    return { record, safety, manifest: backup.manifest };
  } catch (error) {
    store.setSetting('lastRestoreAt', localDateTimeString());
    store.setSetting('lastRestoreStatus', 'failed');
    store.setSetting('lastRestoreError', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export function listBackups(store) {
  return store.listBackupRecords(1000).map((item) => ({ ...item, exists: Boolean(item.path && existsSync(item.path)) }));
}


