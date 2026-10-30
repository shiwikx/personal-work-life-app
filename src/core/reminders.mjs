import { addDays, combineLocalDateAndTime, localDateString, localDateTimeString, parseClock } from './date.mjs';
import { isCompletedForOccurrence, normalizeRecurrence, occursOn } from './schedule.mjs';

function eventTime(instance) {
  return instance.scheduledTime || '09:00';
}

function reminderTime(instance) {
  const date = new Date(combineLocalDateAndTime(instance.date, eventTime(instance)));
  date.setMinutes(date.getMinutes() - Number(instance.reminderMinutes || 0));
  return localDateTimeString(date);
}

function eventInstances(entity, targetDate) {
  const instances = [];
  if (entity.type !== 'autumn_application' && entity.date && occursOn(entity, targetDate)) {
    instances.push({ kind: 'main', key: 'main', date: targetDate, scheduledTime: entity.scheduledTime, reminderMinutes: entity.reminderMinutes, title: entity.title });
  }
  if (entity.type === 'autumn_application') {
    for (const kind of ['exam', 'interview']) {
      const at = entity.payload?.[`${kind}At`];
      if (!at) continue;
      const date = String(at).slice(0, 10);
      if (date !== targetDate) continue;
      instances.push({
        kind,
        key: kind,
        date,
        scheduledTime: String(at).slice(11, 16) || '09:00',
        reminderMinutes: entity.reminderMinutes,
        title: `${entity.title} · ${kind === 'exam' ? '笔试' : '面试'}`,
      });
    }
  }
  return instances;
}

export function listDueReminders(store, now = new Date(), { lookbackDays = 7, includeNotified = false, recentMinutes = 10 } = {}) {
  const today = localDateString(now);
  const nowText = localDateTimeString(now);
  const entities = store.listEntities({});
  const due = [];
  for (let offset = -lookbackDays; offset <= 0; offset += 1) {
    const date = addDays(today, offset);
    for (const entity of entities) {
      const state = store.getOccurrenceState(entity.id, date);
      if (isCompletedForOccurrence(entity, date, state)) continue;
      if (state?.snoozed_until && state.snoozed_until > nowText) continue;
      for (const instance of eventInstances(entity, date)) {
        const dueAt = reminderTime(instance);
        if (dueAt > nowText) continue;
        const notificationKey = `${entity.id}:${date}:${instance.key}`;
        if (state?.notified_at) {
          const notifiedAt = String(state.notified_at);
          const ageMinutes = (now.getTime() - new Date(notifiedAt).getTime()) / 60000;
          if (!includeNotified || ageMinutes > recentMinutes) continue;
        }
        due.push({
          key: notificationKey,
          entityId: entity.id,
          module: entity.module,
          type: entity.type,
          occurrenceDate: date,
          kind: instance.kind,
          title: instance.title,
          notes: entity.notes,
          dueAt,
          reminderMinutes: Number(instance.reminderMinutes || 0),
          priority: entity.priority,
          scheduledTime: eventTime(instance),
          notifiedAt: state?.notified_at || null,
        });
      }
    }
  }
  due.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return due;
}

export function markReminderNotified(store, reminder, now = new Date()) {
  const state = store.getOccurrenceState(reminder.entityId, reminder.occurrenceDate) || {};
  store.upsertOccurrenceState(reminder.entityId, reminder.occurrenceDate, {
    completed_at: state.completed_at || null,
    snoozed_until: state.snoozed_until || null,
    notified_at: localDateTimeString(now),
  });
}

export function snoozeReminder(store, entityId, occurrenceDate, minutes = 10, now = new Date()) {
  const entity = store.getEntity(entityId);
  if (!entity) return null;
  const state = store.getOccurrenceState(entityId, occurrenceDate) || {};
  const until = new Date(now.getTime() + Math.max(1, Number(minutes || 10)) * 60000);
  store.upsertOccurrenceState(entityId, occurrenceDate, {
    completed_at: state.completed_at || null,
    snoozed_until: localDateTimeString(until),
    notified_at: null,
  });
  return { snoozedUntil: localDateTimeString(until) };
}

export function listUpcomingReminders(store, now = new Date(), { days = 30 } = {}) {
  const today = localDateString(now);
  const nowText = localDateTimeString(now);
  const entities = store.listEntities({});
  const upcoming = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const date = addDays(today, offset);
    for (const entity of entities) {
      for (const instance of eventInstances(entity, date)) {
        const dueAt = reminderTime(instance);
        if (dueAt <= nowText) continue;
        const state = store.getOccurrenceState(entity.id, date);
        if (isCompletedForOccurrence(entity, date, state)) continue;
        upcoming.push({ entityId: entity.id, module: entity.module, title: instance.title, occurrenceDate: date, dueAt, kind: instance.kind });
      }
    }
  }
  upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return upcoming;
}
export function isDndNow(settings, now = new Date()) {
  const start = parseClock(settings.dndStart || '23:00');
  const end = parseClock(settings.dndEnd || '07:00');
  if (!start || !end) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const from = start.hours * 60 + start.minutes;
  const to = end.hours * 60 + end.minutes;
  if (from === to) return false;
  return from < to ? current >= from && current < to : current >= from || current < to;
}




