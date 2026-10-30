# 页面路由

| 路由 | 模块 |
| --- | --- |
| / | 首页总览 |
| /today | 今日计划 |
| /thesis | 毕设论文 |
| /study | 学习计划 |
| /development | 开发计划 |
| /autumn | 秋招每日计划 |
| /work | 工作计划 |
| /settings | 数据与设置 |

## 主要 API

- `/api/entities`：通用事项 CRUD。
- `/api/today`：按日期汇总。
- `/api/home`：首页摘要。
- `/api/development/stats`：开发项目进度与时间统计。
- `/api/autumn/summary`：投递与笔试面试摘要。
- `/api/work/reports`：日报周报。
- `/api/reminders/*`：提醒查询与补发。
- `/api/backups/*`：备份恢复。
- `/api/data-directory`：切换数据目录。
- `/api/exports/*`：CSV/XLS 与完整数据包。
