import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
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
