import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage3-'));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function post(base, path, body) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (response) => ({ status: response.status, data: await response.json() }));
}

test('快速备忘支持清单、置顶和转今日计划', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const created = await post(base, '/api/memos', {
      title: '今日准备', content: '秋招资料', pinned: true,
      checklist: [{ text: '更新简历', done: false }, { text: '准备自我介绍', done: true }],
    });
    assert.equal(created.status, 201);
    const memo = created.data.item;
    assert.equal(memo.pinned, true);
    const converted = await post(base, `/api/memos/${memo.id}/convert`, { date: '2026-10-23' });
    assert.equal(converted.status, 201);
    const memos = await fetch(`${base}/api/memos`).then((response) => response.json());
    assert.ok(memos.items[0].convertedEntityId);
    const today = await fetch(`${base}/api/today?date=2026-10-23`).then((response) => response.json());
    assert.equal(today.items.length, 1);
    assert.match(today.items[0].notes, /\[x\] 准备自我介绍/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('首页和今日计划 API 返回完整页面数据', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    await post(base, '/api/entities', { module: 'today', type: 'task', title: '首页联动测试', date: '2026-10-23', priority: 2 });
    const home = await fetch(`${base}/api/home?date=2026-10-23`).then((response) => response.json());
    assert.equal(home.today.length, 1);
    assert.equal(home.counts.todayOpen, 1);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

function dumpDom(url) {
  const profile = mkdtempSync(join(tmpdir(), 'pwla-chrome-'));
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--disable-extensions', '--disable-background-networking', '--disable-sync',
      '--disable-default-apps', '--disable-component-update', '--no-default-browser-check',
      '--virtual-time-budget=1500', `--user-data-dir=${profile}`, '--dump-dom', url,
    ], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Chrome 页面检查超时')); }, 15000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); rmSync(profile, { recursive: true, force: true }); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      rmSync(profile, { recursive: true, force: true });
      resolve({ status: code, stdout, stderr });
    });
  });
}

test('Chrome 无头模式可渲染首页和今日计划导航', { skip: !existsSync(chrome) }, async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const home = await dumpDom(`${base}/`);
    assert.equal(home.status, 0, home.stderr);
    assert.match(home.stdout, /首页总览/);
    assert.match(home.stdout, /快速备忘/);
    assert.match(home.stdout, /毕设论文/);

    const today = await dumpDom(`${base}/#/today`);
    assert.equal(today.status, 0, today.stderr);
    assert.match(today.stdout, /统一安排自己的事项/);
    assert.match(today.stdout, /添加今日事项/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});