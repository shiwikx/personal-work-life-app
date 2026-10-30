import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { buildWorkReport } from '../src/core/reports.mjs';
import { Store } from '../src/core/db.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage6-'));
async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  return { status: response.status, data: await response.json() };
}
const post = (base, path, body) => json(base, path, { method: 'POST', body: JSON.stringify(body) });

test('工作任务、会议、进展和日志可持久化并生成日报周报', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    await post(base, '/api/entities', { module: 'work', type: 'work_task', title: '提交周报', date: '2026-10-23', priority: 3, status: 'completed', payload: { project: '内部工具' } });
    await post(base, '/api/entities', { module: 'work', type: 'work_task', title: '修复报表', date: '2026-10-23', priority: 2, status: 'doing', payload: { project: '内部工具' } });
    await post(base, '/api/entities', { module: 'work', type: 'work_meeting', title: '项目例会', date: '2026-10-23', scheduledTime: '10:00', reminderMinutes: 10, payload: { location: '线上' } });
    await post(base, '/api/entities', { module: 'work', type: 'work_progress', title: '报表修复进展', date: '2026-10-23', payload: { content: '定位到聚合问题', nextStep: '补充测试' } });
    await post(base, '/api/entities', { module: 'work', type: 'work_log', title: '项目工作', date: '2026-10-23', payload: { content: '定位问题', minutes: 80 } });
    const daily = await post(base, '/api/work/reports/generate', { periodType: 'daily', date: '2026-10-23', manualNote: '明日继续' });
    assert.equal(daily.status, 201);
    assert.match(daily.data.item.payload.generatedText, /提交周报/);
    assert.match(daily.data.item.payload.generatedText, /修复报表/);
    assert.match(daily.data.item.payload.generatedText, /80 分钟/);
    assert.equal(daily.data.item.payload.manualNote, '明日继续');
    const weekly = await post(base, '/api/work/reports/generate', { periodType: 'weekly', date: '2026-10-23' });
    assert.equal(weekly.data.item.payload.from, '2026-10-19');
    assert.match(weekly.data.item.payload.generatedText, /项目例会/);
    const reports = await json(base, '/api/work/reports');
    assert.equal(reports.data.items.length, 2);
    const updated = await json(base, `/api/work/reports/${daily.data.item.id}`, { method: 'PUT', body: JSON.stringify({ manualNote: '手动修改后的补充' }) });
    assert.equal(updated.data.item.payload.manualNote, '手动修改后的补充');
    const today = await json(base, '/api/today?date=2026-10-23');
    assert.ok(today.data.items.some((item) => item.title === '项目例会'));
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('日报统计边界包含本周日期并排除其他周事项', () => {
  const root = makeRoot();
  const store = new Store(root).open();
  try {
    store.createEntity({ module: 'work', type: 'work_task', title: '本周任务', date: '2026-10-19', status: 'completed' });
    store.createEntity({ module: 'work', type: 'work_task', title: '下周任务', date: '2026-10-26', status: 'completed' });
    const report = buildWorkReport(store, { periodType: 'weekly', date: '2026-10-25' });
    assert.equal(report.items.tasks.length, 1);
    assert.equal(report.counts.completed, 1);
  } finally {
    store.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('工作计划页面展示任务、会议、日志和日报周报入口', { skip: !findBrowser() }, async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const page = await dumpDom(`${base}/#/work`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /工作任务/);
    assert.match(page.stdout, /会议安排/);
    assert.match(page.stdout, /进展记录/);
    assert.match(page.stdout, /工作日志/);
    assert.match(page.stdout, /生成日报/);
    assert.match(page.stdout, /生成周报/);
    assert.match(page.stdout, /最高优先级事项/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
