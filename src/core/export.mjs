import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { localDateTimeString, localDateString } from './date.mjs';
import { createZip } from './archive.mjs';

export const EXPORT_MODULES = ['today', 'thesis', 'study', 'development', 'autumn', 'work'];

function cell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(value) {
  const text = cell(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function moduleRows(store, module) {
  return store.listEntities({ module }).map((item) => ({
    id: item.id,
    module: item.module,
    type: item.type,
    title: item.title,
    status: item.status,
    date: item.date || '',
    scheduledTime: item.scheduledTime || '',
    priority: item.priority,
    reminderMinutes: item.reminderMinutes,
    manualProgress: item.manualProgress ?? '',
    progressNote: item.progressNote,
    notes: item.notes,
    payload: item.payload,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt || '',
  }));
}

export function exportModuleCsv(store, module) {
  const rows = moduleRows(store, module);
  const headers = ['id', 'module', 'type', 'title', 'status', 'date', 'scheduledTime', 'priority', 'reminderMinutes', 'manualProgress', 'progressNote', 'notes', 'payload', 'createdAt', 'updatedAt', 'completedAt'];
  const lines = [headers.join(','), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(','))];
  return `\ufeff${lines.join('\r\n')}`;
}

function xmlEscape(value) {
  return cell(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

export function exportModuleXls(store, module) {
  const rows = moduleRows(store, module);
  const headers = ['id', 'module', 'type', 'title', 'status', 'date', 'scheduledTime', 'priority', 'reminderMinutes', 'manualProgress', 'progressNote', 'notes', 'payload', 'createdAt', 'updatedAt', 'completedAt'];
  const headerCells = headers.map((key) => `<Cell><Data ss:Type="String">${xmlEscape(key)}</Data></Cell>`).join('');
  const bodyRows = rows.map((row) => `<Row>${headers.map((key) => `<Cell><Data ss:Type="String">${xmlEscape(row[key])}</Data></Cell>`).join('')}</Row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xmlEscape(module)}"><Table><Row>${headerCells}</Row>${bodyRows}</Table></Worksheet>
</Workbook>`;
}

export function exportFilename(module, format, date = localDateString()) {
  return `${module}-${date}.${format === 'xls' ? 'xls' : 'csv'}`;
}

export function createDataPackage(store, now = new Date()) {
  const exports = EXPORT_MODULES.map((module) => ({ name: `exports/${module}.csv`, data: Buffer.from(exportModuleCsv(store, module), 'utf8') }));
  const db = store.readDatabaseBytes();
  const settings = store.getSettings();
  const manifest = {
    format: 'personal-work-life-backup',
    packageType: 'full-data-package',
    version: 1,
    createdAt: localDateTimeString(now),
    dataRoot: store.dataRoot,
    modules: EXPORT_MODULES,
  };
  const buffer = createZip([
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
    { name: 'settings.json', data: Buffer.from(JSON.stringify(settings, null, 2), 'utf8') },
    { name: 'app.sqlite', data: db },
    ...exports,
  ], now);
  const dir = join(store.getSetting('dataPath', store.dataRoot), 'exports');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `personal-work-life-data-${localDateTimeString(now).replace(/[-:T]/g, '').slice(0, 14)}.zip`);
  writeFileSync(path, buffer);
  return { path, buffer, manifest };
}
