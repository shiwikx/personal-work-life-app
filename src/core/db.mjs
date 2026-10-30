import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { localDateTimeString } from './date.mjs';

const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = {
  autoBackup: true,
  backupRetention: 7,
  reminderSound: true,
  dndStart: '23:00',
  dndEnd: '07:00',
  defaultReminderMinutes: 10,
  autoStart: false,
  overlayEnabled: true,
  overlayTopMost: true,
  overlayCollapsed: false,
  lastBackupAt: '',
  lastBackupStatus: '',
  lastBackupPath: '',
  dataPath: '',
  backupDir: '',
  lastSelectedModule: 'home',
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  date TEXT,
  start_date TEXT,
  end_date TEXT,
  scheduled_time TEXT,
  recurrence TEXT NOT NULL DEFAULT '{}',
  reminder_minutes INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  manual_progress INTEGER,
  progress_note TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  parent_id TEXT,
  source_memo_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entities_module_type ON entities(module, type);
CREATE INDEX IF NOT EXISTS idx_entities_date ON entities(date);
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_id);
CREATE TABLE IF NOT EXISTS occurrence_states (
  entity_id TEXT NOT NULL,
  occurrence_date TEXT NOT NULL,
  completed_at TEXT,
  snoozed_until TEXT,
  notified_at TEXT,
  PRIMARY KEY (entity_id, occurrence_date),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  checklist TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  converted_entity_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS timer_state (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  entity_id TEXT,
  mode TEXT NOT NULL,
  started_at TEXT,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  target_seconds INTEGER NOT NULL DEFAULT 0,
  running INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS backup_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT ''
);
`;

export class Store {
  constructor(dataRoot) {
    this.dataRoot = resolve(dataRoot);
    this.dbPath = join(this.dataRoot, 'app.sqlite');
    this.db = null;
  }

  open() {
    mkdirSync(this.dataRoot, { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    this.db.exec(SCHEMA_SQL);
    this.db.prepare("INSERT OR REPLACE INTO schema_meta(key, value) VALUES('version', ?)").run(String(SCHEMA_VERSION));
    this.#seedSettings();
    return this;
  }

  #seedSettings() {
    const insert = this.db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const effective = key === 'dataPath' ? this.dataRoot : key === 'backupDir' ? join(this.dataRoot, '..', 'backups') : value;
      insert.run(key, JSON.stringify(effective));
    }
  }

  close() {
    if (this.db) {
      try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch {}
      this.db.close();
      this.db = null;
    }
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return fallback;
    try { return JSON.parse(row.value); } catch { return fallback; }
  }

  setSetting(key, value) {
    this.db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value));
    return value;
  }

  getSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings ORDER BY key').all();
    const settings = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
    }
    return settings;
  }

  createEntity(input) {
    const now = localDateTimeString();
    const id = input.id || randomUUID();
    this.db.prepare(`
      INSERT INTO entities (
        id, module, type, title, notes, status, date, start_date, end_date,
        scheduled_time, recurrence, reminder_minutes, priority, pinned,
        manual_progress, progress_note, payload, parent_id, source_memo_id,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.module,
      input.type,
      input.title,
      input.notes || '',
      input.status || 'todo',
      input.date || null,
      input.startDate || null,
      input.endDate || null,
      input.scheduledTime || null,
      JSON.stringify(input.recurrence || {}),
      Number(input.reminderMinutes || 0),
      Number(input.priority || 0),
      input.pinned ? 1 : 0,
      input.manualProgress === null || input.manualProgress === undefined ? null : Number(input.manualProgress),
      input.progressNote || '',
      JSON.stringify(input.payload || {}),
      input.parentId || null,
      input.sourceMemoId || null,
      now,
      now,
      input.completedAt || null,
    );
    return this.getEntity(id);
  }

  getEntity(id) {
    const row = this.db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
    return row ? mapEntity(row) : null;
  }

  listEntities({ module, type, date, includeCompleted = true, parentId } = {}) {
    const where = [];
    const params = [];
    if (module) { where.push('module = ?'); params.push(module); }
    if (type) { where.push('type = ?'); params.push(type); }
    if (date) { where.push('date = ?'); params.push(date); }
    if (parentId !== undefined) { where.push('parent_id IS ?'); params.push(parentId); }
    if (!includeCompleted) where.push("status != 'completed'");
    const sql = `SELECT * FROM entities ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pinned DESC, priority DESC, created_at DESC`;
    return this.db.prepare(sql).all(...params).map(mapEntity);
  }

  updateEntity(id, patch) {
    const current = this.getEntity(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    this.db.prepare(`
      UPDATE entities SET
        module = ?, type = ?, title = ?, notes = ?, status = ?, date = ?,
        start_date = ?, end_date = ?, scheduled_time = ?, recurrence = ?,
        reminder_minutes = ?, priority = ?, pinned = ?, manual_progress = ?,
        progress_note = ?, payload = ?, parent_id = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `).run(
      next.module, next.type, next.title, next.notes || '', next.status || 'todo',
      next.date || null, next.startDate || null, next.endDate || null,
      next.scheduledTime || null, JSON.stringify(next.recurrence || {}),
      Number(next.reminderMinutes || 0), Number(next.priority || 0), next.pinned ? 1 : 0,
      next.manualProgress === null || next.manualProgress === undefined ? null : Number(next.manualProgress),
      next.progressNote || '', JSON.stringify(next.payload || {}), next.parentId || null,
      localDateTimeString(), next.completedAt || null, id,
    );
    return this.getEntity(id);
  }

  deleteEntity(id) {
    return this.db.prepare('DELETE FROM entities WHERE id = ?').run(id).changes > 0;
  }

  getOccurrenceState(entityId, occurrenceDate) {
    return this.db.prepare('SELECT * FROM occurrence_states WHERE entity_id = ? AND occurrence_date = ?')
      .get(entityId, occurrenceDate) || null;
  }

  upsertOccurrenceState(entityId, occurrenceDate, patch) {
    const current = this.getOccurrenceState(entityId, occurrenceDate) || {};
    const next = { ...current, ...patch };
    this.db.prepare(`
      INSERT INTO occurrence_states(entity_id, occurrence_date, completed_at, snoozed_until, notified_at)
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(entity_id, occurrence_date) DO UPDATE SET
        completed_at = excluded.completed_at,
        snoozed_until = excluded.snoozed_until,
        notified_at = excluded.notified_at
    `).run(entityId, occurrenceDate, next.completed_at || null, next.snoozed_until || null, next.notified_at || null);
    return this.getOccurrenceState(entityId, occurrenceDate);
  }

  listMemos() {
    return this.db.prepare('SELECT * FROM memos ORDER BY pinned DESC, updated_at DESC').all().map(mapMemo);
  }

  createMemo(input) {
    const now = localDateTimeString();
    const id = randomUUID();
    this.db.prepare('INSERT INTO memos(id, title, content, checklist, pinned, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .run(id, input.title || '快速备忘', input.content || '', JSON.stringify(input.checklist || []), input.pinned ? 1 : 0, now, now);
    return this.listMemos().find((memo) => memo.id === id);
  }

  updateMemo(id, patch) {
    const current = this.db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
    if (!current) return null;
    const next = { ...mapMemo(current), ...patch };
    this.db.prepare('UPDATE memos SET title = ?, content = ?, checklist = ?, pinned = ?, converted_entity_id = ?, updated_at = ? WHERE id = ?')
      .run(next.title, next.content || '', JSON.stringify(next.checklist || []), next.pinned ? 1 : 0, next.convertedEntityId || null, localDateTimeString(), id);
    return this.listMemos().find((memo) => memo.id === id);
  }

  deleteMemo(id) {
    return this.db.prepare('DELETE FROM memos WHERE id = ?').run(id).changes > 0;
  }

  timerState(module) {
    const row = this.db.prepare('SELECT * FROM timer_state WHERE module = ? ORDER BY updated_at DESC LIMIT 1').get(module);
    return row ? mapTimer(row) : null;
  }

  saveTimerState(state) {
    this.db.prepare(`
      INSERT INTO timer_state(id, module, entity_id, mode, started_at, accumulated_seconds, target_seconds, running, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET entity_id = excluded.entity_id, mode = excluded.mode,
        started_at = excluded.started_at, accumulated_seconds = excluded.accumulated_seconds,
        target_seconds = excluded.target_seconds, running = excluded.running, updated_at = excluded.updated_at
    `).run(state.id, state.module, state.entityId || null, state.mode, state.startedAt || null, Number(state.accumulatedSeconds || 0), Number(state.targetSeconds || 0), state.running ? 1 : 0, localDateTimeString());
    return this.timerState(state.module);
  }

  createBackupRecord(input) {
    const id = input.id || randomUUID();
    this.db.prepare('INSERT INTO backup_records(id, kind, path, created_at, status, message) VALUES(?, ?, ?, ?, ?, ?)')
      .run(id, input.kind || 'manual', input.path || '', input.createdAt || localDateTimeString(), input.status || 'success', input.message || '');
    return this.listBackupRecords().find((item) => item.id === id);
  }

  listBackupRecords(limit = 100) {
    return this.db.prepare('SELECT * FROM backup_records ORDER BY created_at DESC LIMIT ?').all(limit).map(mapBackupRecord);
  }
  deleteBackupRecord(id) {
    return this.db.prepare('DELETE FROM backup_records WHERE id = ?').run(id).changes > 0;
  }

  checkpoint() {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  }

  readDatabaseBytes() {
    this.checkpoint();
    return readFileSync(this.dbPath);
  }

  restoreDatabaseBytes(bytes) {
    const stamp = Date.now();
    const candidate = `${this.dbPath}.restore-${stamp}`;
    const displaced = `${this.dbPath}.displaced-${stamp}`;
    writeFileSync(candidate, bytes);
    const check = new DatabaseSync(candidate);
    try {
      const version = check.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get();
      if (!version) throw new Error('备份包缺少数据库版本信息');
      const integrity = check.prepare('PRAGMA integrity_check').get();
      if (Object.values(integrity || {})[0] !== 'ok') throw new Error('备份数据库完整性校验失败');
    } finally {
      check.close();
    }
    this.checkpoint();
    this.close();
    try {
      if (existsSync(displaced)) rmSync(displaced, { force: true });
      if (existsSync(this.dbPath)) renameSync(this.dbPath, displaced);
      renameSync(candidate, this.dbPath);
      rmSync(`${this.dbPath}-wal`, { force: true });
      rmSync(`${this.dbPath}-shm`, { force: true });
      this.open();
      if (existsSync(displaced)) rmSync(displaced, { force: true });
      return { ok: true };
    } catch (error) {
      try { this.close(); } catch {}
      if (existsSync(this.dbPath)) rmSync(this.dbPath, { force: true });
      if (existsSync(displaced)) renameSync(displaced, this.dbPath);
      this.open();
      throw error;
    } finally {
      if (existsSync(candidate)) rmSync(candidate, { force: true });
    }
  }

  migrateTo(newRoot) {
    const targetRoot = resolve(newRoot);
    if (targetRoot === this.dataRoot) return { dataRoot: this.dataRoot, changed: false };
    mkdirSync(targetRoot, { recursive: true });
    const targetDb = join(targetRoot, 'app.sqlite');
    if (existsSync(targetDb)) throw new Error('目标目录已存在 app.sqlite，请选择空目录以避免覆盖数据');
    const oldRoot = this.dataRoot;
    const temp = `${targetDb}.migrating-${Date.now()}`;
    try {
      this.checkpoint();
      copyFileSync(this.dbPath, temp);
      const check = new DatabaseSync(temp);
      try {
        const integrity = check.prepare('PRAGMA integrity_check').get();
        if (Object.values(integrity || {})[0] !== 'ok') throw new Error('数据目录迁移校验失败');
      } finally { check.close(); }
      this.close();
      renameSync(temp, targetDb);
      this.dataRoot = targetRoot;
      this.dbPath = targetDb;
      this.open();
      this.setSetting('dataPath', targetRoot);
      this.setSetting('backupDir', join(targetRoot, '..', 'backups'));
      return { dataRoot: targetRoot, changed: true };
    } catch (error) {
      if (existsSync(temp)) rmSync(temp, { force: true });
      if (!this.db) {
        this.dataRoot = oldRoot;
        this.dbPath = join(oldRoot, 'app.sqlite');
        this.open();
      }
      throw error;
    }
  }
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function mapEntity(row) {
  return {
    id: row.id,
    module: row.module,
    type: row.type,
    title: row.title,
    notes: row.notes,
    status: row.status,
    date: row.date,
    startDate: row.start_date,
    endDate: row.end_date,
    scheduledTime: row.scheduled_time,
    recurrence: safeJson(row.recurrence, {}),
    reminderMinutes: row.reminder_minutes,
    priority: row.priority,
    pinned: Boolean(row.pinned),
    manualProgress: row.manual_progress,
    progressNote: row.progress_note,
    payload: safeJson(row.payload, {}),
    parentId: row.parent_id,
    sourceMemoId: row.source_memo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapMemo(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    checklist: safeJson(row.checklist, []),
    pinned: Boolean(row.pinned),
    convertedEntityId: row.converted_entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBackupRecord(row) {
  return {
    id: row.id,
    kind: row.kind,
    path: row.path,
    createdAt: row.created_at,
    status: row.status,
    message: row.message,
  };
}
function mapTimer(row) {
  return {
    id: row.id,
    module: row.module,
    entityId: row.entity_id,
    mode: row.mode,
    startedAt: row.started_at,
    accumulatedSeconds: row.accumulated_seconds,
    targetSeconds: row.target_seconds,
    running: Boolean(row.running),
    updatedAt: row.updated_at,
  };
}


