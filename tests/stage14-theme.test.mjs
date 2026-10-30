import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

test('浅色与深色主题可切换并记住选择', { skip: !findBrowser() }, async () => {
  const appJs = readFileSync(join(process.cwd(), 'src/client/app.js'), 'utf8');
  const indexHtml = readFileSync(join(process.cwd(), 'src/client/index.html'), 'utf8');
  const css = readFileSync(join(process.cwd(), 'src/client/styles.css'), 'utf8');
  assert.match(indexHtml, /localStorage\.getItem\("pwla-theme"\)/);
  assert.match(appJs, /localStorage\.setItem\('pwla-theme'/);
  assert.match(appJs, /data-action="toggle-theme"/);
  assert.match(css, /html\[data-theme="dark"\]/);
  assert.match(css, /--ink: #f1f6fa/);
  assert.match(css, /html\[data-theme="dark"\] body/);

  const root = mkdtempSync(join(tmpdir(), 'pwla-theme-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const dark = await dumpDom(`${base}/?theme=dark#/`);
    assert.equal(dark.status, 0, dark.stderr);
    assert.match(dark.stdout, /data-theme="dark"/);
    assert.match(dark.stdout, /浅色模式/);
    const light = await dumpDom(`${base}/?theme=light#/`);
    assert.equal(light.status, 0, light.stderr);
    assert.match(light.stdout, /data-theme="light"/);
    assert.match(light.stdout, /深色模式/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});
