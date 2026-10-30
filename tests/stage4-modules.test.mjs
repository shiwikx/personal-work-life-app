import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server/app.mjs';
import { timerElapsedSeconds } from '../src/server/timer.mjs';

const makeRoot = () => mkdtempSync(join(tmpdir(), 'pwla-stage4-'));
async function json(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, { headers: { 'content-type': 'application/json' }, ...options });
  return { status: response.status, data: await response.json() };
}

test('毕设论文支持选题、章节字数、实验和导师反馈', async () => {
  const root = makeRoot();
  const app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const project = await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'thesis', type: 'thesis_project', title: '毕业论文', status: 'doing', payload: { direction: '软件工程', openingDate: '2026-09-01' } }) });
    assert.equal(project.status, 201);
    const chapter = await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'thesis', type: 'thesis_chapter', title: '第一章 绪论', date: '2026-11-01', payload: { currentWords: 1200, targetWords: 5000 } }) });
    assert.equal(chapter.data.item.payload.currentWords, 1200);
    await json(base, `/api/entities/${chapter.data.item.id}`, { method: 'PUT', body: JSON.stringify({ payload: { currentWords: 2300, targetWords: 5000 }, manualProgress: 46, progressNote: '继续补充相关工作' }) });
    const updated = await json(base, `/api/entities/${chapter.data.item.id}`);
    assert.equal(updated.data.item.payload.currentWords, 2300);
    assert.equal(updated.data.item.manualProgress, 46);
    await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'thesis', type: 'thesis_experiment', title: '可用性实验', payload: { conclusion: '样本量需扩大' } }) });
    await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'thesis', type: 'thesis_feedback', title: '导师反馈', payload: { followUp: '补充对比实验' } }) });
    const items = await json(base, '/api/entities?module=thesis');
    assert.equal(items.data.items.length, 4);
    assert.ok(!items.data.items.some((item) => item.type.includes('literature')));
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('学习计时支持开始、暂停、继续、停止并生成学习记录', async () => {
  const root = makeRoot();
  let app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
  let base = `http://127.0.0.1:${app.port}`;
  try {
    const course = await json(base, '/api/entities', { method: 'POST', body: JSON.stringify({ module: 'study', type: 'study_course', title: '软件测试', payload: { category: '专业课程' } }) });
    const started = await json(base, `/api/timer/study/start`, { method: 'POST', body: JSON.stringify({ entityId: course.data.item.id, mode: 'pomodoro', targetMinutes: 25 }) });
    assert.equal(started.data.timer.running, true);
    assert.equal(started.data.timer.targetSeconds, 1500);
    await app.close();
    app = await createApp({ dataRoot: root, clientRoot: join(process.cwd(), 'src', 'client'), port: 0 });
    base = `http://127.0.0.1:${app.port}`;
    const persisted = await json(base, '/api/timer/study');
    assert.equal(persisted.data.timer.running, true);
    await json(base, '/api/timer/study/pause', { method: 'POST', body: '{}' });
    const resumed = await json(base, '/api/timer/study/resume', { method: 'POST', body: '{}' });
    assert.equal(resumed.data.timer.running, true);
    const stopped = await json(base, '/api/timer/study/stop', { method: 'POST', body: '{}' });
    assert.equal(stopped.status, 200);
    const sessions = await json(base, '/api/entities?module=study&type=study_session');
    assert.equal(sessions.data.items.length, 1);
    assert.ok(sessions.data.items[0].payload.durationSeconds >= 0);
  } finally {
    await app.close(); rmSync(root, { recursive: true, force: true });
  }
});

test('计时耗时计算正确', () => {
  const state = { running: true, accumulatedSeconds: 120, startedAt: '2026-10-23T10:00:00' };
  const elapsed = timerElapsedSeconds(state, new Date('2026-10-23T10:01:30'));
  assert.equal(elapsed, 210);
});