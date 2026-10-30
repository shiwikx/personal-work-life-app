import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function findBrowser() {
  return chromePaths.find((path) => existsSync(path)) || null;
}

export function dumpDom(url) {
  const browser = findBrowser();
  if (!browser) throw new Error('未找到 Chrome 或 Edge');
  const profile = mkdtempSync(join(tmpdir(), 'pwla-browser-'));
  return new Promise((resolve, reject) => {
    const child = spawn(browser, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--disable-extensions', '--disable-background-networking', '--disable-sync',
      '--disable-default-apps', '--disable-component-update', '--no-default-browser-check',
      '--virtual-time-budget=1500', `--user-data-dir=${profile}`, '--dump-dom', url,
    ], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('浏览器页面检查超时')); }, 15000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); rmSync(profile, { recursive: true, force: true }); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      rmSync(profile, { recursive: true, force: true });
      resolve({ status: code, stdout, stderr });
    });
  });
}