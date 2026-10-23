import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

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
