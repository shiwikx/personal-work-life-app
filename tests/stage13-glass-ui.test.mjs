import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

test('毛玻璃界面包含磨砂模糊、细颗粒、边缘高光和扩散阴影', { skip: !findBrowser() }, async () => {
  const css = readFileSync(join(process.cwd(), 'src/client/styles.css'), 'utf8');
  assert.match(css, /Frosted glass visual system/);
  assert.match(css, /--glass-blur: blur\(20px\) saturate\(125%\)/);
  assert.match(css, /backdrop-filter: var\(--glass-blur\)/);
  assert.match(css, /background-image: radial-gradient\(rgba\(32, 45, 38, 0\.68\) 0\.55px/);
  assert.match(css, /inset 0 1px 0 rgba\(255, 255, 255, 0\.92\)/);
  assert.match(css, /0 22px 55px rgba\(47, 61, 53, 0\.11\)/);
  assert.match(css, /--glass-blur: blur\(24px\) saturate\(132%\)/);
  assert.match(css, /mask-composite: exclude/);
  assert.match(css, /inset 0 -1px 1px rgba\(71, 92, 80, 0\.10\)/);
  assert.match(css, /background-size: auto, auto, 3px 3px/);
  assert.match(css, /rgba\(82, 168, 139, 0\.48\)/);
  assert.match(css, /linear-gradient\(115deg, rgba\(255,255,255,\.58\)/);

  const root = mkdtempSync(join(tmpdir(), 'pwla-glass-ui-'));
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0, scheduler: false, persistDataRoot: false, nativeActions: false });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const page = await dumpDom(`${base}/#/`);
    assert.equal(page.status, 0, page.stderr);
    assert.match(page.stdout, /首页总览/);
    assert.match(page.stdout, /总进度/);
    const styles = await fetch(`${base}/styles.css`);
    assert.equal(styles.headers.get('cache-control'), 'no-store');
    assert.match(await styles.text(), /Frosted glass visual system/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});


