param(
  [switch]$NoBrowser,
  [switch]$NoDesktopHelper
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Url = "http://127.0.0.1:4123"
$Node = Join-Path $Root "runtime\node.exe"
if (-not (Test-Path -LiteralPath $Node)) {
  $NodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $NodeCommand) { throw "未找到 Node.js 运行时，无法启动本地后台。" }
  $Node = $NodeCommand.Source
}

function Test-AppRunning {
  try {
    $health = Invoke-RestMethod -Uri "$Url/api/health" -TimeoutSec 2
    return [bool]$health.ok
  } catch {
    return $false
  }
}

if (-not (Test-AppRunning)) {
  $server = Join-Path $Root "src\server\cli.mjs"
  Start-Process -FilePath $Node -ArgumentList @($server) -WorkingDirectory $Root -WindowStyle Hidden
  $ready = $false
  for ($i = 0; $i -lt 30; $i += 1) {
    Start-Sleep -Milliseconds 300
    if (Test-AppRunning) { $ready = $true; break }
  }
  if (-not $ready) { throw "本地后台启动失败，请检查 D 盘数据目录和端口 4123。" }
}

if (-not $NoBrowser) { Start-Process $Url }

if (-not $NoDesktopHelper) {
  $helper = Join-Path $Root "scripts\desktop-helper.ps1"
  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-File", $helper, "-ApiBase", $Url) -WindowStyle Hidden
}
