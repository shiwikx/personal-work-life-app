import { addDays, localDateString } from './date.mjs';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function entityProgress(entity) {
  if (entity.status === 'completed' || entity.status === 'done' || entity.status === 'closed') return 100;
  if (entity.manualProgress !== null && entity.manualProgress !== undefined) return Math.max(0, Math.min(100, number(entity.manualProgress)));
  return 0;
}

function timeEntrySeconds(entity) {
  if (entity.type !== 'dev_time_entry' && entity.type !== 'study_session') return 0;
  if (entity.payload?.durationSeconds !== undefined) return Math.max(0, number(entity.payload.durationSeconds));
  return Math.max(0, number(entity.payload?.durationMinutes) * 60);
}

function linkedProjectId(entity, projectsById, featuresById) {
  const linkedId = entity.payload?.linkedEntityId || entity.parentId;
  if (!linkedId) return entity.payload?.projectId || '';
  if (projectsById.has(linkedId)) return linkedId;
  return featuresById.get(linkedId)?.parentId || entity.payload?.projectId || '';
}

export function developmentStats(store, today = localDateString()) {
  const items = store.listEntities({ module: 'development' });
  const projects = items.filter((item) => item.type === 'dev_project');
  const features = items.filter((item) => item.type === 'dev_feature');
  const defects = items.filter((item) => item.type === 'dev_defect');
  const timeEntries = items.filter((item) => item.type === 'dev_time_entry');
  const projectsById = new Map(projects.map((item) => [item.id, item]));
  const featuresById = new Map(features.map((item) => [item.id, item]));

  const result = projects.map((project) => {
    const projectFeatures = features.filter((item) => item.parentId === project.id);
    const projectDefects = defects.filter((item) => item.parentId === project.id);
    const entries = timeEntries.filter((item) => linkedProjectId(item, projectsById, featuresById) === project.id);
    const autoProgress = projectFeatures.length
      ? Math.round(projectFeatures.reduce((sum, item) => sum + entityProgress(item), 0) / projectFeatures.length)
      : 0;
    return {
      ...project,
      autoProgress,
      effectiveProgress: project.manualProgress ?? autoProgress,
      featureTotal: projectFeatures.length,
      featureCompleted: projectFeatures.filter((item) => ['completed', 'done'].includes(item.status)).length,
      openDefects: projectDefects.filter((item) => !['closed', 'completed'].includes(item.status)).length,
      totalSeconds: entries.reduce((sum, item) => sum + timeEntrySeconds(item), 0),
      todaySeconds: entries.filter((item) => item.date === today).reduce((sum, item) => sum + timeEntrySeconds(item), 0),
    };
  });

  return {
    today,
    projects: result,
    totals: {
      projects: projects.length,
      openProjects: projects.filter((item) => item.status !== 'completed').length,
      features: features.length,
      openDefects: defects.filter((item) => !['closed', 'completed'].includes(item.status)).length,
      totalSeconds: result.reduce((sum, item) => sum + item.totalSeconds, 0),
      todaySeconds: result.reduce((sum, item) => sum + item.todaySeconds, 0),
    },
  };
}

export function manualDevelopmentTime(store, input) {
  const minutes = number(input.minutes ?? input.durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) throw new Error('补录时长必须是 1 到 1440 分钟');
  const linkedId = input.linkedEntityId || input.projectId || null;
  const linked = linkedId ? store.getEntity(linkedId) : null;
  if (linkedId && (!linked || linked.module !== 'development')) throw new Error('关联的开发项目或功能不存在');
  return store.createEntity({
    module: 'development',
    type: 'dev_time_entry',
    title: input.title || `手动补录 ${Math.round(minutes)} 分钟`,
    date: input.date || localDateString(),
    notes: input.notes || '',
    payload: {
      durationSeconds: Math.round(minutes * 60),
      mode: 'manual',
      linkedEntityId: linkedId || '',
    },
  });
}

export function autumnSummary(store, today = localDateString()) {
  const items = store.listEntities({ module: 'autumn' });
  const applications = items.filter((item) => item.type === 'autumn_application');
  const events = items.filter((item) => item.type === 'autumn_event');
  const upcoming = [];
  for (const application of applications) {
    for (const kind of ['exam', 'interview']) {
      const at = application.payload?.[`${kind}At`];
      if (!at) continue;
      const date = String(at).slice(0, 10);
      if (date < today) continue;
      upcoming.push({
        id: application.id,
        applicationId: application.id,
        kind,
        title: application.title,
        at,
        date,
        status: application.payload?.applicationStatus || application.status,
        source: 'application',
      });
    }
  }
  for (const event of events) {
    if (!event.date || event.status === 'completed') continue;
    const kind = event.payload?.eventType === 'interview' ? 'interview' : 'exam';
    const at = `${event.date}T${event.scheduledTime || '09:00'}`;
    if (event.date < today) continue;
    upcoming.push({
      id: event.id,
      eventId: event.id,
      kind,
      title: event.title,
      at,
      date: event.date,
      status: event.status,
      source: 'event',
    });
  }
  upcoming.sort((a, b) => a.at.localeCompare(b.at));
  return {
    today,
    upcoming,
    applications,
    statusCounts: applications.reduce((counts, item) => {
      const status = item.payload?.applicationStatus || item.status || 'todo';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {}),
    nextExamOrInterview: upcoming[0] || null,
    nextDate: upcoming[0]?.date || addDays(today, 1),
  };
}

