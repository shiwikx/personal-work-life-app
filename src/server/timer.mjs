import { randomUUID } from 'node:crypto';
import { localDateString, localDateTimeString } from '../core/date.mjs';

export function timerElapsedSeconds(state, now = new Date()) {
  if (!state) return 0;
  let seconds = Number(state.accumulatedSeconds || 0);
  if (state.running && state.startedAt) {
    const started = new Date(state.startedAt).getTime();
    seconds += Math.max(0, Math.floor((now.getTime() - started) / 1000));
  }
  return seconds;
}

export function startTimer(store, { module, entityId, mode = 'stopwatch', targetMinutes = 25 }) {
  const previous = store.timerState(module);
  if (previous?.running) throw new Error('当前已有计时正在进行');
  const targetSeconds = mode === 'pomodoro' ? Math.max(1, Number(targetMinutes || 25)) * 60 : 0;
  return store.saveTimerState({
    id: previous?.id || randomUUID(), module, entityId, mode,
    startedAt: localDateTimeString(), accumulatedSeconds: previous?.accumulatedSeconds || 0,
    targetSeconds, running: true,
  });
}

export function pauseTimer(store, module) {
  const state = store.timerState(module);
  if (!state || !state.running) throw new Error('没有正在运行的计时');
  return store.saveTimerState({
    ...state,
    accumulatedSeconds: timerElapsedSeconds(state),
    startedAt: null,
    running: false,
  });
}

export function resumeTimer(store, module) {
  const state = store.timerState(module);
  if (!state || state.running) throw new Error('没有可继续的计时');
  return store.saveTimerState({ ...state, startedAt: localDateTimeString(), running: true });
}

export function stopTimer(store, module) {
  const state = store.timerState(module);
  if (!state) throw new Error('没有计时记录');
  const durationSeconds = timerElapsedSeconds(state);
  const date = localDateString();
  const entity = state.entityId ? store.getEntity(state.entityId) : null;
  const type = module === 'study' ? 'study_session' : 'dev_time_entry';
  const title = `${module === 'study' ? '学习' : '开发'}记录 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟`;
  store.createEntity({
    module, type, title, date,
    notes: entity ? `关联：${entity.title}` : '',
    payload: {
      durationSeconds, mode: state.mode, linkedEntityId: state.entityId || '',
      targetSeconds: state.targetSeconds || 0,
    },
  });
  store.saveTimerState({
    ...state, startedAt: null, running: false,
    accumulatedSeconds: 0, targetSeconds: state.targetSeconds || 0,
  });
  return { durationSeconds, timer: store.timerState(module) };
}