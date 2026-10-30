import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../../src/server/app.mjs';
import { dumpDom, findBrowser } from '../helpers/browser.mjs';

test('八个一级页面均可渲染且导航完整', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-e2e-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  const pages = ['', 'today', 'thesis', 'study', 'development', 'autumn', 'work', 'settings'];
  const navLabels = ['首页总览', '今日计划', '毕设论文', '学习计划', '开发计划', '秋招每日计划', '工作计划', '数据与设置'];
  try {
    for (const page of pages) {
      const result = await dumpDom(`${base}/#/${page}`);
      assert.equal(result.status, 0, `${page}: ${result.stderr}`);
      for (const label of navLabels) assert.match(result.stdout, new RegExp(label), `${page} 缺少 ${label}`);
      assert.doesNotMatch(result.stdout, /模块正在搭建/);
      assert.doesNotMatch(result.stdout, /https?:\/\/(?!127\.0\.0\.1)/);
    }
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
