# 个人工作生活 APP

本机单用户使用的工作生活管理应用，包含首页、今日计划、毕设论文、学习计划、开发计划、秋招每日计划、工作计划和数据设置 8 个模块。

## 启动

开发环境：

```powershell
node src/server/cli.mjs --open
```

或：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-app.ps1
```

Windows 便携包解压后双击 `启动个人工作生活APP.cmd`。便携包内包含 Node.js 运行时，不依赖网络。

## 数据位置

默认数据目录：`D:\个人工作生活APP\data`。如果 D 盘不可用，APP 会明确报错，不会静默写入其他位置。可在“数据与设置”中切换数据目录。

数据目录包含：

- `app.sqlite`：主数据库。
- `logs/`：本机日志。
- `exports/`：完整数据包和导出文件。
- 备份默认位于数据目录相邻的 `backups/` 中。

## 常用命令

```powershell
node --test tests/stage5-modules.test.mjs
pnpm test
node --test tests/e2e/acceptance.test.mjs
node scripts/package-windows.mjs
```

## 说明

- 所有业务数据只保存在本机，不登录、不联网、不使用云数据库。
- 浏览器关闭后，本地后台服务仍负责提醒；PowerShell 桌面助手提供系统托盘、置顶悬浮窗口和提醒操作。
- 详见 `docs/USER_GUIDE.md` 和 `docs/BACKUP_RESTORE.md`。
