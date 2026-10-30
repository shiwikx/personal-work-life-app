const NAV_ITEMS = [
  { path: '/', label: '首页总览', icon: '◉' },
  { path: '/today', label: '今日计划', icon: '✓' },
  { path: '/thesis', label: '毕设论文', icon: '文' },
  { path: '/study', label: '学习计划', icon: '学' },
  { path: '/development', label: '开发计划', icon: '码' },
  { path: '/autumn', label: '秋招每日计划', icon: '招' },
  { path: '/work', label: '工作计划', icon: '工' },
  { path: '/settings', label: '数据与设置', icon: '⚙' },
];

const MODULE_INFO = {
  thesis: { title: '毕设论文', subtitle: '选题、章节、实验、导师反馈与关键节点' },
  study: { title: '学习计划', subtitle: '课程、章节目标、学习计时、复习与笔记' },
  development: { title: '开发计划', subtitle: '项目、功能、缺陷、日志与时间投入' },
  autumn: { title: '秋招每日计划', subtitle: '自定义每日事项、投递、笔试面试与复盘' },
  work: { title: '工作计划', subtitle: '任务、会议、进展、日志与日周报' },
  settings: { title: '数据与设置', subtitle: '本地数据、备份恢复、导出和提醒设置' },
};

const MODULE_CONFIGS = {
  thesis: {
    title: '毕设论文', subtitle: '选题、章节写作、实验数据、导师反馈和关键节点',
    sections: [
      { type: 'thesis_project', title: '选题与开题', fields: [
        { key: 'direction', label: '研究方向', payload: true, placeholder: '例如：软件工程 / 人机交互' },
        { key: 'openingDate', label: '开题日期', type: 'date', payload: true },
      ], cardFields: [['direction', '研究方向'], ['openingDate', '开题日期']] },
      { type: 'thesis_chapter', title: '章节写作', fields: [
        { key: 'currentWords', label: '当前字数', type: 'number', min: 0, payload: true },
        { key: 'targetWords', label: '目标字数', type: 'number', min: 0, payload: true },
      ], cardFields: [['currentWords', '当前字数', ' 字'], ['targetWords', '目标字数', ' 字']] },
      { type: 'thesis_experiment', title: '实验与数据', fields: [
        { key: 'method', label: '实验方法', payload: true },
        { key: 'conclusion', label: '结论/发现', type: 'textarea', payload: true },
      ], cardFields: [['method', '实验方法'], ['conclusion', '结论']] },
      { type: 'thesis_feedback', title: '导师反馈', fields: [
        { key: 'advisor', label: '导师/来源', payload: true },
        { key: 'followUp', label: '后续处理', type: 'textarea', payload: true },
      ], cardFields: [['advisor', '导师/来源'], ['followUp', '后续处理']] },
      { type: 'thesis_deadline', title: '关键截止时间', showTime: true, showReminder: true, showRecurrence: true, cardFields: [] },
    ],
  },
  study: {
    title: '学习计划', subtitle: '课程资料、章节目标、学习计时、复习、笔记和统计',
    timer: true,
    sections: [
      { type: 'study_course', title: '课程与学习资料', fields: [
        { key: 'category', label: '分类', payload: true, placeholder: '课程 / 书籍 / 视频 / 文章' },
        { key: 'source', label: '资料来源', payload: true },
      ], cardFields: [['category', '分类'], ['source', '资料']] },
      { type: 'study_chapter', title: '章节目标', fields: [
        { key: 'target', label: '学习目标', type: 'textarea', payload: true },
        { key: 'estimatedMinutes', label: '预计分钟', type: 'number', min: 0, payload: true },
      ], cardFields: [['target', '目标'], ['estimatedMinutes', '预计分钟', ' 分钟']] },
      { type: 'study_review', title: '复习安排', showTime: true, showReminder: true, showRecurrence: true, cardFields: [] },
      { type: 'study_note', title: '学习笔记', fields: [
        { key: 'topic', label: '主题', payload: true },
        { key: 'content', label: '笔记内容', type: 'textarea', payload: true },
      ], cardFields: [['topic', '主题']] },
    ],
  },
  development: {
    title: '开发计划', subtitle: '项目、功能拆分、缺陷、开发日志、计时与时间投入',
    timer: true,
    sections: [
      { type: 'dev_project', title: '项目', fields: [
        { key: 'description', label: '项目说明', type: 'textarea', payload: true },
      ], cardFields: [['description', '说明']] },
      { type: 'dev_feature', title: '功能拆分', parentType: 'dev_project', showSchedule: true, showPriority: true, fields: [
        { key: 'description', label: '功能说明', type: 'textarea', payload: true },
      ], cardFields: [['description', '说明']] },
      { type: 'dev_defect', title: '缺陷清单', parentType: 'dev_project', showSchedule: false, showPriority: true, fields: [
        { key: 'severity', label: '严重程度', type: 'select', options: [{ value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }, { value: 'critical', label: '严重' }], payload: true },
        { key: 'repro', label: '复现说明', type: 'textarea', payload: true },
        { key: 'resolution', label: '处理备注', type: 'textarea', payload: true },
      ], cardFields: [['severity', '严重程度'], ['repro', '复现'], ['resolution', '处理']] },
      { type: 'dev_log', title: '开发日志', showSchedule: true, showProgress: false, fields: [
        { key: 'content', label: '工作内容', type: 'textarea', payload: true },
        { key: 'minutes', label: '耗时（分钟）', type: 'number', min: 0, payload: true },
        { key: 'projectId', label: '所属项目', type: 'project-select', payload: true },
      ], cardFields: [['content', '内容'], ['minutes', '耗时', ' 分钟']] },
    ],
  },
  autumn: {
    title: '秋招每日计划', subtitle: '自定义每日事项、投递状态、笔试面试安排与面试复盘',
    sections: [
      { type: 'autumn_task', title: '每日秋招事项', showTime: true, showReminder: true, showRecurrence: true, showPriority: true, fields: [
        { key: 'category', label: '事项类型', payload: true, placeholder: '例如：刷题 / 改简历 / 复盘' },
      ], cardFields: [['category', '类型']] },
      { type: 'autumn_event', title: '笔试/面试安排', showTime: true, showReminder: true, fields: [
        { key: 'eventType', label: '安排类型', type: 'select', options: [{ value: 'exam', label: '笔试' }, { value: 'interview', label: '面试' }], payload: true },
        { key: 'format', label: '形式或说明', payload: true, placeholder: '线上 / 线下 / 链接说明' },
        { key: 'notes', label: '备注', type: 'textarea', payload: true },
      ], cardFields: [['eventType', '类型'], ['format', '形式']] },
      { type: 'autumn_application', title: '投递记录', showSchedule: true, fields: [
        { key: 'applicationStatus', label: '当前状态', type: 'select', options: [{ value: 'preparing', label: '准备投递' }, { value: 'submitted', label: '已投递' }, { value: 'written', label: '笔试中' }, { value: 'interview', label: '面试中' }, { value: 'offer', label: '已录用' }, { value: 'closed', label: '已结束' }], payload: true },
        { key: 'examAt', label: '笔试时间', type: 'datetime-local', payload: true },
        { key: 'interviewAt', label: '面试时间', type: 'datetime-local', payload: true },
        { key: 'format', label: '形式或说明', payload: true, placeholder: '线上 / 线下 / 链接说明' },
        { key: 'notes', label: '备注', type: 'textarea', payload: true },
        { key: 'review', label: '面试复盘', type: 'textarea', payload: true },
      ], cardFields: [['applicationStatus', '状态'], ['examAt', '笔试'], ['interviewAt', '面试'], ['format', '形式']] },
    ],
  },
  work: {
    title: '工作计划', subtitle: '任务优先级、会议、进展、日志与日报周报',
    sections: [
      { type: 'work_task', title: '工作任务', showTime: true, showReminder: true, showRecurrence: true, showPriority: true, fields: [
        { key: 'project', label: '所属项目', payload: true, placeholder: '填写项目或工作流名称' },
        { key: 'description', label: '任务说明', type: 'textarea', payload: true },
        { key: 'nextStep', label: '下一步', payload: true },
      ], cardFields: [['project', '项目'], ['nextStep', '下一步']] },
      { type: 'work_meeting', title: '会议安排', showTime: true, showReminder: true, fields: [
        { key: 'location', label: '地点或形式', payload: true, placeholder: '会议室 / 线上' },
        { key: 'notes', label: '会议备注', type: 'textarea', payload: true },
      ], cardFields: [['location', '地点/形式'], ['notes', '备注']] },
      { type: 'work_progress', title: '进展记录', showSchedule: true, showProgress: false, fields: [
        { key: 'taskRef', label: '所属任务或项目', payload: true },
        { key: 'content', label: '进展内容', type: 'textarea', payload: true },
        { key: 'nextStep', label: '下一步', type: 'textarea', payload: true },
      ], cardFields: [['taskRef', '关联'], ['content', '进展'], ['nextStep', '下一步']] },
      { type: 'work_log', title: '工作日志', showSchedule: true, showProgress: false, fields: [
        { key: 'content', label: '工作内容', type: 'textarea', payload: true },
        { key: 'minutes', label: '耗时（分钟）', type: 'number', min: 0, payload: true },
      ], cardFields: [['content', '内容'], ['minutes', '耗时', ' 分钟']] },
    ],
  },
};
const app = document.querySelector('#app');
const todayString = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const state = {
  route: location.hash.replace(/^#/, '') || '/',
  selectedDate: todayString(),
  theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  notice: null,
};

function applyTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  try { localStorage.setItem('pwla-theme', state.theme); } catch {}
}

const PRIORITY_LEVELS = {
  0: { label: '普通', className: 'priority-normal' },
  1: { label: '低', className: 'priority-low' },
  2: { label: '中', className: 'priority-medium' },
  3: { label: '高', className: 'priority-high' },
  4: { label: '紧急', className: 'priority-critical' },
};

function priorityInfo(priority) {
  return PRIORITY_LEVELS[Number(priority) || 0] || PRIORITY_LEVELS[0];
}

function priorityOptions(selected = 0) {
  return Object.entries(PRIORITY_LEVELS).map(([value, level]) => `<option value="${value}" ${Number(selected) === Number(value) ? 'selected' : ''}>${value === '0' ? level.label : `P${value} · ${level.label}`}</option>`).join('');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
  return data;
}

function showNotice(message, kind = 'success') {
  state.notice = { message, kind };
  renderNotice();
}

function renderNotice() {
  let node = document.querySelector('#notice');
  if (!state.notice) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement('div');
    node.id = 'notice';
    document.body.appendChild(node);
  }
  node.className = `notice ${state.notice.kind}`;
  node.textContent = state.notice.message;
  clearTimeout(renderNotice.timer);
  renderNotice.timer = setTimeout(() => { state.notice = null; renderNotice(); }, 3200);
}

function shell(content) {
  const active = state.route;
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">生</span><span>个人工作生活</span></div>
      <nav id="nav">
        ${NAV_ITEMS.map((item) => `<a href="#${item.path}" class="${active === item.path ? 'active' : ''}"><span class="nav-icon">${item.icon}</span>${item.label}</a>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-connection"><span class="status-dot"></span><span>本地数据已连接</span></div>
        <button class="theme-toggle" data-action="toggle-theme" title="切换浅色/深色主题">${state.theme === 'dark' ? '☀ 浅色模式' : '☾ 深色模式'}</button>
      </div>
    </aside>
    <main class="main">${content}</main>
  `;
  renderNotice();
}

function pageHeader(title, subtitle, extra = '') {
  return `
    <header class="page-header">
      <div><p class="eyebrow">LOCAL WORKSPACE</p><h1>${escapeHtml(title)}</h1><p class="subtitle">${escapeHtml(subtitle)}</p></div>
      ${extra}
    </header>
  `;
}

function taskRow(item, options = {}) {
  const showDate = Boolean(options.showDate);
  const controls = Boolean(options.controls);
  const occurrenceDate = options.date || item.occurrenceDate || item.date || state.selectedDate;
  const action = item.completedForOccurrence ? 'uncomplete' : 'complete';
  return `
    <article class="task-row ${item.completedForOccurrence ? 'completed' : ''}" data-id="${item.id}">
      <button class="check" data-action="${action}" data-id="${item.id}" data-date="${occurrenceDate}" title="${item.completedForOccurrence ? '取消完成' : '完成'}">${item.completedForOccurrence ? '✓' : ''}</button>
      <div class="task-body">
        <div class="task-title-line">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.priority > 0 ? `<span class="pill priority ${priorityInfo(item.priority).className}">P${item.priority} · ${priorityInfo(item.priority).label}</span>` : '<span class="pill priority priority-normal">普通</span>'}
          ${item.scheduledTime ? `<span class="pill">${escapeHtml(item.scheduledTime)}</span>` : ''}
          ${showDate && item.date ? `<span class="pill">${escapeHtml(item.date)}</span>` : ''}
        </div>
        ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        <div class="meta-line">
          <span>${escapeHtml(moduleLabel(item.module))}</span>
          <span>进度 ${item.effectiveProgress ?? 0}%</span>
          ${item.autoProgress !== null ? `<span>自动 ${item.autoProgress}%</span>` : ''}
          ${item.manualProgress !== null ? `<span>手动 ${item.manualProgress}%</span>` : ''}
          ${item.occurrenceState?.completed_at || item.completedAt ? `<span>完成于 ${escapeHtml(String(item.occurrenceState?.completed_at || item.completedAt).replace('T', ' '))}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="ghost small" data-action="progress" data-id="${item.id}" data-date="${occurrenceDate}">进度</button>
        ${controls ? `<button class="ghost small" data-action="edit-entity" data-id="${item.id}">编辑</button><button class="text-danger" data-action="delete-entity" data-id="${item.id}">删除</button>` : ''}
      </div>
    </article>
  `;
}

function moduleLabel(module) {
  return { home: '首页', today: '今日计划', thesis: '毕设论文', study: '学习计划', development: '开发计划', autumn: '秋招', work: '工作' }[module] || module;
}

async function renderHome() {
  const data = await api(`/api/home?date=${state.selectedDate}`);
  const modules = ['thesis', 'study', 'development', 'autumn', 'work'];
  const todayItems = [...(data.todayAll || data.today)].sort((a, b) => Number(a.completedForOccurrence) - Number(b.completedForOccurrence));
  const content = `
    ${pageHeader('首页总览', `${state.selectedDate} · 今天最值得关注的事情都在这里`, `<button class="primary" data-action="go-today">打开今日计划</button>`)}
    <section class="stat-grid home-stats">
      <div class="stat-card accent"><span>今日未完成 / 已完成</span><strong>${data.counts.todayOpen} / ${data.counts.todayCompleted}</strong><small>完成后会保留在所属模块</small></div>
      <div class="stat-card"><span>下一条提醒</span><strong class="small-value">${data.nextReminder ? escapeHtml(data.nextReminder.dueAt.replace('T', ' ')) : '暂无'}</strong><small>${data.nextReminder ? escapeHtml(data.nextReminder.title) : '可在计划中设置提醒'}</small></div>
      <div class="stat-card"><span>最近自动备份</span><strong class="small-value">${data.backup.lastBackupAt ? escapeHtml(data.backup.lastBackupAt) : '尚未备份'}</strong><small>${data.backup.lastBackupStatus || (data.backup.autoBackup ? '等待首次备份' : '自动备份已关闭')}</small></div>
      <div class="stat-card"><span>快速备忘</span><strong>${data.memos.length}</strong><small>条备忘</small></div>
    </section>
    <section class="panel overall-progress-panel">
      <div class="panel-head"><div><p class="eyebrow">OVERALL PROGRESS</p><h2>总进度</h2></div><strong class="overall-percent">${data.overallProgress.percent}%</strong></div>
      <div class="progress-bar overall-progress-bar"><i style="width:${Math.max(0, Math.min(100, data.overallProgress.percent))}%"></i></div>
      <p class="hint">已完成 ${data.overallProgress.completed} / ${data.overallProgress.total} 项可执行记录，手动进度和完成状态均计入总进度。</p>
    </section>
    <section class="content-grid">
      <div class="panel wide">
        <div class="panel-head"><div><p class="eyebrow">TODAY</p><h2>今日计划摘要</h2></div><span class="count">${todayItems.length}</span></div>
        <div class="task-list">${todayItems.length ? todayItems.map((item) => taskRow(item)).join('') : '<div class="empty">今天没有计划事项</div>'}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><p class="eyebrow">QUICK MEMO</p><h2>快速备忘</h2></div></div>
        <form class="compact-form" data-form="memo">
          <input name="title" placeholder="备忘标题" required />
          <textarea name="content" placeholder="随手记下..." rows="3"></textarea>
          <input name="checklist" placeholder="清单项用逗号分隔（可选）" />
          <label class="inline-check"><input type="checkbox" name="pinned" /> 置顶</label>
          <button class="primary" type="submit">添加备忘</button>
        </form>
        <div class="memo-list">
          ${data.memos.map(memoCard).join('') || '<div class="empty">还没有备忘</div>'}
        </div>
      </div>
    </section>
    <section class="module-grid">
      ${modules.map((module) => summaryCard(module, data.summary[module])).join('')}
      <a class="module-card" href="#/settings"><div><span class="module-kicker">数据与设置</span><strong>${data.backup.autoBackup ? '正常' : '关注'}</strong><p>备份与数据目录</p></div><div class="progress-ring" style="--value:${data.backup.lastBackupStatus === 'success' ? '100%' : '0%'}">→</div></a>
    </section>
  `;
  shell(content);
}

function summaryCard(module, summary = { total: 0, open: 0, completed: 0 }) {
  const info = MODULE_INFO[module];
  const percent = summary.progress ?? (summary.total ? Math.round((summary.completed / summary.total) * 100) : 0);
  return `<a class="module-card" href="#/${module}">
    <div><span class="module-kicker">${escapeHtml(info.title)}</span><strong>${summary.open}</strong><p>${escapeHtml(summary.detail || (summary.open ? '项待处理' : '当前无待处理事项'))}</p></div>
    <div class="progress-ring" style="--value:${percent}%">${percent}%</div>
  </a>`;
}

function memoCard(memo) {
  return `<article class="memo-card ${memo.pinned ? 'pinned' : ''}" data-id="${memo.id}">
    <div class="memo-head"><strong>${escapeHtml(memo.title)}</strong><button class="icon-button" data-action="pin-memo" data-id="${memo.id}" title="置顶">${memo.pinned ? '★' : '☆'}</button></div>
    ${memo.content ? `<p>${escapeHtml(memo.content)}</p>` : ''}
    <div class="checklist">${(memo.checklist || []).map((item, index) => `<label><input type="checkbox" data-action="toggle-check" data-id="${memo.id}" data-index="${index}" ${item.done ? 'checked' : ''}/> <span class="${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span></label>`).join('')}</div>
    <div class="memo-actions">
      ${memo.convertedEntityId ? '<span class="pill success">已转今日计划</span>' : `<button class="ghost small" data-action="convert-memo" data-id="${memo.id}">转为今日计划</button>`}
      <button class="text-danger" data-action="delete-memo" data-id="${memo.id}">删除</button>
    </div>
  </article>`;
}

async function renderToday() {
  const [data, completedData] = await Promise.all([
    api(`/api/today?date=${state.selectedDate}`),
    api(`/api/today?date=${state.selectedDate}&includeCompleted=true`),
  ]);
  const completedItems = completedData.items.filter((item) => item.completedForOccurrence);
  const allItems = [...data.items, ...completedItems].sort((a, b) => Number(a.completedForOccurrence) - Number(b.completedForOccurrence));
  const content = `
    ${pageHeader('今日计划', '统一安排自己的事项，并自动汇总各模块当天的计划', `
      <label class="date-control">日期 <input type="date" value="${state.selectedDate}" data-action="change-date" /></label>
    `)}
    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">ADD</p><h2>添加今日事项</h2></div><span class="count">${data.items.length} 项未完成</span></div>
      <form class="today-task-form" data-form="today-task">
        <div class="form-grid today-task-grid">
          <label class="field wide"><span>事项标题</span><input name="title" placeholder="要做什么？" required /></label>
          <label class="field"><span>计划时间</span><input name="scheduledTime" type="time" /></label>
          <label class="field"><span>优先级</span><select name="priority">${priorityOptions(0)}</select></label>
          <label class="field"><span>重复规则</span><select name="repeat"><option value="none">不重复</option><option value="daily">每天</option><option value="weekly">每周</option><option value="monthly">每月</option><option value="custom">自定义周期</option></select></label>
          <label class="field"><span>重复间隔</span><input name="repeatInterval" type="number" min="1" value="1" /></label>
          <label class="field"><span>自定义单位</span><select name="repeatUnit"><option value="day">天</option><option value="week">周</option><option value="month">月</option></select></label>
          <label class="field"><span>提前提醒（分钟）</span><input name="reminderMinutes" type="number" min="0" value="10" /></label>
          <label class="field wide"><span>备注</span><input name="notes" placeholder="补充说明（可选）" /></label>
        </div>
        <div class="form-actions"><button class="primary" type="submit">添加今日事项</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">SCHEDULE</p><h2>${state.selectedDate} 的计划（含已完成记录）</h2></div><span class="count">${data.items.length} 未完成 · ${completedItems.length} 已完成</span></div>
      <div class="task-list">${allItems.length ? allItems.map((item) => taskRow(item)).join('') : '<div class="empty">这一天还没有计划事项</div>'}</div>
    </section>
  `;
  shell(content);
}

function renderField(field, entity, allEntities = []) {
  const value = entity ? (field.payload ? entity.payload?.[field.key] : entity[field.key]) : '';
  const common = `name="${field.key}" ${field.payload ? 'data-payload="true"' : ''} ${field.required ? 'required' : ''}`;
  if (field.type === 'textarea') {
    return `<label class="field wide"><span>${escapeHtml(field.label)}</span><textarea ${common} rows="3" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(value || '')}</textarea></label>`;
  }
  if (field.type === 'select') {
    return `<label class="field"><span>${escapeHtml(field.label)}</span><select ${common}>${field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select></label>`;
  }
  if (field.type === 'project-select') {
    return `<label class="field"><span>${escapeHtml(field.label)}</span><select ${common}><option value="">不关联</option>${allEntities.filter((item) => item.type === 'dev_project').map((item) => `<option value="${item.id}" ${String(value) === item.id ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}</select></label>`;
  }
  return `<label class="field"><span>${escapeHtml(field.label)}</span><input ${common} type="${field.type || 'text'}" value="${escapeHtml(value || '')}" ${field.min !== undefined ? `min="${field.min}"` : ''} placeholder="${escapeHtml(field.placeholder || '')}" /></label>`;
}

function renderEntityForm(section, module, entities, allEntities = []) {
  const editing = state.editing?.type === section.type && state.editing?.module === module ? state.editing : null;
  const recurrenceFreq = editing?.recurrence?.freq || 'none';
  return `<form class="entity-form" data-form="entity" data-module="${module}" data-type="${section.type}">
    <input type="hidden" name="entityId" value="${editing?.id || ''}" />
    <div class="form-grid">
      <label class="field wide"><span>标题</span><input name="title" value="${escapeHtml(editing?.title || '')}" required placeholder="填写${escapeHtml(section.title)}" /></label>
      <label class="field"><span>状态</span><select name="status">
        ${[['todo','待处理'],['doing','进行中'],['completed','已完成'],['blocked','受阻']].map(([value,label]) => `<option value="${value}" ${editing?.status === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      ${section.schedule === false ? '' : `<label class="field"><span>日期</span><input name="date" type="date" value="${escapeHtml(editing?.date || state.selectedDate)}" /></label>`}
      ${section.showTime ? `<label class="field"><span>时间</span><input name="scheduledTime" type="time" value="${escapeHtml(editing?.scheduledTime || '')}" /></label>` : ''}      ${section.showPriority ? `<label class="field"><span>优先级</span><select name="priority">${priorityOptions(editing?.priority || 0)}</select></label>` : ''}      ${section.parentType ? `<label class="field"><span>所属项目</span><select name="parentId"><option value="">不关联</option>${allEntities.filter((item) => item.type === section.parentType).map((item) => `<option value="${item.id}" ${editing?.parentId === item.id ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}</select></label>` : ''}
      ${section.showReminder ? `<label class="field"><span>提前提醒（分钟）</span><input name="reminderMinutes" type="number" min="0" value="${editing?.reminderMinutes ?? 10}" /></label>` : ''}
      ${section.showRecurrence ? `<label class="field"><span>重复</span><select name="recurrenceFreq">${[['none','不重复'],['daily','每天'],['weekly','每周'],['monthly','每月'],['custom','自定义周期']].map(([value,label]) => `<option value="${value}" ${recurrenceFreq === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}      ${section.showRecurrence ? `<label class="field"><span>重复间隔</span><input name="recurrenceInterval" type="number" min="1" value="${editing?.recurrence?.interval || 1}" /></label><label class="field"><span>自定义单位</span><select name="customUnit">${[['day','天'],['week','周'],['month','月']].map(([value,label]) => `<option value="${value}" ${editing?.recurrence?.unit === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}
      ${(section.fields || []).map((field) => renderField(field, editing)).join('')}
      <label class="field"><span>手动进度（%）</span><input name="manualProgress" type="number" min="0" max="100" value="${editing?.manualProgress ?? ''}" /></label>
      <label class="field wide"><span>进度说明 / 备注</span><textarea name="progressNote" rows="2">${escapeHtml(editing?.progressNote || '')}</textarea></label>
    </div>
    <div class="form-actions"><button class="primary" type="submit">${editing ? '保存修改' : '添加'}</button>${editing ? '<button class="ghost" type="button" data-action="cancel-edit">取消编辑</button>' : ''}</div>
  </form>`;
}

function payloadSummary(item, section) {
  if (!section.cardFields?.length) return '';
  return `<div class="entity-facts">${section.cardFields.map(([key, label, suffix = '']) => {
    const value = item.payload?.[key];
    if (value === undefined || value === null || value === '') return '';
    return `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}${suffix}</span>`;
  }).join('')}</div>`;
}

function moduleEntityCard(item, section, module) {
  const date = item.recurrence?.freq && item.recurrence.freq !== 'none' ? state.selectedDate : (item.date || state.selectedDate);
  return `<div class="entity-card">${taskRow({ ...item, completedForOccurrence: item.completedForOccurrence }, { showDate: true, controls: true, date })}${payloadSummary(item, section)}</div>`;
}

function renderTimer(module, entities) {
  if (!['study', 'development'].includes(module)) return '';
  const candidates = entities.filter((item) => ['study_course', 'study_chapter'].includes(item.type));
  return `<section class="panel timer-panel" data-timer-module="${module}">
    <div class="panel-head"><div><p class="eyebrow">FOCUS TIMER</p><h2>学习计时</h2></div><strong class="timer-display" data-timer-elapsed>00:00:00</strong></div>
    <form class="timer-form" data-form="timer-start">
      <label class="field"><span>关联课程或章节</span><select name="entityId"><option value="">不关联</option>${candidates.map((item) => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('')}</select></label>
      <label class="field"><span>模式</span><select name="mode"><option value="pomodoro">番茄钟 25 分钟</option><option value="stopwatch">正向计时</option></select></label>
      <button class="primary" type="submit">开始计时</button>
    </form>
    <div class="timer-actions"><button class="ghost" data-action="timer-pause">暂停</button><button class="ghost" data-action="timer-resume">继续</button><button class="ghost" data-action="timer-stop">结束并记录</button></div>
    <p class="hint">番茄钟和正向计时均会保存到本地；刷新页面后计时状态仍可恢复。</p>
  </section>`;
}

async function hydrateTimer(module) {
  if (!['study', 'development'].includes(module)) return;
  const data = await api(`/api/timer/${module}`);
  const node = document.querySelector('[data-timer-elapsed]');
  if (!node) return;
  const renderValue = () => {
    const live = data.timer?.running && data.timer.startedAt ? data.elapsedSeconds + Math.floor((Date.now() - new Date(data.timer.startedAt).getTime()) / 1000) : data.elapsedSeconds;
    const seconds = Math.max(0, live || 0);
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    node.textContent = `${h}:${m}:${s}`;
  };
  renderValue();
  clearInterval(hydrateTimer.timer);
  if (data.timer?.running) hydrateTimer.timer = setInterval(renderValue, 1000);
}

async function renderModuleInsights(route, items) {
  if (route === 'development') {
    const stats = await api(`/api/development/stats?date=${state.selectedDate}`);
    const projects = items.filter((item) => item.type === 'dev_project');
    return `<section class="panel insights-panel">
      <div class="panel-head"><div><p class="eyebrow">PROJECT PULSE</p><h2>项目整体进度与时间统计</h2></div><span class="count">${stats.totals.totalSeconds ? Math.round(stats.totals.totalSeconds / 60) + ' 分钟' : '暂无投入'}</span></div>
      <div class="stat-grid small-stats"><div class="stat-card"><span>项目</span><strong>${stats.totals.projects}</strong><small>${stats.totals.openProjects} 个进行中</small></div><div class="stat-card"><span>未关闭缺陷</span><strong>${stats.totals.openDefects}</strong><small>及时处理高优先级问题</small></div><div class="stat-card"><span>今日投入</span><strong>${Math.round(stats.totals.todaySeconds / 60)} 分钟</strong><small>计时与手动补录合计</small></div></div>
      <div class="project-progress-list">${stats.projects.map((project) => `<div><strong>${escapeHtml(project.title)}</strong><span>${project.effectiveProgress}%</span><div class="progress-bar"><i style="width:${Math.max(0, Math.min(100, project.effectiveProgress))}%"></i></div><small>${project.featureCompleted}/${project.featureTotal} 功能完成 · ${project.openDefects} 个缺陷待处理</small></div>`).join('') || '<div class="empty">先创建项目与功能拆分</div>'}</div>
      <form class="compact-form manual-time-form" data-form="manual-dev-time"><div class="form-grid"><label class="field wide"><span>补录说明</span><input name="title" placeholder="例如：调试登录流程" /></label><label class="field"><span>补录分钟</span><input name="minutes" type="number" min="1" max="1440" required /></label><label class="field"><span>关联项目</span><select name="linkedEntityId"><option value="">不关联</option>${projects.map((project) => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('')}</select></label><label class="field"><span>日期</span><input name="date" type="date" value="${state.selectedDate}" /></label></div><button class="primary" type="submit">手动补录时间</button></form>
    </section>`;
  }
  if (route === 'autumn') {
    const summary = await api(`/api/autumn/summary?date=${state.selectedDate}`);
    const next = summary.nextExamOrInterview;
    return `<section class="panel insights-panel"><div class="panel-head"><div><p class="eyebrow">APPLICATION PULSE</p><h2>投递与笔试面试安排</h2></div><span class="count">${summary.applications.length} 条投递</span></div><div class="stat-grid small-stats"><div class="stat-card accent"><span>下一场笔试/面试</span><strong>${next ? escapeHtml(String(next.at).replace('T', ' ')) : '暂无安排'}</strong><small>${next ? escapeHtml(next.title) : '可在投递记录中安排时间'}</small></div><div class="stat-card"><span>进行中的流程</span><strong>${Object.values(summary.statusCounts).reduce((sum, value) => sum + value, 0)}</strong><small>自定义事项与投递分别管理</small></div><div class="stat-card"><span>每日事项</span><strong>${items.filter((item) => item.type === 'autumn_task' && item.status !== 'completed').length}</strong><small>自动汇总到今日计划</small></div></div></section>`;
  }
  if (route === 'work') {
    const reports = await api('/api/work/reports');
    const tasks = items.filter((item) => item.type === 'work_task').sort((a, b) => b.priority - a.priority);
    const highest = tasks.find((item) => item.status !== 'completed');
    return `<section class="panel insights-panel">
      <div class="panel-head"><div><p class="eyebrow">WORK PULSE</p><h2>当前重点与日报周报</h2></div><span class="count">${tasks.filter((item) => item.status !== 'completed').length} 项待处理</span></div>
      <div class="stat-grid small-stats"><div class="stat-card accent"><span>最高优先级事项</span><strong>${highest ? `P${highest.priority || 0}` : '—'}</strong><small>${highest ? escapeHtml(highest.title) : '当前没有待处理任务'}</small></div><div class="stat-card"><span>日报</span><strong>${reports.items.filter((item) => item.payload?.periodType === 'daily').length}</strong><small>已生成并保存</small></div><div class="stat-card"><span>周报</span><strong>${reports.items.filter((item) => item.payload?.periodType === 'weekly').length}</strong><small>按本周事项自动汇总</small></div></div>
      <div class="report-generator-grid">
        <form class="compact-form report-form" data-form="work-report" data-period="daily"><label class="field"><span>日报日期与补充说明</span><input name="date" type="date" value="${state.selectedDate}" /></label><textarea name="manualNote" rows="2" placeholder="手动补充说明（可选）"></textarea><button class="primary" type="submit">生成日报</button></form>
        <form class="compact-form report-form" data-form="work-report" data-period="weekly"><label class="field"><span>周报所在日期</span><input name="date" type="date" value="${state.selectedDate}" /></label><textarea name="manualNote" rows="2" placeholder="手动补充说明（可选）"></textarea><button class="primary" type="submit">生成周报</button></form>
      </div>
      <div class="report-list">${reports.items.slice(0, 8).map((report) => `<article class="report-card"><div class="memo-head"><strong>${escapeHtml(report.title)}</strong><span class="pill">${report.payload?.periodType === 'daily' ? '日报' : '周报'}</span></div><pre>${escapeHtml(report.payload?.generatedText || '')}</pre>${report.payload?.manualNote ? `<p><b>手动补充：</b>${escapeHtml(report.payload.manualNote)}</p>` : ''}<form class="compact-form report-note-form" data-form="work-report-note" data-id="${report.id}"><textarea name="manualNote" rows="2">${escapeHtml(report.payload?.manualNote || '')}</textarea><button class="ghost" type="submit">保存手动补充</button></form></article>`).join('') || '<div class="empty">生成第一份日报或周报后，会保存在这里</div>'}</div>
    </section>`;
  }
  return '';
}
async function renderModulePage(route) {
  const config = MODULE_CONFIGS[route];
  const data = await api(`/api/entities?module=${route}`);
  const byType = new Map(config.sections.map((section) => [section.type, []]));
  for (const item of data.items) if (byType.has(item.type)) byType.get(item.type).push(item);
  const content = `
    ${pageHeader(config.title, config.subtitle, `<button class="primary" data-action="new-entity">新增记录</button>`)}
    ${renderTimer(route, data.items)}
    ${await renderModuleInsights(route, data.items)}
    <div class="section-stack">
      ${config.sections.map((section) => {
        const sectionItems = byType.get(section.type);
        const activeItems = sectionItems.filter((item) => !['completed', 'done', 'closed'].includes(item.status));
        const archivedItems = sectionItems.filter((item) => ['completed', 'done', 'closed'].includes(item.status));
        const editingSection = state.editing?.module === route && state.editing?.type === section.type;
        return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">${escapeHtml(section.title)}</p><h2>${escapeHtml(section.title)}</h2></div><span class="count">${sectionItems.length} 条</span></div><details class="add-form-disclosure" ${editingSection ? 'open' : ''}><summary>+ 添加${escapeHtml(section.title)}</summary>${renderEntityForm(section, route, sectionItems, data.items)}</details><div class="entity-list">${activeItems.map((item) => moduleEntityCard(item, section, route)).join('') || '<div class="empty">暂无待处理记录</div>'}</div>${archivedItems.length ? `<details class="completed-archive" open><summary>已完成存档 · ${archivedItems.length} 条</summary><div class="entity-list archived-list">${archivedItems.map((item) => moduleEntityCard(item, section, route)).join('')}</div></details>` : ''}</section>`;
      }).join('')}
    </div>
  `;
  shell(content);
  await hydrateTimer(route);
}
async function renderSettings() {
  const data = await api('/api/settings');
  const settings = data.settings;
  const backups = data.backups || [];
  const lastBackup = settings.lastBackupAt ? `${settings.lastBackupAt} · ${settings.lastBackupStatus || '未知'}` : '尚未备份';
  const modules = ['today', 'thesis', 'study', 'development', 'autumn', 'work'];
  shell(`
    ${pageHeader('数据与设置', '本地目录、提醒、备份恢复、自启动、悬浮窗和导出', '<div class="header-actions"><button class="ghost" data-action="open-overlay">打开悬浮窗</button><button class="primary" data-action="manual-backup">立即备份</button></div>')}
    <div class="stat-grid">
      <div class="stat-card accent"><span>当前数据目录</span><strong class="path-value">${escapeHtml(data.dataRoot)}</strong><small>${data.writable ? '目录可写，数据正常保存' : '目录不可写，请立即处理'}</small></div>
      <div class="stat-card"><span>最近备份</span><strong class="small-value">${escapeHtml(lastBackup)}</strong><small>备份数量 ${backups.length}</small></div>
      <div class="stat-card"><span>自动备份</span><strong>${settings.autoBackup ? '开启' : '关闭'}</strong><small>保留 ${settings.backupRetention} 个版本</small></div>
    </div>
    <div class="content-grid settings-grid">
      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">NOTIFICATIONS</p><h2>提醒与桌面</h2></div></div>
        <form class="form-grid settings-form" data-form="settings">
          <label class="field"><span>提醒声音</span><select name="reminderSound"><option value="true" ${settings.reminderSound ? 'selected' : ''}>开启</option><option value="false" ${!settings.reminderSound ? 'selected' : ''}>关闭</option></select></label>
          <label class="field"><span>默认提前提醒（分钟）</span><input name="defaultReminderMinutes" type="number" min="0" max="1440" value="${settings.defaultReminderMinutes}" /></label>
          <label class="field"><span>免打扰开始</span><input name="dndStart" type="time" value="${escapeHtml(settings.dndStart)}" /></label>
          <label class="field"><span>免打扰结束</span><input name="dndEnd" type="time" value="${escapeHtml(settings.dndEnd)}" /></label>
          <label class="field"><span>开机自启动</span><select name="autoStart"><option value="true" ${settings.autoStart ? 'selected' : ''}>开启</option><option value="false" ${!settings.autoStart ? 'selected' : ''}>关闭</option></select></label>
          <label class="field"><span>悬浮窗口</span><select name="overlayEnabled"><option value="true" ${settings.overlayEnabled ? 'selected' : ''}>显示</option><option value="false" ${!settings.overlayEnabled ? 'selected' : ''}>隐藏</option></select></label>
          <label class="field"><span>悬浮窗口置顶</span><select name="overlayTopMost"><option value="true" ${settings.overlayTopMost ? 'selected' : ''}>是</option><option value="false" ${!settings.overlayTopMost ? 'selected' : ''}>否</option></select></label>
          <label class="field"><span>悬浮窗口收起</span><select name="overlayCollapsed"><option value="false" ${!settings.overlayCollapsed ? 'selected' : ''}>展开</option><option value="true" ${settings.overlayCollapsed ? 'selected' : ''}>收起</option></select></label>
          <div class="form-actions wide"><button class="primary" type="submit">保存提醒与桌面设置</button></div>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head"><div><p class="eyebrow">BACKUP POLICY</p><h2>自动备份与数据目录</h2></div></div>
        <form class="form-grid settings-form" data-form="settings">
          <label class="field"><span>自动备份</span><select name="autoBackup"><option value="true" ${settings.autoBackup ? 'selected' : ''}>开启</option><option value="false" ${!settings.autoBackup ? 'selected' : ''}>关闭</option></select></label>
          <label class="field"><span>保留版本数</span><input name="backupRetention" type="number" min="1" max="100" value="${settings.backupRetention}" /></label>
          <div class="form-actions wide"><button class="primary" type="submit">保存备份设置</button></div>
        </form>
        <form class="compact-form data-directory-form" data-form="data-directory"><label class="field"><span>更换数据保存目录</span><input name="path" value="${escapeHtml(data.dataRoot)}" required /></label><p class="hint">切换前会自动创建安全备份，目标目录已有数据库时不会覆盖。</p><button class="ghost" type="submit">校验并切换目录</button></form>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><div><p class="eyebrow">BACKUP HISTORY</p><h2>备份历史与恢复</h2></div><span class="count">${backups.length} 个备份</span></div>
      <div class="backup-list">${backups.map((item) => `<div class="backup-row"><div><strong>${escapeHtml(item.kind)}</strong><p>${escapeHtml(item.createdAt)} · ${escapeHtml(item.path)}</p></div><span class="pill ${item.exists ? 'success' : 'priority'}">${item.exists ? '文件可用' : '文件缺失'}</span><button class="ghost small" data-action="restore-backup" data-id="${item.id}" ${item.exists ? '' : 'disabled'}>恢复</button></div>`).join('') || '<div class="empty">还没有备份记录，请先立即备份</div>'}</div>
    </section>
    <section class="panel export-panel">
      <div class="panel-head"><div><p class="eyebrow">OFFLINE EXPORT</p><h2>Excel / CSV 与完整数据包</h2></div><a class="primary download-link" href="/api/exports/package">导出完整数据包</a></div>
      <div class="export-grid">${modules.map((module) => `<div class="export-card"><strong>${escapeHtml(moduleLabel(module))}</strong><div><a class="ghost small" href="/api/exports/${module}?format=csv">CSV</a><a class="ghost small" href="/api/exports/${module}?format=xls">Excel</a></div></div>`).join('')}</div>
      <p class="hint">完整数据包包含数据库、设置和全部模块 CSV，可在空测试目录中完成恢复验证。</p>
    </section>
  `);
}
function renderPlaceholder(route) {
  const info = MODULE_INFO[route] || { title: '页面', subtitle: '' };
  shell(`
    ${pageHeader(info.title, info.subtitle)}
    <section class="panel placeholder">
      <div class="placeholder-mark">${escapeHtml(info.title.slice(0, 1))}</div>
      <h2>模块正在搭建</h2>
      <p>该模块的完整场景功能会在后续开发阶段接入。</p>
    </section>
  `);
}

async function render() {
  state.route = location.hash.replace(/^#/, '') || '/';
  try {
    if (state.route === '/') await renderHome();
    else if (state.route === '/today') await renderToday();
    else if (MODULE_CONFIGS[state.route.slice(1)]) await renderModulePage(state.route.slice(1));
    else if (state.route === '/settings') await renderSettings();
    else renderPlaceholder(state.route.slice(1));
  } catch (error) {
    shell(`<section class="panel error-panel"><h2>页面加载失败</h2><p>${escapeHtml(error.message)}</p><button class="primary" data-action="reload">重新加载</button></section>`);
  }
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  try {
    if (action === 'toggle-theme') {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      await render();
      return;
    }
    if (action === 'open-overlay') {
      await api('/api/desktop/overlay', { method: 'POST', body: '{}' });
      showNotice('已发送悬浮窗显示请求');
      return;
    }
    if (action === 'manual-backup') {
      await api('/api/backups/manual', { method: 'POST', body: '{}' });
      showNotice('备份已完成');
      await render();
      return;
    }
    if (action === 'restore-backup') {
      if (!confirm('恢复会用所选备份覆盖当前数据，并先自动创建安全备份。确定继续？')) return;
      await api('/api/backups/restore', { method: 'POST', body: JSON.stringify({ id }) });
      showNotice('数据恢复完成，安全备份已保留');
      await render();
      return;
    }    if (action === 'go-today') { location.hash = '#/today'; return; }
    if (action === 'reload') { await render(); return; }
    if (action === 'complete' || action === 'uncomplete') {
      await api(`/api/entities/${id}/${action}`, { method: 'POST', body: JSON.stringify({ date: target.dataset.date }) });
      showNotice(action === 'complete' ? '已完成，事项已从今日计划移除' : '已恢复为未完成');
      await render();
      return;
    }
    if (action === 'new-entity') {
      state.editing = null;
      document.querySelector('.entity-form input[name="title"]')?.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'edit-entity') {
      const entity = (await api(`/api/entities/${id}`)).item;
      state.editing = entity;
      await render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'cancel-edit') { state.editing = null; await render(); return; }
    if (action === 'delete-entity') {
      if (!confirm('确定删除这条记录？')) return;
      await api(`/api/entities/${id}`, { method: 'DELETE' });
      if (state.editing?.id === id) state.editing = null;
      showNotice('记录已删除');
      await render();
      return;
    }
    if (action.startsWith('timer-')) {
      const module = state.route.slice(1);
      await api(`/api/timer/${module}/${action.replace('timer-', '')}`, { method: 'POST', body: '{}' });
      showNotice(action === 'timer-stop' ? '计时已结束并生成记录' : '计时状态已更新');
      await render();
      return;
    }
    if (action === 'progress') {
      const current = target.closest('.task-row').querySelector('.meta-line')?.textContent || '';
      const value = prompt('手动进度（0-100，输入空值清除）', '');
      if (value === null) return;
      const note = prompt('进度说明', '') ?? '';
      await api(`/api/entities/${id}/progress`, { method: 'POST', body: JSON.stringify({ manualProgress: value === '' ? null : Number(value), progressNote: note, date: target.dataset.date }) });
      showNotice(`进度已更新 ${current ? '' : ''}`);
      await render();
      return;
    }
    if (action === 'pin-memo') {
      const memo = (await api('/api/memos')).items.find((item) => item.id === id);
      await api(`/api/memos/${id}`, { method: 'PUT', body: JSON.stringify({ pinned: !memo.pinned }) });
      await render();
      return;
    }
    if (action === 'toggle-check') {
      const memos = (await api('/api/memos')).items;
      const memo = memos.find((item) => item.id === id);
      const index = Number(target.dataset.index);
      memo.checklist[index].done = target.checked;
      await api(`/api/memos/${id}`, { method: 'PUT', body: JSON.stringify({ checklist: memo.checklist }) });
      await render();
      return;
    }
    if (action === 'convert-memo') {
      await api(`/api/memos/${id}/convert`, { method: 'POST', body: JSON.stringify({ date: state.selectedDate }) });
      showNotice('备忘已转为今日计划');
      await render();
      return;
    }
    if (action === 'delete-memo') {
      if (!confirm('确定删除这条备忘？')) return;
      await api(`/api/memos/${id}`, { method: 'DELETE' });
      await render();
      return;
    }
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.dataset.action === 'change-date') {
    state.selectedDate = event.target.value;
    await render();
  }
  if (event.target.dataset.action === 'toggle-check') {
    const id = event.target.dataset.id;
    const memos = (await api('/api/memos')).items;
    const memo = memos.find((item) => item.id === id);
    const index = Number(event.target.dataset.index);
    memo.checklist[index].done = event.target.checked;
    await api(`/api/memos/${id}`, { method: 'PUT', body: JSON.stringify({ checklist: memo.checklist }) });
    await render();
  }
});

app.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const formData = new FormData(form);
  try {
    if (form.dataset.form === 'settings') {
      const body = {};
      for (const [key, value] of formData.entries()) {
        if (['autoBackup', 'reminderSound', 'autoStart', 'overlayEnabled', 'overlayTopMost', 'overlayCollapsed'].includes(key)) body[key] = value === 'true';
        else if (['backupRetention', 'defaultReminderMinutes'].includes(key)) body[key] = Number(value);
        else body[key] = value;
      }
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
      showNotice('设置已保存');
      await render();
      return;
    }
    if (form.dataset.form === 'data-directory') {
      if (!confirm('切换数据目录会复制当前数据并更新启动指针，确定继续？')) return;
      const result = await api('/api/data-directory', { method: 'POST', body: JSON.stringify({ path: formData.get('path') }) });
      showNotice(`数据目录已切换到 ${result.dataRoot}`);
      await render();
      return;
    }    if (form.dataset.form === 'entity') {
      const entityId = String(formData.get('entityId') || '');
      const payload = {};
      for (const input of form.querySelectorAll('[data-payload="true"]')) {
        payload[input.name] = input.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value;
      }
      const freq = String(formData.get('recurrenceFreq') || 'none');
      const body = {
        module: String(form.dataset.module), type: String(form.dataset.type),
        title: String(formData.get('title') || ''), status: String(formData.get('status') || 'todo'),
        date: formData.get('date') || null, scheduledTime: formData.get('scheduledTime') || null,
        reminderMinutes: Number(formData.get('reminderMinutes') || 0),
        manualProgress: formData.get('manualProgress') === '' ? null : Number(formData.get('manualProgress')),
        progressNote: String(formData.get('progressNote') || ''),
        parentId: formData.get('parentId') || null,
        priority: Number(formData.get('priority') || 0),
        recurrence: freq === 'none' ? { freq: 'none' } : { freq, interval: Number(formData.get('recurrenceInterval') || 1), unit: String(formData.get('customUnit') || 'day') },
        payload: entityId && state.editing ? { ...(state.editing.payload || {}), ...payload } : payload,
      };
      if (entityId) await api(`/api/entities/${entityId}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/api/entities', { method: 'POST', body: JSON.stringify(body) });
      state.editing = null;
      showNotice(entityId ? '记录已更新' : '记录已添加');
      await render();
      return;
    }
    if (form.dataset.form === 'work-report') {
      await api('/api/work/reports/generate', { method: 'POST', body: JSON.stringify({ periodType: form.dataset.period, date: formData.get('date') || state.selectedDate, manualNote: formData.get('manualNote') || '' }) });
      showNotice(form.dataset.period === 'daily' ? '日报已生成并保存' : '周报已生成并保存');
      await render();
      return;
    }
    if (form.dataset.form === 'work-report-note') {
      await api(`/api/work/reports/${form.dataset.id}`, { method: 'PUT', body: JSON.stringify({ manualNote: formData.get('manualNote') || '' }) });
      showNotice('手动补充已保存');
      await render();
      return;
    }
    if (form.dataset.form === 'manual-dev-time') {
      await api('/api/development/time', { method: 'POST', body: JSON.stringify({ title: formData.get('title'), minutes: Number(formData.get('minutes')), linkedEntityId: formData.get('linkedEntityId') || null, date: formData.get('date') || state.selectedDate }) });
      showNotice('时间投入已补录');
      await render();
      return;
    }    if (form.dataset.form === 'timer-start') {
      await api(`/api/timer/${state.route.slice(1)}/start`, { method: 'POST', body: JSON.stringify({ entityId: formData.get('entityId') || null, mode: formData.get('mode'), targetMinutes: 25 }) });
      showNotice('计时已开始');
      await render();
      return;
    }    if (form.dataset.form === 'memo') {
      const checklist = String(formData.get('checklist') || '').split(/[,，]/).map((text) => text.trim()).filter(Boolean).map((text) => ({ text, done: false }));
      await api('/api/memos', { method: 'POST', body: JSON.stringify({ title: formData.get('title'), content: formData.get('content'), checklist, pinned: formData.get('pinned') === 'on' }) });
      showNotice('备忘已添加');
      await render();
      return;
    }
    if (form.dataset.form === 'today-task') {
      const repeat = formData.get('repeat');
      const recurrence = repeat === 'none' ? { freq: 'none' } : { freq: repeat, interval: Number(formData.get('repeatInterval') || 1), unit: String(formData.get('repeatUnit') || 'day') };
      await api('/api/entities', {
        method: 'POST',
        body: JSON.stringify({
          module: 'today', type: 'task', title: formData.get('title'), notes: formData.get('notes'),
          date: state.selectedDate, scheduledTime: formData.get('scheduledTime'),
          priority: Number(formData.get('priority')), reminderMinutes: Number(formData.get('reminderMinutes') || 0), recurrence,
        }),
      });
      showNotice('今日事项已添加');
      await render();
    }
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

window.addEventListener('hashchange', render);
render();
























