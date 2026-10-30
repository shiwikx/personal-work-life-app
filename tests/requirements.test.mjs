import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(process.cwd());
const read = (file) => readFileSync(resolve(root, file), 'utf8');

test('PRD 保留全部十个必需章节', () => {
  const prd = read('PRD.md');
  const headings = [
    '## 1. 产品目标和使用场景',
    '## 2. 整体页面框架和导航结构',
    '## 3. 首页的内容结构',
    '## 4. 每个模块的用途',
    '## 5. 每个模块第一版最必要的数据和操作',
    '## 6. 首页、今日计划和各模块之间的关系',
    '## 7. 本地数据文件、备份和恢复要求',
    '## 8. 第一版必须完成的功能',
    '## 9. 第一版暂时不做的功能',
    '## 10. 可以实际检查的验收标准',
  ];
  for (const heading of headings) assert.ok(prd.includes(heading), heading);
});

test('开发计划包含阶段 0 到阶段 9', () => {
  const plan = read('DEVELOPMENT_PLAN.md');
  for (let phase = 0; phase <= 9; phase += 1) {
    assert.ok(plan.includes(`## 阶段 ${phase}：`), `阶段 ${phase}`);
  }
});

test('路由基线只包含确认的八个模块', () => {
  const routes = read('docs/routes.md');
  const confirmed = ['首页总览', '今日计划', '毕设论文', '学习计划', '开发计划', '秋招每日计划', '工作计划', '数据与设置'];
  for (const name of confirmed) assert.ok(routes.includes(name), name);
  for (const removed of ['自媒体', '健身计划', '饮食计划', '游戏娱乐']) {
    assert.ok(!routes.includes(removed), removed);
  }
});
test('PRD v1.2 包含当前视觉、主题和交互要求', () => {
  const prd = read('PRD.md');
  assert.match(prd, /文档版本：v1\.2/);
  assert.match(prd, /### 2\.4 视觉与主题规范/);
  assert.match(prd, /主界面参考 macOS 天气 App/);
  assert.match(prd, /浅色、深色主题切换/);
  assert.match(prd, /普通、低、中、高、紧急五级/);
  assert.match(prd, /完成事项必须继续显示在首页、今日计划和所属模块中/);
  assert.match(prd, /各模块的添加表单默认折叠/);
  assert.match(prd, /### 10\.13 视觉主题与交互/);
  assert.match(prd, /主题选择在刷新浏览器、关闭后重新打开 APP 时仍能恢复/);
  assert.match(prd, /悬浮窗口默认尺寸为 `320×420`，最小尺寸为 `240×64`/);
  assert.match(prd, /悬浮窗口支持从四边、四角及右下角缩放把手自由调整尺寸/);
  assert.match(prd, /关闭按钮，窗口缩放后按钮不得消失或与学习计时重叠/);
  assert.match(prd, /前端资源使用 `no-store` 缓存策略和版本参数/);
});




