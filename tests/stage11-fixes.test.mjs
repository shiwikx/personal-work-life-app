import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');

test('问题1：悬浮窗缩放把手可见且支持尺寸快捷切换', () => {
  const overlay = read('scripts/desktop-helper.ps1');
  assert.match(overlay, /\$resizeGrip\.Size = New-Object System\.Drawing\.Size\(30, 30\)/);
  assert.match(overlay, /\$resizeGrip\.Location = New-Object System\.Drawing\.Point\(\(\$form\.ClientSize\.Width - 34\), \(\$form\.ClientSize\.Height - 34\)\)/);
  assert.match(overlay, /Cursors\]::SizeNWSE/);
  assert.match(overlay, /\$form\.Width = \[Math\]::Max\(300/);
  assert.match(overlay, /\$form\.Height = \[Math\]::Max\(120/);
  assert.match(overlay, /紧凑大小/);
  assert.match(overlay, /标准大小/);
  assert.match(overlay, /宽屏大小/);
});

test('问题2：完成任务后今日计划保留已完成记录', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-completed-today-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const tasks = [
      { module: 'today', type: 'task', title: '今日自定义完成项' },
      { module: 'study', type: 'study_review', title: '模块已完成复习' },
    ];
    for (const task of tasks) {
      const created = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...task, date: '2026-10-25' }) }).then((response) => response.json());
      await fetch(`${base}/api/entities/${created.item.id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: '2026-10-25' }) });
    }
    const open = await fetch(`${base}/api/today?date=2026-10-25`).then((response) => response.json());
    assert.equal(open.items.length, 0);
    const all = await fetch(`${base}/api/today?date=2026-10-25&includeCompleted=true`).then((response) => response.json());
    assert.equal(all.items.filter((item) => item.completedForOccurrence).length, 2);
    const page = await dumpDom(`${base}/#/today`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /已完成记录/);
    assert.match(page.stdout, /今日自定义完成项/);
    assert.match(page.stdout, /模块已完成复习/);
    assert.match(page.stdout, /完成于/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
