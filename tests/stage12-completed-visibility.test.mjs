import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { localDateString } from '../src/core/date.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

test('完成后事项继续显示在首页、今日计划和所属模块', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-completed-visible-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  const today = localDateString();
  try {
    const open = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'today', type: 'task', title: '仍在进行的事项', date: today }) }).then((response) => response.json());
    const completed = await fetch(`${base}/api/entities`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module: 'study', type: 'study_review', title: '完成后仍显示的事项', date: today }) }).then((response) => response.json());
    await fetch(`${base}/api/entities/${completed.item.id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: today }) });

    const homeData = await fetch(`${base}/api/home?date=${today}`).then((response) => response.json());
    assert.equal(homeData.today.length, 1);
    assert.equal(homeData.todayAll.length, 2);
    assert.ok(homeData.todayAll.some((item) => item.id === open.item.id));
    assert.ok(homeData.todayAll.some((item) => item.id === completed.item.id && item.completedForOccurrence));

    const home = await dumpDom(`${base}/#/`);
    assert.equal(home.status, 0, home.stderr);
    assert.match(home.stdout, /仍在进行的事项/);
    assert.match(home.stdout, /完成后仍显示的事项/);

    const todayPage = await dumpDom(`${base}/#/today`);
    assert.equal(todayPage.status, 0, todayPage.stderr);
    assert.match(todayPage.stdout, /含已完成记录/);
    assert.match(todayPage.stdout, /1 已完成/);
    assert.match(todayPage.stdout, /仍在进行的事项/);
    assert.match(todayPage.stdout, /完成后仍显示的事项/);
    assert.match(todayPage.stdout, /完成于/);

    const studyPage = await dumpDom(`${base}/#/study`);
    assert.equal(studyPage.status, 0, studyPage.stderr);
    assert.match(studyPage.stdout, /class="completed-archive" open/);
    assert.match(studyPage.stdout, /完成后仍显示的事项/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('前端资源禁用缓存以确保完成记录界面立即加载', async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-cache-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const script = await fetch(`${base}/app.js`);
    const styles = await fetch(`${base}/styles.css`);
    const index = await fetch(`${base}/`);
    assert.equal(script.headers.get('cache-control'), 'no-store');
    assert.equal(styles.headers.get('cache-control'), 'no-store');
    const html = await index.text();
    assert.match(html, /app\.js\?v=20261025-theme/);
    assert.match(html, /styles\.css\?v=20261025-theme/);
    assert.match(await script.text(), /含已完成记录/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});







