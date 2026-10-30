import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

test('数据与设置页面展示目录状态、提醒、备份恢复和导出入口', { skip: !findBrowser() }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'pwla-stage8-ui-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const page = await dumpDom(`${base}/#/settings`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /当前数据目录/);
    assert.match(page.stdout, /提醒与桌面/);
    assert.match(page.stdout, /自动备份与数据目录/);
    assert.match(page.stdout, /备份历史与恢复/);
    assert.match(page.stdout, /导出完整数据包/);
    assert.match(page.stdout, /开机自启动/);
    assert.match(page.stdout, /悬浮窗口/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
