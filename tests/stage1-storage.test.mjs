import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { Store } from '../src/core/db.mjs';
import { createApp } from '../src/server/app.mjs';
import { defaultDataRoot, resolveDataRoot, writeBootstrapConfig } from '../src/server/paths.mjs';

const makeTempRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage1-'));

test('SQLite 数据在关闭并重新打开后仍存在', () => {
  const root = makeTempRoot();
  try {
    const first = new Store(root).open();
    first.setSetting('autoStart', true);
    first.createEntity({ module: 'today', type: 'task', title: '持久化测试', date: '2026-10-23' });
    first.close();

    const second = new Store(root).open();
    assert.equal(second.getSetting('autoStart'), true);
    const items = second.listEntities({ module: 'today' });
    assert.equal(items.length, 1);
    assert.equal(items[0].title, '持久化测试');
    second.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('本地服务提供健康检查和静态页面', async () => {
  const root = makeTempRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  try {
    const health = await fetch(`http://127.0.0.1:${app.port}/api/health`).then((response) => response.json());
    assert.equal(health.ok, true);
    const html = await fetch(`http://127.0.0.1:${app.port}/`).then((response) => response.text());
    assert.match(html, /个人工作生活 APP/);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('新安装默认使用用户本地数据目录，已有自定义目录优先生效', () => {
  const root = makeTempRoot();
  const oldLocalAppData = process.env.LOCALAPPDATA;
  process.env.LOCALAPPDATA = root;
  try {
    const freshDefault = join(root, 'PersonalWorkLifeApp', 'data');
    assert.equal(defaultDataRoot(), freshDefault);
    assert.equal(resolveDataRoot(), resolve(freshDefault));

    const custom = join(root, 'custom-data');
    writeBootstrapConfig({ dataRoot: custom });
    assert.equal(resolveDataRoot(), resolve(custom));

    const envOverride = join(root, 'env-data');
    const cliOverride = join(root, 'cli-data');
    assert.equal(resolveDataRoot({ envDataDir: envOverride }), resolve(envOverride));
    assert.equal(resolveDataRoot({ cliDataDir: cliOverride }), resolve(cliOverride));
  } finally {
    if (oldLocalAppData === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = oldLocalAppData;
    rmSync(root, { recursive: true, force: true });
  }
});
