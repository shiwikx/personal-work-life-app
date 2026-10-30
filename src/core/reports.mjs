import { localDateTimeString, localDateString, startOfWeek } from './date.mjs';

function done(item) {
  return item.status === 'completed' || item.status === 'done' || Boolean(item.completedAt);
}

function inDateRange(item, from, to) {
  const value = item.date || item.createdAt || '';
  return value >= from && value <= `${to}T23:59:59`;
}

function reportEntity(store, periodType, periodDate) {
  return store.listEntities({ module: 'work', type: 'work_report' }).find((item) => item.payload?.periodType === periodType && item.date === periodDate) || null;
}

export function buildWorkReport(store, { periodType = 'daily', date = localDateString() } = {}) {
  if (!['daily', 'weekly'].includes(periodType)) throw new Error('报告类型必须是 daily 或 weekly');
  const from = periodType === 'weekly' ? startOfWeek(date) : date;
  const to = periodType === 'weekly' ? date : date;
  const items = store.listEntities({ module: 'work' }).filter((item) => item.type !== 'work_report');
  const tasks = items.filter((item) => item.type === 'work_task' && inDateRange(item, from, to));
  const meetings = items.filter((item) => item.type === 'work_meeting' && inDateRange(item, from, to));
  const progress = items.filter((item) => item.type === 'work_progress' && inDateRange(item, from, to));
  const logs = items.filter((item) => item.type === 'work_log' && inDateRange(item, from, to));
  const completedTasks = tasks.filter(done);
  const openTasks = tasks.filter((item) => !done(item));
  const totalMinutes = logs.reduce((sum, item) => sum + Number(item.payload?.minutes || 0), 0);
  const lines = [
    periodType === 'daily' ? `工作日报 ${date}` : `工作周报 ${from} 至 ${to}`,
    '',
    `已完成事项：${completedTasks.length} 项`,
    ...completedTasks.map((item) => `- ${item.title}${item.payload?.project ? `（${item.payload.project}）` : ''}`),
    '',
    `进行中/未完成事项：${openTasks.length} 项`,
    ...openTasks.map((item) => `- [P${item.priority || 0}] ${item.title}${item.progressNote ? `：${item.progressNote}` : ''}`),
    '',
    `会议：${meetings.length} 场`,
    ...meetings.map((item) => `- ${item.date || ''} ${item.scheduledTime || ''} ${item.title}`),
    '',
    `进展记录：${progress.length} 条`,
    ...progress.map((item) => `- ${item.payload?.content || item.title}${item.payload?.nextStep ? `；下一步：${item.payload.nextStep}` : ''}`),
    '',
    `工作日志：${logs.length} 条，共 ${totalMinutes} 分钟`,
    ...logs.map((item) => `- ${item.title}：${item.payload?.content || item.payload?.minutes || ''}`),
  ];
  return {
    periodType,
    from,
    to,
    generatedText: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    counts: { completed: completedTasks.length, open: openTasks.length, meetings: meetings.length, progress: progress.length, logs: logs.length, totalMinutes },
    items: { tasks, meetings, progress, logs },
  };
}

export function generateWorkReport(store, input = {}) {
  const data = buildWorkReport(store, input);
  const periodDate = data.periodType === 'weekly' ? data.from : data.to;
  const existing = reportEntity(store, data.periodType, periodDate);
  const payload = {
    ...(existing?.payload || {}),
    ...data,
    manualNote: input.manualNote ?? existing?.payload?.manualNote ?? '',
    generatedAt: localDateTimeString(),
  };
  if (existing) return store.updateEntity(existing.id, { title: data.periodType === 'daily' ? `日报 ${periodDate}` : `周报 ${periodDate}`, payload });
  return store.createEntity({
    module: 'work', type: 'work_report', title: data.periodType === 'daily' ? `日报 ${periodDate}` : `周报 ${periodDate}`,
    date: periodDate, status: 'completed', payload,
  });
}

export function listWorkReports(store, { periodType, date } = {}) {
  return store.listEntities({ module: 'work', type: 'work_report' })
    .filter((item) => !periodType || item.payload?.periodType === periodType)
    .filter((item) => !date || item.date === date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function updateWorkReportNote(store, id, manualNote) {
  const report = store.getEntity(id);
  if (!report || report.module !== 'work' || report.type !== 'work_report') throw new Error('日报或周报不存在');
  return store.updateEntity(id, { payload: { ...report.payload, manualNote: String(manualNote || ''), updatedAt: localDateTimeString() } });
}
