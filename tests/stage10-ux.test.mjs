import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { addDays, localDateString } from '../src/core/date.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');

test('问题1：页面视觉优化，悬浮窗支持半透明和拖拽缩放', () => {
  const css = read('src/client/styles.css');
  const overlay = read('scripts/desktop-helper.ps1');
  assert.match(css, /backdrop-filter: blur\(12px\)/);
  assert.match(css, /button:focus-visible/);
  assert.match(overlay, /\$form\.Opacity = 0\.94/);
  assert.match(overlay, /Cursors\]::SizeNWSE/);
  assert.match(overlay, /resizeStart/);
  assert.match(overlay, /\$form\.Width = \[Math\]::Max\(300/);
  assert.match(overlay, /\$form\.Height = \[Math\]::Max\(120/);
});

test('问题2：优先级使用普通、低、中、高、紧急五级明确标识', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-priority-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'work', type: 'work_task', title: '高优先级任务', priority: 3, date: '2026-10-23' }) });
    const page = await dumpDom(`${base}/#/work`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /P3 · 高/);
    assert.match(page.stdout, /P4 · 紧急/);
    assert.match(page.stdout, /P2 · 中/);
    assert.match(page.stdout, /P1 · 低/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('问题3：完成事项在所属模块进入已完成存档', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-archive-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const created = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'study', type: 'study_review', title: '已完成的复习任务', date: '2026-10-23' }) }).then((response) => response.json());
    await fetch(`${base}/api/entities/${created.item.id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-23' }) });
    const page = await dumpDom(`${base}/#/study`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /已完成存档 · 1 条/);
    assert.match(page.stdout, /已完成的复习任务/);
    assert.match(page.stdout, /class="completed-archive"/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('问题4：今日事项添加表单使用多行可见字段', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-today-form-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const page = await dumpDom(`${base}/#/today`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /class="today-task-form"/);
    assert.match(page.stdout, /class="form-grid today-task-grid"/);
    assert.match(page.stdout, /事项标题/);
    assert.match(page.stdout, /计划时间/);
    assert.match(page.stdout, /优先级/);
    assert.match(page.stdout, /重复规则/);
    assert.match(page.stdout, /提前提醒（分钟）/);
    assert.match(page.stdout, /添加今日事项/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('问题5：悬浮窗显示并实时刷新学习计时', () => {
  const overlay = read('scripts/desktop-helper.ps1');
  assert.match(overlay, /\$studyTimer\.Text = "学习计时 --:--:--"/);
  assert.match(overlay, /\/api\/timer\/study/);
  assert.match(overlay, /function Refresh-StudyTimer/);
  assert.match(overlay, /\$clockTimer\.Interval = 1000/);
  assert.match(overlay, /Start-Process "\$ApiBase\/#\/study"/);
  assert.equal((overlay.match(/function Refresh-StudyTimer/g) || []).length, 1);
});

test('问题6：首页返回并展示总进度条', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-overall-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const first = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'today', type: 'task', title: '完成项', date: '2026-10-23' }) }).then((response) => response.json());
    const second = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'today', type: 'task', title: '半进度项', date: '2026-10-23' }) }).then((response) => response.json());
    await fetch(`${base}/api/entities/${first.item.id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-23' }) });
    await fetch(`${base}/api/entities/${second.item.id}/progress`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ manualProgress: 50 }) });
    const home = await fetch(`${base}/api/home?date=2026-10-23`).then((response) => response.json());
    assert.equal(home.overallProgress.percent, 75);
    assert.equal(home.overallProgress.total, 2);
    assert.equal(home.overallProgress.completed, 1);
    const page = await dumpDom(`${base}/#/`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /总进度/);
    assert.match(page.stdout, /overall-progress-bar/);
    assert.match(page.stdout, /75%/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});


test('问题7：新增笔试或面试安排后下一场自动更新', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-autumn-next-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  const today = localDateString();
  const tomorrow = addDays(today, 1);
  const later = addDays(today, 5);
  try {
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'autumn', type: 'autumn_application', title: '投递 A', date: today, payload: { examAt: `${later}T09:00` } }) });
    let summary = await fetch(`${base}/api/autumn/summary?date=${today}`).then((response) => response.json());
    assert.equal(summary.nextExamOrInterview.at, `${later}T09:00`);
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'autumn', type: 'autumn_event', title: '新增笔试', date: tomorrow, scheduledTime: '14:00', payload: { eventType: 'exam', format: '线上' } }) });
    summary = await fetch(`${base}/api/autumn/summary?date=${today}`).then((response) => response.json());
    assert.equal(summary.nextExamOrInterview.title, '新增笔试');
    assert.equal(summary.nextExamOrInterview.at, `${tomorrow}T14:00`);
    await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'autumn', type: 'autumn_event', title: '更早面试', date: today, scheduledTime: '18:00', payload: { eventType: 'interview' } }) });
    summary = await fetch(`${base}/api/autumn/summary?date=${today}`).then((response) => response.json());
    assert.equal(summary.nextExamOrInterview.title, '更早面试');
    assert.equal(summary.nextExamOrInterview.kind, 'interview');
    const page = await dumpDom(`${base}/#/autumn`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /笔试\/面试安排/);
    assert.match(page.stdout, /更早面试/);
    assert.match(page.stdout, new RegExp(`${today} 18:00`));
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('问题8：各模块添加表单默认折叠并可点击展开', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-collapsible-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const page = await dumpDom(`${base}/#/study`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /class="add-form-disclosure"/);
    assert.match(page.stdout, /\+ 添加课程与学习资料/);
    assert.match(page.stdout, /\+ 添加章节目标/);
    assert.match(page.stdout, /\+ 添加复习安排/);
    assert.match(page.stdout, /\+ 添加学习笔记/);
    assert.doesNotMatch(page.stdout, /<details class="add-form-disclosure" open/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('问题9：悬浮窗关闭后可从主页面或独立脚本重新打开', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-overlay-open-'));
  const oldLocalAppData = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = root;
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const response = await fetch(`${base}/api/desktop/overlay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.ok(existsSync(payload.signalPath));
    const page = await dumpDom(`${base}/#/settings`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /打开悬浮窗/);
    const overlay = read('scripts/desktop-helper.ps1');
    assert.match(overlay, /PersonalWorkLifeApp\.DesktopHelper/);
    assert.match(overlay, /function Check-OverlaySignal/);
    assert.match(overlay, /\$form\.Show\(\)/);
    assert.ok(existsSync(join(process.cwd(), 'scripts', 'open-overlay.ps1')));
  } finally {
    await app.close();
    if (oldLocalAppData === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = oldLocalAppData;
    rmSync(root, { recursive: true, force: true });
  }
});

