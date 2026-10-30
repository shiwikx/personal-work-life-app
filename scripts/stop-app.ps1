param()
$Root = Split-Path -Parent $PSScriptRoot
$connection = Get-NetTCPConnection -LocalPort 4123 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($connection) {
  Stop-Process -Id $connection.OwningProcess -Force
  "本地后台已停止。"
} else {
  "本地后台未运行。"
}

