import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createZip } from '../src/core/archive.mjs';

const root = resolve(process.cwd());
const releaseRoot = resolve(root, 'release');
const workDir = resolve(releaseRoot, 'PersonalWorkLifeApp-Windows');
const output = resolve(releaseRoot, 'PersonalWorkLifeApp-Windows-Portable.zip');
if (!workDir.startsWith(releaseRoot + '\\') && !workDir.startsWith(releaseRoot + '/')) throw new Error('发布目录越界');
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

function copyTree(source, target) {
  if (!existsSync(source)) return;
  for (const name of readdirSync(source)) {
    const from = join(source, name);
    const to = join(target, name);
    if (statSync(from).isDirectory()) {
      mkdirSync(to, { recursive: true });
      copyTree(from, to);
    } else {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
    }
  }
}

for (const item of ['src', 'scripts', 'docs']) copyTree(join(root, item), join(workDir, item));
for (const file of ['README.md', 'PRD.md', 'DEVELOPMENT_PLAN.md', 'package.json']) {
  if (existsSync(join(root, file))) copyFileSync(join(root, file), join(workDir, file));
}
mkdirSync(join(workDir, 'runtime'), { recursive: true });
copyFileSync(process.execPath, join(workDir, 'runtime', 'node.exe'));
writeFileSync(join(workDir, '启动个人工作生活APP.cmd'), [
  '@echo off',
  'cd /d "%~dp0"',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\\start-app.ps1"',
].join('\r\n'), 'utf8');
writeFileSync(join(workDir, '打开悬浮窗.cmd'), [
  '@echo off',
  'cd /d "%~dp0"',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\\open-overlay.ps1"',
].join('\r\n'), 'utf8');
writeFileSync(join(workDir, '停止个人工作生活APP.cmd'), [
  '@echo off',
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\\stop-app.ps1"',
  'pause',
].join('\r\n'), 'utf8');

const manifest = {
  product: '个人工作生活 APP',
  version: jsonVersion(),
  builtAt: new Date().toISOString(),
  runtime: 'Node.js embedded',
  entry: '启动个人工作生活APP.cmd',
  dataRoot: 'D:\\个人工作生活APP\\data',
};
writeFileSync(join(workDir, 'release-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

function jsonVersion() {
  try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || '0.1.0'; } catch { return '0.1.0'; }
}

function collect(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...collect(path));
    else files.push({ name: relative(workDir, path).replace(/\\/g, '/'), data: readFileSync(path) });
  }
  return files;
}
const files = collect(workDir);
writeFileSync(output, createZip(files));
console.log(`Windows 便携包已生成：${output}`);
console.log(`体积：${(statSync(output).size / 1024 / 1024).toFixed(1)} MB`);
console.log(`文件数：${files.length}`);

