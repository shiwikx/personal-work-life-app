import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Store } from '../src/core/db.mjs';
import { completeOccurrence, listForDate } from '../src/core/schedule.mjs';
import { createApp } from '../src/server/app.mjs';
import { acquireSingleInstanceLock } from '../src/server/single-instance.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage9-'));

test('连续多天重复事项只在完成实例消失，跨刷新和重启保持状态', async () => {
  const root = makeRoot();
  let store = new Store(root).open();
  try {
    const item = store.createEntity({ module: 'work', type: 'work_task', title: '每日站会', date: '2026-10-19', scheduledTime: '09:30', recurrence: { freq: 'daily', interval: 1 } });
    completeOccurrence(store, item.id, '2026-10-21', '2026-10-21T09:30:00');
    for (let day = 19; day <= 25; day += 1) {
      const date = `2026-10-${day}`;
      const expected = day === 21 ? 0 : 1;
      assert.equal(listForDate(store, date).length, expected, date);
    }
    store.close();
    store = new Store(root).open();
    assert.equal(listForDate(store, '2026-10-21').length, 0);
    assert.equal(listForDate(store, '2026-10-22').length, 1);
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('今日计划与模块完成状态双向一致且重启后保留', async () => {
  const root = makeRoot();
  let app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  let base = `http://127.0.0.1:${app.port}`;
  try {
    const created = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'study', type: 'study_review', title: '复习数据库', date: '2026-10-23', reminderMinutes: 5 }) }).then((r) => r.json());
    const id = created.item.id;
    let today = await fetch(`${base}/api/today?date=2026-10-23`).then((r) => r.json());
    assert.equal(today.items.length, 1);
    await fetch(`${base}/api/entities/${id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-23' }) });
    today = await fetch(`${base}/api/today?date=2026-10-23`).then((r) => r.json());
    assert.equal(today.items.length, 0);
    const moduleItems = await fetch(`${base}/api/entities?module=study`).then((r) => r.json());
    assert.equal(moduleItems.items[0].status, 'completed');
    await app.close();
    app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
    base = `http://127.0.0.1:${app.port}`;
    const reopened = await fetch(`${base}/api/entities/${id}`).then((r) => r.json());
    assert.equal(reopened.item.status, 'completed');
  } finally {
    try { await app.close(); } catch {}
    rmSync(root, { recursive: true, force: true });
  }
});

test('首页返回模块摘要、下一条提醒和备份状态', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'development', type: 'dev_project', title: '项目 A', status: 'doing', manualProgress: 40 }) });
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'today', type: 'task', title: '今日提醒', date: '2026-10-23', scheduledTime: '23:00', reminderMinutes: 10 }) });
    const home = await fetch(`${base}/api/home?date=2026-10-23`).then((r) => r.json());
    assert.equal(home.counts.todayOpen, 1);
    assert.match(home.summary.development.detail, /个项目进行中/);
    assert.ok(home.nextReminder);
    assert.ok(Object.prototype.hasOwnProperty.call(home.backup, 'autoBackup'));
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('前端资源不依赖外部网络且不含删除功能入口', () => {
  const clientFiles = ['src/client/app.js', 'src/client/index.html', 'src/client/styles.css'];
  for (const file of clientFiles) {
    const content = readFileSync(join(process.cwd(), file), 'utf8');
    assert.doesNotMatch(content, /https?:\/\//, file);
    assert.doesNotMatch(content, /@import\s+url|fonts\.googleapis|cdn\./i, file);
  }
  const app = readFileSync(join(process.cwd(), 'src/client/app.js'), 'utf8');
  for (const removed of ['里程碑', '错题', '文献资料', '公司名', '岗位名', '投递渠道', '目标清单']) {
    assert.ok(!app.includes(removed), removed);
  }
});

test('单实例锁阻止第二个后台实例', () => {
  const root = makeRoot();
  const old = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = root;
  try {
    const first = acquireSingleInstanceLock();
    assert.equal(first.acquired, true);
    const second = acquireSingleInstanceLock();
    assert.equal(second.acquired, false);
    first.release();
    const third = acquireSingleInstanceLock();
    assert.equal(third.acquired, true);
    third.release();
  } finally {
    if (old === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = old;
    rmSync(root, { recursive: true, force: true });
  }
});

test('Windows 便携包脚本包含内置运行时、启动和停止入口', () => {
  const script = readFileSync(join(process.cwd(), 'scripts', 'package-windows.mjs'), 'utf8');
  assert.match(script, /process\.execPath/);
  assert.match(script, /runtime/);
  assert.match(script, /启动个人工作生活APP\.cmd/);
  assert.match(script, /停止个人工作生活APP\.cmd/);
  assert.match(script, /createZip/);
});
