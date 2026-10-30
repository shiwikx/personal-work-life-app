import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage5-'));
async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  return { status: response.status, data: await response.json() };
}
const post = (base, path, body) => json(base, path, { method: 'POST', body: JSON.stringify(body) });

test('开发计划支持项目、功能、缺陷、日志、计时和手动补录统计', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const project = await post(base, '/api/entities', { module: 'development', type: 'dev_project', title: '个人工作生活 APP', status: 'doing', manualProgress: 60 });
    const feature = await post(base, '/api/entities', { module: 'development', type: 'dev_feature', title: '今日计划', parentId: project.data.item.id, status: 'doing', manualProgress: 50 });
    await post(base, '/api/entities', { module: 'development', type: 'dev_feature', title: '提醒调度', parentId: project.data.item.id, status: 'completed' });
    await post(base, '/api/entities', { module: 'development', type: 'dev_defect', title: '重复提醒', parentId: project.data.item.id, status: 'closed', payload: { severity: 'high', resolution: '已修复' } });
    await post(base, '/api/entities', { module: 'development', type: 'dev_log', title: '完成项目骨架', date: '2026-10-23', payload: { content: '建立数据库与 API', minutes: 90 } });
    const manual = await post(base, '/api/development/time', { title: '代码审查', minutes: 45, linkedEntityId: project.data.item.id, date: '2026-10-23' });
    assert.equal(manual.status, 201);
    const started = await post(base, `/api/timer/development/start`, { entityId: feature.data.item.id, mode: 'stopwatch' });
    assert.equal(started.data.timer.running, true);
    const stopped = await post(base, `/api/timer/development/stop`, {});
    assert.equal(stopped.status, 200);

    const stats = await json(base, '/api/development/stats?date=2026-10-23');
    assert.equal(stats.status, 200);
    assert.equal(stats.data.totals.projects, 1);
    assert.equal(stats.data.totals.features, 2);
    assert.equal(stats.data.totals.openDefects, 0);
    assert.equal(stats.data.projects[0].featureCompleted, 1);
    assert.ok(stats.data.projects[0].totalSeconds >= 2700);
    assert.ok(stats.data.projects[0].todaySeconds >= 2700);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('秋招每日事项进入今日计划，投递与笔试面试安排可保存', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const task = await post(base, '/api/entities', { module: 'autumn', type: 'autumn_task', title: '刷两道算法题', date: '2026-10-23', scheduledTime: '19:30', reminderMinutes: 15, recurrence: { freq: 'daily', interval: 1 } });
    assert.equal(task.status, 201);
    const application = await post(base, '/api/entities', {
      module: 'autumn', type: 'autumn_application', title: '第一场流程', date: '2026-10-23',
      payload: { applicationStatus: 'interview', examAt: '2026-10-24T19:00', interviewAt: '2026-10-26T14:00', format: '线上', notes: '准备项目介绍', review: '表达需更精炼' },
    });
    assert.equal(application.data.item.payload.review, '表达需更精炼');
    const today = await json(base, '/api/today?date=2026-10-23');
    assert.ok(today.data.items.some((item) => item.title === '刷两道算法题'));
    const summary = await json(base, '/api/autumn/summary?date=2026-10-23');
    assert.equal(summary.data.applications.length, 1);
    assert.equal(summary.data.upcoming.length, 2);
    assert.equal(summary.data.nextExamOrInterview.kind, 'exam');
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('开发与秋招页面展示必要功能且不包含已删除入口', { skip: !findBrowser() }, async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const development = await dumpDom(`${base}/#/development`);
    assert.equal(development.status, 0, development.stderr);
    assert.match(development.stdout, /项目整体进度与时间统计/);
    assert.match(development.stdout, /功能拆分/);
    assert.match(development.stdout, /缺陷清单/);
    assert.match(development.stdout, /开发日志/);
    assert.match(development.stdout, /手动补录时间/);
    assert.doesNotMatch(development.stdout, /里程碑/);

    const autumn = await dumpDom(`${base}/#/autumn`);
    assert.equal(autumn.status, 0, autumn.stderr);
    assert.match(autumn.stdout, /每日秋招事项/);
    assert.match(autumn.stdout, /投递记录/);
    assert.match(autumn.stdout, /面试复盘/);
    assert.doesNotMatch(autumn.stdout, /公司名|岗位名|投递渠道|目标清单/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
