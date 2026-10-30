import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Store } from '../src/core/db.mjs';
import { isDndNow, listDueReminders, markReminderNotified, snoozeReminder } from '../src/core/reminders.mjs';
import { ReminderScheduler } from '../src/server/desktop.mjs';
import { createApp } from '../src/server/app.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage7-'));
async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  return { status: response.status, data: await response.json() };
}

test('提醒按提前分钟计算、去重并可稍后提醒', () => {
  const root = makeRoot();
  const store = new Store(root).open();
  try {
    const reminder = store.createEntity({ module: 'today', type: 'task', title: '提交材料', date: '2026-10-23', scheduledTime: '10:00', reminderMinutes: 15 });
    assert.equal(listDueReminders(store, new Date('2026-10-23T09:44:00')).length, 0);
    const due = listDueReminders(store, new Date('2026-10-23T09:45:00'));
    assert.equal(due.length, 1);
    assert.equal(due[0].entityId, reminder.id);
    markReminderNotified(store, due[0], new Date('2026-10-23T09:45:00'));
    assert.equal(listDueReminders(store, new Date('2026-10-23T09:46:00')).length, 0);
    snoozeReminder(store, reminder.id, '2026-10-23', 10, new Date('2026-10-23T09:45:00'));
    assert.equal(listDueReminders(store, new Date('2026-10-23T09:50:00')).length, 0);
    assert.equal(listDueReminders(store, new Date('2026-10-23T09:55:00')).length, 1);
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('调度器只发送一次通知并遵守免打扰时段', () => {
  const root = makeRoot();
  const store = new Store(root).open();
  try {
    assert.equal(isDndNow({ dndStart: '23:00', dndEnd: '07:00' }, new Date('2026-10-23T23:30:00')), true);
    assert.equal(isDndNow({ dndStart: '23:00', dndEnd: '07:00' }, new Date('2026-10-23T12:00:00')), false);
    store.createEntity({ module: 'today', type: 'task', title: '提醒一次', date: '2026-10-23', scheduledTime: '12:00', reminderMinutes: 0 });
    const delivered = [];
    const scheduler = new ReminderScheduler(store, { notifier: (item) => delivered.push(item), checkOnStart: false });
    const first = scheduler.check(new Date('2026-10-23T12:00:01'));
    const second = scheduler.check(new Date('2026-10-23T12:01:00'));
    assert.equal(first.delivered, 1);
    assert.equal(second.delivered, 0);
    assert.equal(delivered.length, 1);
    store.setSetting('dndStart', '12:00');
    store.setSetting('dndEnd', '13:00');
    store.createEntity({ module: 'today', type: 'task', title: '免打扰事项', date: '2026-10-23', scheduledTime: '12:20', reminderMinutes: 0 });
    assert.equal(scheduler.check(new Date('2026-10-23T12:21:00')).dnd, true);
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('提醒 API 支持查询、补发和稍后提醒，秋招面试安排也会进入今日计划', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    app.scheduler.notifier = () => {};
    const application = await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'autumn', type: 'autumn_application', title: '流程 A', date: '2026-10-20', reminderMinutes: 10, payload: { interviewAt: '2026-10-23T14:00', format: '线上' } }) });
    const today = await json(base, '/api/today?date=2026-10-23');
    assert.ok(today.data.items.some((item) => item.title.includes('面试') && item.id === application.data.item.id));
    const due = await json(base, '/api/reminders/due?now=2026-10-23T13:50:00');
    assert.equal(due.data.items.length, 1);
    const checked = await json(base, '/api/reminders/check', { method: 'POST', body: JSON.stringify({ now: '2026-10-23T13:51:00' }) });
    assert.equal(checked.data.delivered, 1);
    const duplicate = await json(base, '/api/reminders/check', { method: 'POST', body: JSON.stringify({ now: '2026-10-23T13:52:00' }) });
    assert.equal(duplicate.data.delivered, 0);
    const snoozed = await json(base, `/api/entities/${application.data.item.id}/snooze`, { method: 'POST', body: JSON.stringify({ date: '2026-10-23', minutes: 10 }) });
    assert.equal(snoozed.status, 200);
    assert.ok(snoozed.data.item.snoozedUntil);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('桌面助手脚本包含托盘、置顶、拖动、收起和快捷完成', () => {
  const script = readFileSync(join(process.cwd(), 'scripts', 'desktop-helper.ps1'), 'utf8');
  assert.match(script, /NotifyIcon/);
  assert.match(script, /TopMost = \$true/);
  assert.match(script, /Add_MouseMove/);
  assert.match(script, /expandedHeight/);
  assert.match(script, /complete/);
  assert.match(script, /显示今日事项/);
});
