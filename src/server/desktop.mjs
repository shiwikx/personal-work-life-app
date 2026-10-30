import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { listDueReminders, markReminderNotified, isDndNow } from '../core/reminders.mjs';
import { localDateTimeString } from '../core/date.mjs';

export const AUTOSTART_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
export const AUTOSTART_VALUE = 'PersonalWorkLifeApp';

function psQuote(value) {
  return String(value ?? '').replace(/'/g, "''");
}

export function notifyWindows(reminder, { sound = true } = {}) {
  if (process.platform !== 'win32') return false;
  const title = psQuote(`提醒：${reminder.title}`);
  const message = psQuote(`${reminder.occurrenceDate} ${reminder.scheduledTime || ''} · ${reminder.module}`);
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$n = New-Object System.Windows.Forms.NotifyIcon',
    '$n.Icon = [System.Drawing.SystemIcons]::Information',
    '$n.Visible = $true',
    `$n.ShowBalloonTip(6000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info)`,
    'Start-Sleep -Milliseconds 6500',
    '$n.Dispose()',
  ].join('; ');
  const args = ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', script];
  const child = spawn('powershell.exe', args, { detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref();
  return Boolean(sound || true);
}

export function openApp(url = 'http://127.0.0.1:4123') {
  if (process.platform !== 'win32') return false;
  const child = spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref();
  return true;
}

export function setAutoStart(enabled, command) {
  if (process.platform !== 'win32') return { enabled: false, reason: '当前系统不支持 Windows 自启动' };
  const args = enabled
    ? ['add', AUTOSTART_KEY, '/v', AUTOSTART_VALUE, '/t', 'REG_SZ', '/d', command || '', '/f']
    : ['delete', AUTOSTART_KEY, '/v', AUTOSTART_VALUE, '/f'];
  const result = spawnSync('reg.exe', args, { windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0 && enabled) throw new Error(result.stderr || '无法设置开机自启动');
  return { enabled: Boolean(enabled) };
}


export function overlaySignalPath() {
  const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
  return join(base, 'PersonalWorkLifeApp', 'show-overlay.signal');
}

export function requestOverlayShow({ launch = true } = {}) {
  const signalPath = overlaySignalPath();
  mkdirSync(join(signalPath, '..'), { recursive: true });
  writeFileSync(signalPath, String(Date.now()), 'utf8');
  if (launch && process.platform === 'win32') {
    const helper = join(process.cwd(), 'scripts', 'desktop-helper.ps1');
    const child = spawn('powershell.exe', ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-File', helper, '-ApiBase', 'http://127.0.0.1:4123'], { detached: true, windowsHide: true, stdio: 'ignore' });
    child.unref();
  }
  return { ok: true, signalPath };
}export class ReminderScheduler {
  constructor(store, { intervalMs = 15000, notifier = notifyWindows, checkOnStart = true } = {}) {
    this.store = store;
    this.intervalMs = intervalMs;
    this.notifier = notifier;
    this.checkOnStart = checkOnStart;
    this.timer = null;
    this.startupTimer = null;
    this.running = false;
  }

  start() {
    if (this.running) return this;
    this.running = true;
    const runCheck = () => {
      try {
        const result = this.check();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch {}
    };
    if (this.checkOnStart) {
      this.startupTimer = setTimeout(runCheck, 250);
      this.startupTimer.unref?.();
    }
    this.timer = setInterval(runCheck, this.intervalMs);
    this.timer.unref?.();
    return this;
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.timer = null;
    this.startupTimer = null;
  }

  check(now = new Date()) {
    const settings = this.store.getSettings();
    if (isDndNow(settings, now)) return { due: [], delivered: 0, dnd: true };
    const due = listDueReminders(this.store, now);
    const delivered = [];
    for (const reminder of due) {
      try {
        this.notifier(reminder, { sound: settings.reminderSound !== false });
        markReminderNotified(this.store, reminder, now);
        delivered.push(reminder);
      } catch (error) {
        this.log(`通知失败 ${reminder.key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (delivered.length) this.log(`已发送 ${delivered.length} 条提醒：${delivered.map((item) => item.title).join('；')}`);
    return { due, delivered: delivered.length, dnd: false };
  }

  log(message) {
    try {
      const dir = join(this.store.dataRoot, 'logs');
      mkdirSync(dir, { recursive: true });
      appendFileSync(join(dir, 'reminders.log'), `[${localDateTimeString()}] ${message}\n`, 'utf8');
    } catch {}
  }
}


