import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Store } from '../src/core/db.mjs';
import { completeOccurrence, decorateEntity, listForDate, occursOn } from '../src/core/schedule.mjs';
import { createApp } from '../src/server/app.mjs';

const makeStore = () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-stage2-'));
  return { root, store: new Store(root).open() };
};

test('每天、每周、每月和自定义周期规则正确', () => {
  const daily = { date: '2026-10-20', recurrence: { freq: 'daily', interval: 2 } };
  assert.equal(occursOn(daily, '2026-10-22'), true);
  assert.equal(occursOn(daily, '2026-10-23'), false);

  const weekly = { date: '2026-10-19', recurrence: { freq: 'weekly', interval: 2, weekdays: [1, 4] } };
  assert.equal(occursOn(weekly, '2026-10-19'), true);
  assert.equal(occursOn(weekly, '2026-10-22'), true);
  assert.equal(occursOn(weekly, '2026-10-29'), false);

  const monthly = { date: '2026-01-31', recurrence: { freq: 'monthly', interval: 1 } };
  assert.equal(occursOn(monthly, '2026-02-28'), true);
  assert.equal(occursOn(monthly, '2026-03-31'), true);
  assert.equal(occursOn(monthly, '2026-04-30'), true);

  const custom = { date: '2026-10-01', recurrence: { freq: 'custom', unit: 'week', interval: 3 } };
  assert.equal(occursOn(custom, '2026-10-22'), true);
  assert.equal(occursOn(custom, '2026-10-15'), false);
});

test('重复事项只完成当天实例，不关闭整个系列', () => {
  const { root, store } = makeStore();
  try {
    const item = store.createEntity({
      module: 'study', type: 'review', title: '每日复习', date: '2026-10-23',
      recurrence: { freq: 'daily', interval: 1 },
    });
    completeOccurrence(store, item.id, '2026-10-23', '2026-10-23T10:00:00');
    assert.equal(listForDate(store, '2026-10-23').length, 0);
    assert.equal(listForDate(store, '2026-10-24').length, 1);
    assert.equal(store.getEntity(item.id).status, 'todo');
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('自动进度与手动进度同时保留', () => {
  const { root, store } = makeStore();
  try {
    const parent = store.createEntity({ module: 'thesis', type: 'chapter', title: '第一章', date: '2026-10-23' });
    const a = store.createEntity({ module: 'thesis', type: 'section', title: '小节 A', date: '2026-10-23', parentId: parent.id });
    store.createEntity({ module: 'thesis', type: 'section', title: '小节 B', date: '2026-10-23', parentId: parent.id });
    completeOccurrence(store, a.id, '2026-10-23', '2026-10-23T11:00:00');
    store.updateEntity(parent.id, { manualProgress: 40, progressNote: '导师建议继续补充' });
    const decorated = decorateEntity(store, store.getEntity(parent.id), '2026-10-23');
    assert.equal(decorated.autoProgress, 50);
    assert.equal(decorated.manualProgress, 40);
    assert.equal(decorated.effectiveProgress, 40);
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('事项 API 完成、消失、取消完成和进度更新', async () => {
  const { root, store } = makeStore();
  store.close();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  try {
    const created = await fetch(`http://127.0.0.1:${app.port}/api/entities`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module: 'today', type: 'task', title: '写测试', date: '2026-10-23' }),
    }).then((response) => response.json());
    const id = created.item.id;
    let today = await fetch(`http://127.0.0.1:${app.port}/api/today?date=2026-10-23`).then((response) => response.json());
    assert.equal(today.items.length, 1);

    await fetch(`http://127.0.0.1:${app.port}/api/entities/${id}/progress`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ manualProgress: 35, progressNote: '已完成基础部分' }),
    });
    await fetch(`http://127.0.0.1:${app.port}/api/entities/${id}/complete`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-23' }),
    });
    today = await fetch(`http://127.0.0.1:${app.port}/api/today?date=2026-10-23`).then((response) => response.json());
    assert.equal(today.items.length, 0);
    const moduleItems = await fetch(`http://127.0.0.1:${app.port}/api/entities?module=today`).then((response) => response.json());
    assert.equal(moduleItems.items[0].status, 'completed');
    assert.equal(moduleItems.items[0].manualProgress, 35);

    await fetch(`http://127.0.0.1:${app.port}/api/entities/${id}/uncomplete`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-23' }),
    });
    today = await fetch(`http://127.0.0.1:${app.port}/api/today?date=2026-10-23`).then((response) => response.json());
    assert.equal(today.items.length, 1);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});