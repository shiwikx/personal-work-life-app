export const APP_TIME_ZONE = 'Asia/Shanghai';

export function pad(value) {
  return String(value).padStart(2, '0');
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localDateTimeString(date = new Date()) {
  return `${localDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function addDays(dateString, amount) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + amount, 12, 0, 0, 0);
  return localDateString(date);
}

export function addMonthsClamped(dateString, amount) {
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1 + amount, 1, 12, 0, 0, 0);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12, 0, 0, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return localDateString(target);
}

export function compareDateStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function weekdayMondayFirst(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const weekday = new Date(year, month - 1, day, 12, 0, 0, 0).getDay();
  return weekday === 0 ? 7 : weekday;
}

export function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function monthsBetween(fromDate, toDate) {
  const [fy, fm] = fromDate.split('-').map(Number);
  const [ty, tm] = toDate.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function startOfWeek(dateString) {
  return addDays(dateString, 1 - weekdayMondayFirst(dateString));
}

export function parseClock(clock) {
  const match = /^(\d{2}):(\d{2})$/.exec(clock || '');
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function combineLocalDateAndTime(dateString, timeString) {
  return `${dateString}T${timeString || '09:00'}:00`;
}

export function isWithinDnd(now, start, end) {
  const current = now.getHours() * 60 + now.getMinutes();
  const parse = (value, fallback) => {
    const parsed = parseClock(value);
    return parsed ? parsed.hours * 60 + parsed.minutes : fallback;
  };
  const from = parse(start, 23 * 60);
  const to = parse(end, 7 * 60);
  if (from === to) return false;
  if (from < to) return current >= from && current < to;
  return current >= from || current < to;
}

export function dateTimeForOccurrence(dateString, timeString, reminderMinutes = 0) {
  const date = new Date(combineLocalDateAndTime(dateString, timeString || '09:00'));
  date.setMinutes(date.getMinutes() - Number(reminderMinutes || 0));
  return localDateTimeString(date);
}