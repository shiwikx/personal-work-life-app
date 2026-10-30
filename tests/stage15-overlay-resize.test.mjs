import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('悬浮窗整体缩小并支持四边四角自由缩放', () => {
  const overlay = readFileSync(join(process.cwd(), 'scripts', 'desktop-helper.ps1'), 'utf8');
  assert.match(overlay, /class GlassResizeForm : Form/);
  assert.match(overlay, /WM_NCHITTEST/);
  assert.match(overlay, /HTBOTTOMRIGHT/);
  assert.match(overlay, /HTTOPLEFT/);
  assert.match(overlay, /HTLEFT/);
  assert.match(overlay, /HTRIGHT/);
  assert.match(overlay, /HTBOTTOM/);
  assert.match(overlay, /\$form = New-Object GlassResizeForm/);
  assert.match(overlay, /\$form\.Size = New-Object System\.Drawing\.Size\(320, 420\)/);
  assert.match(overlay, /\$form\.MinimumSize = New-Object System\.Drawing\.Size\(240, 64\)/);
  assert.match(overlay, /紧凑大小/);
  assert.match(overlay, /System\.Drawing\.Size\(280, 340\)/);
  assert.match(overlay, /标准大小/);
  assert.match(overlay, /System\.Drawing\.Size\(320, 420\)/);
  assert.match(overlay, /宽屏大小/);
  assert.match(overlay, /System\.Drawing\.Size\(430, 580\)/);
  assert.match(overlay, /\$form\.Add_ResizeEnd/);
  assert.ok(!overlay.includes('`r`n'));
});

