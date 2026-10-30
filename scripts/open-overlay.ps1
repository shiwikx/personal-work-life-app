param([string]$ApiBase = "http://127.0.0.1:4123")
$Root = Split-Path -Parent $PSScriptRoot
try {
  Invoke-RestMethod -Uri "$ApiBase/api/health" -TimeoutSec 2 | Out-Null
} catch {
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "scripts\start-app.ps1") -NoBrowser -NoDesktopHelper
  Start-Sleep -Milliseconds 800
}
try {
  $result = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/desktop/overlay" -ContentType "application/json" -Body "{}" -TimeoutSec 5
  Write-Host "已打开悬浮窗。"
} catch {
  Write-Error "无法打开悬浮窗：$($_.Exception.Message)"
  exit 1
}
