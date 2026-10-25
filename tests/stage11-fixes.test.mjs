import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');

test('问题1：悬浮窗缩放把手可见且支持尺寸快捷切换', () => {
  const overlay = read('scripts/desktop-helper.ps1');
  assert.match(overlay, /\$resizeGrip\.Size = New-Object System\.Drawing\.Size\(30, 30\)/);
  assert.match(overlay, /\$resizeGrip\.Location = New-Object System\.Drawing\.Point\(\(\$form\.ClientSize\.Width - 34\), \(\$form\.ClientSize\.Height - 34\)\)/);
  assert.match(overlay, /Cursors\]::SizeNWSE/);
  assert.match(overlay, /\$form\.Width = \[Math\]::Max\(300/);
  assert.match(overlay, /\$form\.Height = \[Math\]::Max\(120/);
  assert.match(overlay, /紧凑大小/);
  assert.match(overlay, /标准大小/);
  assert.match(overlay, /宽屏大小/);
});
