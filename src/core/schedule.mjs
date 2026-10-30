import { addDays, addMonthsClamped, daysBetween, monthsBetween, weekdayMondayFirst } from './date.mjs';

export function normalizeRecurrence(recurrence) {
  if (!recurrence || typeof recurrence !== 'object') return { freq: 'none' };
  const freq = recurrence.freq || 'none';
  if (freq === 'none') return { freq: 'none' };
  const interval = Math.max(1, Number(recurrence.interval || 1));
  if (freq === 'daily') return { freq, interval };
  if (freq === 'weekly') {
    const weekdays = Array.isArray(recurrence.weekdays) && recurrence.weekdays.length
      ? [...new Set(recurrence.weekdays.map(Number).filter((day) => day >= 1 && day <= 7))]
      : null;
    return { freq, interval, weekdays };
  }
  if (freq === 'monthly') {
    return { freq, interval, dayOfMonth: recurrence.dayOfMonth ? Number(recurrence.dayOfMonth) : null };
  }
  if (freq === 'custom') {
    const unit = ['day', 'week', 'month'].includes(recurrence.unit) ? recurrence.unit : 'day';
    return { freq, interval, unit };
  }
  return { freq: 'none' };
}

export function baseDateForEntity(entity) {
  return entity.date || entity.startDate || null;
}

export function occursOn(entity, targetDate) {
  const baseDate = baseDateForEntity(entity);
  if (!baseDate) return false;
  if (entity.endDate && targetDate > entity.endDate) return false;
  const recurrence = normalizeRecurrence(entity.recurrence);
  if (recurrence.freq === 'none') return targetDate === baseDate;
  if (targetDate < baseDate) return false;

  if (recurrence.freq === 'daily') {
    return daysBetween(baseDate, targetDate) % recurrence.interval === 0;
  }

  if (recurrence.freq === 'weekly') {
    const weekDiff = Math.floor(daysBetween(baseDate, targetDate) / 7);
    if (weekDiff % recurrence.interval !== 0) return false;
    const weekdays = recurrence.weekdays || [weekdayMondayFirst(baseDate)];
    return weekdays.includes(weekdayMondayFirst(targetDate));
  }

  if (recurrence.freq === 'monthly') {
    const monthDiff = monthsBetween(baseDate, targetDate);
    if (monthDiff < 0 || monthDiff % recurrence.interval !== 0) return false;
    const wantedDay = recurrence.dayOfMonth || Number(baseDate.slice(8, 10));
    const [year, month, day] = targetDate.split('-').map(Number);
    const lastDay = new Date(year, month, 0, 12, 0, 0, 0).getDate();
    return day === Math.min(wantedDay, lastDay);
  }

  if (recurrence.freq === 'custom') {
    if (recurrence.unit === 'day') return daysBetween(baseDate, targetDate) % recurrence.interval === 0;
    if (recurrence.unit === 'week') return daysBetween(baseDate, targetDate) % (recurrence.interval * 7) === 0;
    if (recurrence.unit === 'month') return monthsBetween(baseDate, targetDate) % recurrence.interval === 0;
  }
  return false;
}

export function isCompletedForOccurrence(entity, occurrenceDate, state) {
  if (state?.completed_at) return true;
  return normalizeRecurrence(entity.recurrence).freq === 'none' && entity.status === 'completed';
}

export function childProgress(store, entity, occurrenceDate = null) {
  const children = store.listEntities({ parentId: entity.id });
  if (children.length === 0) return null;
  let completed = 0;
  for (const child of children) {
    const state = occurrenceDate ? store.getOccurrenceState(child.id, occurrenceDate) : null;
    if (isCompletedForOccurrence(child, occurrenceDate, state)) completed += 1;
  }
  return Math.round((completed / children.length) * 100);
}

export function decorateEntity(store, entity, occurrenceDate = null) {
  const state = occurrenceDate ? store.getOccurrenceState(entity.id, occurrenceDate) : null;
  const autoProgress = childProgress(store, entity, occurrenceDate);
  const manualProgress = entity.manualProgress === null || entity.manualProgress === undefined ? null : Number(entity.manualProgress);
  return {
    ...entity,
    occurrenceDate,
    occurrenceState: state,
    completedForOccurrence: isCompletedForOccurrence(entity, occurrenceDate, state),
    autoProgress,
    manualProgress,
    effectiveProgress: manualProgress ?? autoProgress ?? (entity.status === 'completed' ? 100 : 0),
  };
}

function autumnEventForDate(entity, date) {
  if (entity.type !== 'autumn_application') return null;
  for (const kind of ['exam', 'interview']) {
    const at = entity.payload?.[`${kind}At`];
    if (!at || String(at).slice(0, 10) !== date) continue;
    return {
      ...entity,
      title: `${entity.title} · ${kind === 'exam' ? '笔试' : '面试'}`,
      date,
      scheduledTime: String(at).slice(11, 16) || entity.scheduledTime,
      notes: [entity.payload?.format, entity.notes].filter(Boolean).join(' · '),
      virtualEventKind: kind,
    };
  }
  return null;
}

export function listForDate(store, date, { module, includeCompleted = false } = {}) {
  const entities = store.listEntities({ module });
  const result = [];
  for (const entity of entities) {
    if (occursOn(entity, date)) {
      const item = decorateEntity(store, entity, date);
      if (includeCompleted || !item.completedForOccurrence) result.push(item);
    }
    const event = autumnEventForDate(entity, date);
    if (event) {
      const item = decorateEntity(store, event, date);
      if (includeCompleted || !item.completedForOccurrence) result.push(item);
    }
  }
  return result.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99');
  });
}

function isVirtualEventOccurrence(entity, occurrenceDate) {
  if (entity.type !== 'autumn_application' || entity.date === occurrenceDate) return false;
  return ['examAt', 'interviewAt'].some((key) => String(entity.payload?.[key] || '').slice(0, 10) === occurrenceDate);
}
export function completeOccurrence(store, entityId, occurrenceDate, now) {
  const entity = store.getEntity(entityId);
  if (!entity) return null;
  if (normalizeRecurrence(entity.recurrence).freq === 'none' && !isVirtualEventOccurrence(entity, occurrenceDate)) {
    store.updateEntity(entityId, { status: 'completed', completedAt: now });
  } else {
    store.upsertOccurrenceState(entityId, occurrenceDate, { completed_at: now, snoozed_until: null, notified_at: now });
  }
  return decorateEntity(store, store.getEntity(entityId), occurrenceDate);
}

export function uncompleteOccurrence(store, entityId, occurrenceDate) {
  const entity = store.getEntity(entityId);
  if (!entity) return null;
  if (normalizeRecurrence(entity.recurrence).freq === 'none' && !isVirtualEventOccurrence(entity, occurrenceDate)) {
    store.updateEntity(entityId, { status: 'todo', completedAt: null });
  } else {
    const state = store.getOccurrenceState(entityId, occurrenceDate) || {};
    store.upsertOccurrenceState(entityId, occurrenceDate, {
      completed_at: null,
      snoozed_until: state.snoozed_until || null,
      notified_at: state.notified_at || null,
    });
  }
  return decorateEntity(store, store.getEntity(entityId), occurrenceDate);
}

export function recurrenceSummary(recurrence) {
  const rule = normalizeRecurrence(recurrence);
  if (rule.freq === 'none') return '不重复';
  if (rule.freq === 'daily') return rule.interval === 1 ? '每天' : `每 ${rule.interval} 天`;
  if (rule.freq === 'weekly') return rule.interval === 1 ? '每周' : `每 ${rule.interval} 周`;
  if (rule.freq === 'monthly') return rule.interval === 1 ? '每月' : `每 ${rule.interval} 月`;
  if (rule.freq === 'custom') {
    const unit = rule.unit === 'day' ? '天' : rule.unit === 'week' ? '周' : '月';
    return `每 ${rule.interval} ${unit}`;
  }
  return '不重复';
}

