import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { localDateString } from '../src/core/date.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

test('今日计划显示删除入口，删除后从今日视图移除', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-delete-plan-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  const today = localDateString();
  try {
    const created = await fetch(`${base}/api/entities`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module: 'study', type: 'study_review', title: '待删除的学习计划', date: today }),
    }).then((response) => response.json());

    const before = await dumpDom(`${base}/#/today`);
    assert.equal(before.status, 0, before.stderr);
    assert.match(before.stdout, /待删除的学习计划/);
    assert.match(before.stdout, /data-action="delete-entity"[^>]*title="删除计划"/);

    const deleted = await fetch(`${base}/api/entities/${created.item.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);

    const after = await dumpDom(`${base}/#/today`);
    assert.equal(after.status, 0, after.stderr);
    assert.doesNotMatch(after.stdout, /待删除的学习计划/);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});