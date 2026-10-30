import { randomUUID } from 'node:crypto';
import { localDateTimeString, localDateString } from '../core/date.mjs';
import {
  completeOccurrence,
  decorateEntity,
  listForDate,
  uncompleteOccurrence,
} from '../core/schedule.mjs';
import { pauseTimer, resumeTimer, startTimer, stopTimer, timerElapsedSeconds } from './timer.mjs';
import { autumnSummary, developmentStats, manualDevelopmentTime } from '../core/analytics.mjs';
import { generateWorkReport, listWorkReports, updateWorkReportNote } from '../core/reports.mjs';
import { listDueReminders, listUpcomingReminders, snoozeReminder } from '../core/reminders.mjs';
import { localDateTimeString as nowString } from '../core/date.mjs';
import { createBackup, listBackups, restoreBackup } from '../core/backup.mjs';
import { EXPORT_MODULES, createDataPackage, exportFilename, exportModuleCsv, exportModuleXls } from '../core/export.mjs';
import { requestOverlayShow, setAutoStart } from './desktop.mjs';
import { writeBootstrapConfig } from './paths.mjs';
import { accessSync, constants, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export async function handleApi(req, res, url, store, sendJson, scheduler = null, options = {}) {
  const pathname = url.pathname;
  const method = req.method || 'GET';

  const timerMatch = /^\/api\/timer\/([^/]+)(?:\/(start|pause|resume|stop))?$/.exec(pathname);
  if (timerMatch) {
    const [, module, action] = timerMatch;
    if (!['study', 'development'].includes(module)) {
      sendJson(res, 400, { error: '该模块不支持计时' });
      return true;
    }
    try {
      if (method === 'GET' && !action) {
        const timer = store.timerState(module);
        sendJson(res, 200, { timer, elapsedSeconds: timerElapsedSeconds(timer) });
        return true;
      }
      if (method === 'POST' && action) {
        const body = await readJson(req);
        let result;
        if (action === 'start') result = startTimer(store, { module, entityId: body.entityId, mode: body.mode, targetMinutes: body.targetMinutes });
        if (action === 'pause') result = pauseTimer(store, module);
        if (action === 'resume') result = resumeTimer(store, module);
        if (action === 'stop') result = stopTimer(store, module);
        const timer = action === 'stop' ? result.timer : result;
        sendJson(res, 200, { timer, elapsedSeconds: action === 'stop' ? 0 : timerElapsedSeconds(timer), result });
        return true;
      }
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      return true;
    }
  }
  if (method === 'GET' && pathname === '/api/memos') {
    sendJson(res, 200, { items: store.listMemos() });
    return true;
  }

  if (method === 'POST' && pathname === '/api/memos') {
    const body = await readJson(req);
    const memo = store.createMemo(body);
    sendJson(res, 201, { item: memo });
    return true;
  }

  const memoMatch = /^\/api\/memos\/([^/]+)$/.exec(pathname);
  if (memoMatch && (method === 'PUT' || method === 'PATCH')) {
    const body = await readJson(req);
    const memo = store.updateMemo(memoMatch[1], body);
    sendJson(res, memo ? 200 : 404, memo ? { item: memo } : { error: '备忘不存在' });
    return true;
  }
  if (memoMatch && method === 'DELETE') {
    sendJson(res, store.deleteMemo(memoMatch[1]) ? 200 : 404, { ok: true });
    return true;
  }

  const memoConvertMatch = /^\/api\/memos\/([^/]+)\/convert$/.exec(pathname);
  if (memoConvertMatch && method === 'POST') {
    const body = await readJson(req);
    const memo = store.listMemos().find((item) => item.id === memoConvertMatch[1]);
    if (!memo) { sendJson(res, 404, { error: '备忘不存在' }); return true; }
    const checklistText = (memo.checklist || []).map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`).join('\n');
    const entity = store.createEntity({
      module: 'today', type: 'task', title: memo.title || '备忘事项',
      notes: [memo.content, checklistText].filter(Boolean).join('\n'),
      date: body.date || localDateString(), sourceMemoId: memo.id,
    });
    store.updateMemo(memo.id, { convertedEntityId: entity.id });
    sendJson(res, 201, { item: decorateEntity(store, entity, body.date || localDateString()) });
    return true;
  }
  if (method === 'GET' && pathname === '/api/entities') {
    const module = url.searchParams.get('module') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const includeCompleted = url.searchParams.get('includeCompleted') !== 'false';
    const entities = store.listEntities({ module, type, includeCompleted });
    sendJson(res, 200, { items: entities.map((entity) => decorateEntity(store, entity)) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/entities') {
    const body = await readJson(req);
    if (!body.module || !body.type || !body.title) {
      sendJson(res, 400, { error: 'module、type、title 为必填项' });
      return true;
    }
    const entity = store.createEntity(body);
    sendJson(res, 201, { item: decorateEntity(store, entity) });
    return true;
  }

  const entityMatch = /^\/api\/entities\/([^/]+)$/.exec(pathname);
  if (entityMatch) {
    const id = entityMatch[1];
    if (method === 'GET') {
      const entity = store.getEntity(id);
      if (!entity) { sendJson(res, 404, { error: '事项不存在' }); return true; }
      sendJson(res, 200, { item: decorateEntity(store, entity) });
      return true;
    }
    if (method === 'PUT' || method === 'PATCH') {
      const body = await readJson(req);
      const entity = store.updateEntity(id, body);
      if (!entity) { sendJson(res, 404, { error: '事项不存在' }); return true; }
      sendJson(res, 200, { item: decorateEntity(store, entity) });
      return true;
    }
    if (method === 'DELETE') {
      sendJson(res, store.deleteEntity(id) ? 200 : 404, { ok: store.getEntity(id) === null });
      return true;
    }
  }

  const actionMatch = /^\/api\/entities\/([^/]+)\/(complete|uncomplete|progress|snooze)$/.exec(pathname);
  if (actionMatch && method === 'POST') {
    const [, id, action] = actionMatch;
    const body = await readJson(req);
    const date = body.date || localDateString();
    if (action === 'complete') {
      const item = completeOccurrence(store, id, date, localDateTimeString());
      sendJson(res, item ? 200 : 404, item ? { item } : { error: '事项不存在' });
      return true;
    }
    if (action === 'uncomplete') {
      const item = uncompleteOccurrence(store, id, date);
      sendJson(res, item ? 200 : 404, item ? { item } : { error: '事项不存在' });
      return true;
    }
    if (action === 'snooze') {
      const item = snoozeReminder(store, id, date, body.minutes || store.getSetting('defaultReminderMinutes', 10));
      sendJson(res, item ? 200 : 404, item ? { item } : { error: '事项不存在' });
      return true;
    }
    if (action === 'progress') {
      const entity = store.getEntity(id);
      if (!entity) { sendJson(res, 404, { error: '事项不存在' }); return true; }
      const manualProgress = body.manualProgress === null || body.manualProgress === '' || body.manualProgress === undefined
        ? null
        : Number(body.manualProgress);
      if (manualProgress !== null && (!Number.isInteger(manualProgress) || manualProgress < 0 || manualProgress > 100)) {
        sendJson(res, 400, { error: '手动进度必须是 0 到 100 的整数' });
        return true;
      }
      const updated = store.updateEntity(id, { manualProgress, progressNote: body.progressNote || '' });
      sendJson(res, 200, { item: decorateEntity(store, updated, date) });
      return true;
    }
  }

  if (method === 'GET' && pathname === '/api/today') {
    const date = url.searchParams.get('date') || localDateString();
    const includeCompleted = url.searchParams.get('includeCompleted') === 'true';
    const items = listForDate(store, date, { includeCompleted });
    sendJson(res, 200, { date, items });
    return true;
  }

  if (method === 'GET' && pathname === '/api/home') {
    const date = url.searchParams.get('date') || localDateString();
    const today = listForDate(store, date);
    const todayAll = listForDate(store, date, { includeCompleted: true });
    const all = store.listEntities({});
    const summary = {};
    for (const module of ['today', 'thesis', 'study', 'development', 'autumn', 'work']) summary[module] = { total: 0, completed: 0, open: 0 };
    for (const entity of all) {
      const module = entity.module;
      summary[module] ||= { total: 0, completed: 0, open: 0 };
      summary[module].total += 1;
      if (entity.status === 'completed' || entity.status === 'done' || entity.status === 'closed') summary[module].completed += 1;
      else summary[module].open += 1;
    }
    const dev = developmentStats(store, date);
    const autumn = autumnSummary(store, date);
    summary.development.detail = `${dev.totals.openProjects} 个项目进行中 · ${dev.totals.openDefects} 个缺陷待处理 · 今日 ${Math.round(dev.totals.todaySeconds / 60)} 分钟`;
    summary.development.progress = dev.projects.length ? Math.round(dev.projects.reduce((sum, item) => sum + item.effectiveProgress, 0) / dev.projects.length) : 0;
    summary.autumn.detail = autumn.nextExamOrInterview ? `下一场 ${autumn.nextExamOrInterview.at.replace('T', ' ')}` : `${autumn.applications.length} 条投递记录`;
    const thesisDeadlines = all.filter((item) => item.module === 'thesis' && item.type === 'thesis_deadline' && item.status !== 'completed' && item.date >= date).sort((a, b) => a.date.localeCompare(b.date));
    summary.thesis.detail = thesisDeadlines[0] ? `最近节点 ${thesisDeadlines[0].date} · ${thesisDeadlines[0].title}` : `${summary.thesis.open} 项待处理`;
    const studySessions = all.filter((item) => item.module === 'study' && item.type === 'study_session' && item.date === date);
    const studyMinutes = Math.round(studySessions.reduce((sum, item) => sum + Number(item.payload?.durationSeconds || 0), 0) / 60);
    summary.study.detail = `今日学习 ${studyMinutes} 分钟 · ${summary.study.open} 项待处理`;
    const workTasks = all.filter((item) => item.module === 'work' && item.type === 'work_task' && item.status !== 'completed').sort((a, b) => b.priority - a.priority);
    summary.work.detail = workTasks[0] ? `最高优先级 P${workTasks[0].priority || 0} · ${workTasks[0].title}` : '当前没有待处理工作任务';
    const progressItems = all.filter((item) => !['study_session', 'dev_time_entry', 'work_log', 'work_report'].includes(item.type));
    const progressValues = progressItems.map((item) => {
      if (['completed', 'done', 'closed'].includes(item.status)) return 100;
      return item.manualProgress === null || item.manualProgress === undefined ? 0 : Math.max(0, Math.min(100, Number(item.manualProgress)));
    });
    const overallProgress = {
      percent: progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0,
      total: progressValues.length,
      completed: progressItems.filter((item) => ['completed', 'done', 'closed'].includes(item.status)).length,
    };
    const settings = store.getSettings();
    sendJson(res, 200, {
      date,
      today,
      todayAll,
      counts: { todayOpen: today.length, todayCompleted: Math.max(0, todayAll.length - today.length) },
      summary,
      memos: store.listMemos(),
      nextReminder: listUpcomingReminders(store, new Date(`${date}T00:00:00`), { days: 30 })[0] || null,
      backup: { lastBackupAt: settings.lastBackupAt || '', lastBackupStatus: settings.lastBackupStatus || '', autoBackup: settings.autoBackup !== false },
      overallProgress,
    });
    return true;
  }

  if (method === 'GET' && pathname === '/api/development/stats') {
    const today = url.searchParams.get('date') || localDateString();
    sendJson(res, 200, developmentStats(store, today));
    return true;
  }

  if (method === 'POST' && pathname === '/api/development/time') {
    try {
      const body = await readJson(req);
      const item = manualDevelopmentTime(store, body);
      sendJson(res, 201, { item: decorateEntity(store, item) });
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (method === 'GET' && pathname === '/api/autumn/summary') {
    const today = url.searchParams.get('date') || localDateString();
    sendJson(res, 200, autumnSummary(store, today));
    return true;
  }
  if (method === 'GET' && pathname === '/api/work/reports') {
    const periodType = url.searchParams.get('periodType') || undefined;
    const date = url.searchParams.get('date') || undefined;
    sendJson(res, 200, { items: listWorkReports(store, { periodType, date }) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/work/reports/generate') {
    try {
      const body = await readJson(req);
      const item = generateWorkReport(store, body);
      sendJson(res, 201, { item: decorateEntity(store, item) });
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  const reportMatch = /^\/api\/work\/reports\/([^/]+)$/.exec(pathname);
  if (reportMatch && (method === 'PUT' || method === 'PATCH')) {
    try {
      const body = await readJson(req);
      const item = updateWorkReportNote(store, reportMatch[1], body.manualNote);
      sendJson(res, 200, { item: decorateEntity(store, item) });
    } catch (error) {
      sendJson(res, 404, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }
  if (method === 'GET' && pathname === '/api/reminders/due') {
    const now = url.searchParams.get('now') ? new Date(url.searchParams.get('now')) : new Date();
    sendJson(res, 200, { now: nowString(now), items: listDueReminders(store, now, { includeNotified: url.searchParams.get('includeNotified') === 'true', recentMinutes: Number(url.searchParams.get('recentMinutes') || 10) }) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/reminders/check') {
    if (!scheduler) { sendJson(res, 503, { error: '提醒调度器尚未启动' }); return true; }
    const body = await readJson(req);
    const now = body.now ? new Date(body.now) : new Date();
    const result = scheduler.check(now);
    sendJson(res, 200, result);
    return true;
  }
  if (method === 'GET' && pathname === '/api/settings') {
    const settings = store.getSettings();
    let writable = true;
    try {
      mkdirSync(store.dataRoot, { recursive: true });
      const probe = join(store.dataRoot, `.write-test-${Date.now()}`);
      writeFileSync(probe, 'ok');
      rmSync(probe, { force: true });
      accessSync(store.dataRoot, constants.W_OK);
    } catch { writable = false; }
    sendJson(res, 200, { settings, writable, dataRoot: store.dataRoot, backups: listBackups(store).slice(0, 20) });
    return true;
  }

  if (method === 'PUT' && pathname === '/api/settings') {
    try {
      const body = await readJson(req);
      const allowed = ['autoBackup', 'backupRetention', 'reminderSound', 'dndStart', 'dndEnd', 'defaultReminderMinutes', 'autoStart', 'overlayEnabled', 'overlayTopMost', 'overlayCollapsed', 'backupDir'];
      if (body.backupRetention !== undefined && (!Number.isInteger(Number(body.backupRetention)) || Number(body.backupRetention) < 1 || Number(body.backupRetention) > 100)) throw new Error('备份保留数量必须是 1 到 100 的整数');
      if (body.defaultReminderMinutes !== undefined && (!Number.isInteger(Number(body.defaultReminderMinutes)) || Number(body.defaultReminderMinutes) < 0 || Number(body.defaultReminderMinutes) > 1440)) throw new Error('默认提前提醒必须是 0 到 1440 分钟');
      for (const key of ['dndStart', 'dndEnd']) if (body[key] !== undefined && !/^\d{2}:\d{2}$/.test(String(body[key]))) throw new Error('免打扰时间格式必须为 HH:mm');
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, key)) store.setSetting(key, body[key]);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'autoStart') && options.nativeActions !== false) {
        const script = join(process.cwd(), 'scripts', 'start-app.ps1');
        setAutoStart(Boolean(body.autoStart), `powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "${script}"`);
      }
      sendJson(res, 200, { settings: store.getSettings() });
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (method === 'GET' && pathname === '/api/backups') {
    sendJson(res, 200, { items: listBackups(store) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/backups/manual') {
    try {
      const item = createBackup(store, { kind: 'manual', message: '手动备份' });
      sendJson(res, 201, { item });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/backups/restore') {
    try {
      const body = await readJson(req);
      const result = restoreBackup(store, body.id || body.path);
      sendJson(res, 200, { ...result, settings: store.getSettings() });
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/data-directory') {
    try {
      const body = await readJson(req);
      if (!body.path) throw new Error('新数据目录不能为空');
      const safety = createBackup(store, { kind: 'pre-switch', message: '切换数据目录前安全备份' });
      const result = store.migrateTo(body.path);
      if (options.persistDataRoot !== false) writeBootstrapConfig({ dataRoot: result.dataRoot });
      sendJson(res, 200, { ...result, safety, settings: store.getSettings() });
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }

  const exportMatch = /^\/api\/exports\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && exportMatch && EXPORT_MODULES.includes(exportMatch[1])) {
    const module = exportMatch[1];
    const format = url.searchParams.get('format') === 'xls' ? 'xls' : 'csv';
    const body = format === 'xls' ? exportModuleXls(store, module) : exportModuleCsv(store, module);
    sendDownload(res, format === 'xls' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8', exportFilename(module, format), Buffer.from(body, 'utf8'));
    return true;
  }

  if (method === 'GET' && pathname === '/api/exports/package') {
    try {
      const result = createDataPackage(store);
      sendDownload(res, 'application/zip', `personal-work-life-data-${localDateString()}.zip`, result.buffer);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }
  if (method === 'POST' && pathname === '/api/desktop/overlay') {
    try {
      const result = requestOverlayShow({ launch: options.nativeActions !== false });
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return true;
  }
  if (method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'personal-work-life-app', now: localDateTimeString() });
    return true;
  }

  return false;
}

function sendDownload(res, contentType, filename, body) {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
export async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error('请求内容过大');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { throw new Error('JSON 格式错误'); }
}

export function id(prefix = '') {
  return `${prefix}${randomUUID()}`;
}














