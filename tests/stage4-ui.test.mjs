import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { dumpDom, findBrowser } from './helpers/browser.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage4-ui-'));

test('毕设与学习页面展示差异化功能且不包含已删除功能', { skip: !findBrowser() }, async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const thesis = await dumpDom(`${base}/#/thesis`);
    assert.equal(thesis.status, 0, thesis.stderr);
    assert.match(thesis.stdout, /选题与开题/);
    assert.match(thesis.stdout, /章节写作/);
    assert.match(thesis.stdout, /实验与数据/);
    assert.match(thesis.stdout, /导师反馈/);
    assert.doesNotMatch(thesis.stdout, /文献资料/);

    const study = await dumpDom(`${base}/#/study`);
    assert.equal(study.status, 0, study.stderr);
    assert.match(study.stdout, /学习计时/);
    assert.match(study.stdout, /课程与学习资料/);
    assert.match(study.stdout, /复习安排/);
    assert.match(study.stdout, /学习笔记/);
    assert.doesNotMatch(study.stdout, /错题/);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});