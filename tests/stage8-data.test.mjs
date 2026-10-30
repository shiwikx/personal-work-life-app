import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { Store } from '../src/core/db.mjs';
import { createBackup, listBackups, restoreBackup, runAutoBackup, validateBackup } from '../src/core/backup.mjs';
import { createDataPackage, exportModuleCsv, exportModuleXls } from '../src/core/export.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage8-'));
async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  return { status: response.status, data: await response.json() };
}
const post = (base, path, body) => json(base, path, { method: 'POST', body: JSON.stringify(body || {}) });

test('手动备份、恢复和损坏备份保护形成闭环', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    app.store.setSetting('backupDir', join(root, 'backups'));
    await post(base, '/api/entities', { module: 'today', type: 'task', title: '备份前事项', date: '2026-10-23' });
    const backup = await post(base, '/api/backups/manual');
    assert.equal(backup.status, 201);
    assert.ok(existsSync(backup.data.item.path));
    const validated = validateBackup(readFileSync(backup.data.item.path));
    assert.equal(validated.manifest.format, 'personal-work-life-backup');

    await post(base, '/api/entities', { module: 'today', type: 'task', title: '恢复后应消失', date: '2026-10-24' });
    let entities = await json(base, '/api/entities?module=today');
    assert.equal(entities.data.items.length, 2);
    const restored = await post(base, '/api/backups/restore', { id: backup.data.item.id });
    assert.equal(restored.status, 200);
    assert.ok(existsSync(restored.data.safety.path));
    entities = await json(base, '/api/entities?module=today');
    assert.deepEqual(entities.data.items.map((item) => item.title), ['备份前事项']);
    const backups = await json(base, '/api/backups');
    assert.ok(backups.data.items.some((item) => item.kind === 'pre-restore'));

    const corrupt = join(root, 'backups', 'corrupt.zip');
    writeFileSync(corrupt, 'not-a-zip');
    const failed = await post(base, '/api/backups/restore', { path: corrupt });
    assert.equal(failed.status, 400);
    entities = await json(base, '/api/entities?module=today');
    assert.equal(entities.data.items.length, 1);
    assert.equal(entities.data.items[0].title, '备份前事项');
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('自动备份按天补做并遵守保留数量', () => {
  const root = makeRoot();
  const store = new Store(root).open();
  try {
    store.setSetting('backupDir', join(root, 'backups'));
    store.setSetting('backupRetention', 2);
    const first = runAutoBackup(store, new Date('2026-10-20T08:00:00'));
    assert.equal(first.skipped, false);
    const duplicate = runAutoBackup(store, new Date('2026-10-20T18:00:00'));
    assert.equal(duplicate.skipped, true);
    createBackup(store, { kind: 'auto', now: new Date('2026-10-21T08:00:00') });
    createBackup(store, { kind: 'auto', now: new Date('2026-10-22T08:00:00') });
    const records = listBackups(store).filter((item) => item.kind === 'auto');
    assert.equal(records.length, 2);
    assert.ok(records.every((item) => item.exists));
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('数据目录切换后数据完整且原目录保留', async () => {
  const root = makeRoot();
  const target = join(root, 'new-data-root');
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    app.store.setSetting('backupDir', join(root, 'backups'));
    await post(base, '/api/entities', { module: 'today', type: 'task', title: '切换前数据', date: '2026-10-23' });
    const switched = await post(base, '/api/data-directory', { path: target });
    assert.equal(switched.status, 200);
    assert.equal(switched.data.dataRoot, target);
    const entities = await json(base, '/api/entities?module=today');
    assert.equal(entities.data.items[0].title, '切换前数据');
    await post(base, '/api/entities', { module: 'today', type: 'task', title: '切换后数据', date: '2026-10-24' });
    await app.close();
    const reopened = new Store(target).open();
    assert.equal(reopened.listEntities({ module: 'today' }).length, 2);
    reopened.close();
    assert.ok(existsSync(join(root, 'app.sqlite')));
  } finally {
    try { await app.close(); } catch {}
    rmSync(root, { recursive: true, force: true });
  }
});

test('CSV、XLS 和完整数据包可导出并恢复验证', () => {
  const root = makeRoot();
  const store = new Store(root).open();
  try {
    store.setSetting('backupDir', join(root, 'backups'));
    store.createEntity({ module: 'today', type: 'task', title: '包含,逗号和"引号"', notes: '第一行\n第二行', date: '2026-10-23' });
    const csv = exportModuleCsv(store, 'today');
    assert.match(csv, /包含,逗号和""引号""/);
    assert.match(csv, /第一行/);
    const xls = exportModuleXls(store, 'today');
    assert.match(xls, /<Workbook/);
    assert.match(xls, /包含,逗号和&quot;引号&quot;/);
    const packageFile = createDataPackage(store);
    const validated = validateBackup(packageFile.buffer);
    assert.equal(validated.manifest.packageType, 'full-data-package');
    assert.ok(validated.files.has('exports/today.csv'));
    const emptyRoot = join(root, 'empty-restore');
    const target = new Store(emptyRoot).open();
    target.restoreDatabaseBytes(validated.database);
    assert.equal(target.listEntities({ module: 'today' })[0].title, '包含,逗号和"引号"');
    target.close();
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('设置和下载 API 返回可写状态、备份历史和各模块导出', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    app.store.setSetting('backupDir', join(root, 'backups'));
    const settings = await json(base, '/api/settings');
    assert.equal(settings.data.writable, true);
    const updated = await json(base, '/api/settings', { method: 'PUT', body: JSON.stringify({ autoBackup: false, backupRetention: 3, defaultReminderMinutes: 15, overlayTopMost: true }) });
    assert.equal(updated.data.settings.backupRetention, 3);
    await post(base, '/api/entities', { module: 'today', type: 'task', title: '导出事项', date: '2026-10-23' });
    const csv = await fetch(`${base}/api/exports/today?format=csv`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(await csv.text(), /导出事项/);
    const xls = await fetch(`${base}/api/exports/today?format=xls`);
    assert.match(await xls.text(), /Workbook/);
    const packageResponse = await fetch(`${base}/api/exports/package`);
    assert.equal(packageResponse.status, 200);
    const packageBuffer = Buffer.from(await packageResponse.arrayBuffer());
    assert.ok(validateBackup(packageBuffer).files.has('app.sqlite'));
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
