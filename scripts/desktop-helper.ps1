param(
  [string]$ApiBase = "http://127.0.0.1:4123"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Windows.Forms;

public class GlassResizeForm : Form
{
    private const int WM_NCHITTEST = 0x84;
    private const int HTCLIENT = 1;
    private const int HTLEFT = 10;
    private const int HTRIGHT = 11;
    private const int HTTOP = 12;
    private const int HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14;
    private const int HTBOTTOM = 15;
    private const int HTBOTTOMLEFT = 16;
    private const int HTBOTTOMRIGHT = 17;

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        if (m.Msg != WM_NCHITTEST || m.Result.ToInt32() != HTCLIENT) return;

        Point p = PointToClient(Cursor.Position);
        int edge = 8;
        bool left = p.X <= edge;
        bool right = p.X >= ClientSize.Width - edge;
        bool top = p.Y <= edge;
        bool bottom = p.Y >= ClientSize.Height - edge;

        if (left && top) m.Result = (IntPtr)HTTOPLEFT;
        else if (right && top) m.Result = (IntPtr)HTTOPRIGHT;
        else if (left && bottom) m.Result = (IntPtr)HTBOTTOMLEFT;
        else if (right && bottom) m.Result = (IntPtr)HTBOTTOMRIGHT;
        else if (left) m.Result = (IntPtr)HTLEFT;
        else if (right) m.Result = (IntPtr)HTRIGHT;
        else if (top) m.Result = (IntPtr)HTTOP;
        else if (bottom) m.Result = (IntPtr)HTBOTTOM;
    }
}
"@
[System.Windows.Forms.Application]::EnableVisualStyles()
$createdNew = $false
$helperMutex = New-Object System.Threading.Mutex($true, "PersonalWorkLifeApp.DesktopHelper", [ref]$createdNew)
if (-not $createdNew) { exit }

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Text = "个人工作生活 - 今日事项"
$notify.Visible = $true

$form = New-Object GlassResizeForm
$form.Text = "今日未完成事项"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Size = New-Object System.Drawing.Size(320, 420)
$form.MinimumSize = New-Object System.Drawing.Size(240, 64)
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.Opacity = 0.94
$form.BackColor = [System.Drawing.Color]::FromArgb(250, 252, 249)
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Location = New-Object System.Drawing.Point(($screen.Right - 336), ($screen.Top + 20))

$header = New-Object System.Windows.Forms.Panel
$header.Dock = [System.Windows.Forms.DockStyle]::Top
$header.Height = 72
$header.BackColor = [System.Drawing.Color]::FromArgb(238, 29, 40, 35)
$form.Controls.Add($header)

$title = New-Object System.Windows.Forms.Label
$title.Text = "今日未完成"
$title.ForeColor = [System.Drawing.Color]::White
$title.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 11, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $false
$title.Location = New-Object System.Drawing.Point(16, 9)
$title.Size = New-Object System.Drawing.Size(220, 24)
$header.Controls.Add($title)

$studyTimer = New-Object System.Windows.Forms.Label
$studyTimer.Text = "学习计时 --:--:--"
$studyTimer.ForeColor = [System.Drawing.Color]::FromArgb(190, 220, 204)
$studyTimer.Font = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Regular)
$studyTimer.Location = New-Object System.Drawing.Point(16, 35)
$studyTimer.Size = New-Object System.Drawing.Size(214, 22)
$studyTimer.Cursor = [System.Windows.Forms.Cursors]::Hand
$studyTimer.Add_Click({ Start-Process "$ApiBase/#/study" })
$header.Controls.Add($studyTimer)

$collapse = New-Object System.Windows.Forms.Button
$collapse.Text = "—"
$collapse.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$collapse.ForeColor = [System.Drawing.Color]::White
$collapse.BackColor = [System.Drawing.Color]::FromArgb(29, 40, 35)
$collapse.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 78), 18)
$collapse.Size = New-Object System.Drawing.Size(34, 32)
$collapse.FlatAppearance.BorderSize = 0
$collapse.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Right
$header.Controls.Add($collapse)

$hide = New-Object System.Windows.Forms.Button
$hide.Text = "×"
$hide.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$hide.ForeColor = [System.Drawing.Color]::White
$hide.BackColor = [System.Drawing.Color]::FromArgb(29, 40, 35)
$hide.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 38), 18)
$hide.Size = New-Object System.Drawing.Size(34, 32)
$hide.FlatAppearance.BorderSize = 0
$hide.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Right
$header.Controls.Add($hide)

$list = New-Object System.Windows.Forms.FlowLayoutPanel
$list.Dock = [System.Windows.Forms.DockStyle]::Fill
$list.AutoScroll = $true
$list.FlowDirection = [System.Windows.Forms.FlowDirection]::TopDown
$list.WrapContents = $false
$list.Padding = New-Object System.Windows.Forms.Padding(10)
$form.Controls.Add($list)
$list.BringToFront()

$resizeGrip = New-Object System.Windows.Forms.Label
$resizeGrip.Text = "◢"
$resizeGrip.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$resizeGrip.BackColor = [System.Drawing.Color]::Transparent
$resizeGrip.ForeColor = [System.Drawing.Color]::FromArgb(95, 105, 99)
$resizeGrip.Cursor = [System.Windows.Forms.Cursors]::SizeNWSE
$resizeGrip.Size = New-Object System.Drawing.Size(30, 30)
$resizeGrip.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 34), ($form.ClientSize.Height - 34))
$resizeGrip.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right
$form.Controls.Add($resizeGrip)
$resizeGrip.BringToFront()
$resizeStart = $null
$resizeGrip.Add_MouseDown({
  param($sender, $event)
  if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
    $script:resizeStart = New-Object psobject -Property @{ X = $event.X; Y = $event.Y; Width = $form.Width; Height = $form.Height }
  }
})
$resizeGrip.Add_MouseMove({
  param($sender, $event)
  if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left -and $script:resizeStart) {
    $form.Width = [Math]::Max(300, $script:resizeStart.Width + ($event.X - $script:resizeStart.X))
    $form.Height = [Math]::Max(120, $script:resizeStart.Height + ($event.Y - $script:resizeStart.Y))
  }
})
$resizeGrip.Add_MouseUp({ $script:resizeStart = $null })
$form.Add_ResizeEnd({ if ($list.Visible) { Refresh-Today } })

$expandedHeight = 420
$dragPoint = New-Object System.Drawing.Point(0, 0)
$header.Add_MouseDown({ param($sender, $event) $script:dragPoint = $event.Location })
$header.Add_MouseMove({
  param($sender, $event)
  if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
    $screenPoint = $header.PointToScreen($event.Location)
    $form.Location = New-Object System.Drawing.Point(($screenPoint.X - $script:dragPoint.X), ($screenPoint.Y - $script:dragPoint.Y))
  }
})

$collapse.Add_Click({
  if ($form.Height -gt 80) {
    $script:expandedHeight = $form.Height
    $list.Visible = $false
    $form.Height = 72
    $collapse.Text = "□"
  } else {
    $form.Height = $script:expandedHeight
    $list.Visible = $true
    $collapse.Text = "—"
  }
})
$hide.Add_Click({ $form.Hide() })

function Refresh-Today {
  try {
    $today = Get-Date -Format "yyyy-MM-dd"
    $data = Invoke-RestMethod -Uri "$ApiBase/api/today?date=$today" -TimeoutSec 3
    $list.Controls.Clear()
    if (-not $data.items -or $data.items.Count -eq 0) {
      $empty = New-Object System.Windows.Forms.Label
      $empty.Text = "今天还没有未完成事项"
      $empty.ForeColor = [System.Drawing.Color]::FromArgb(116, 118, 110)
      $empty.Size = New-Object System.Drawing.Size(320, 40)
      $list.Controls.Add($empty)
      $title.Text = "今日未完成 · 0"
      $notify.Text = "个人工作生活 - 今日事项 0"
      return
    }
    $title.Text = "今日未完成 · $($data.items.Count)"
    $notify.Text = "个人工作生活 - 今日事项 $($data.items.Count)"
    foreach ($item in $data.items) {
      $card = New-Object System.Windows.Forms.Panel
      $card.Width = 325
      $card.Height = 72
      $card.Margin = New-Object System.Windows.Forms.Padding(3, 3, 3, 7)
      $card.BackColor = [System.Drawing.Color]::White
      $card.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

      $check = New-Object System.Windows.Forms.Button
      $check.Text = "✓"
      $check.Location = New-Object System.Drawing.Point(10, 12)
      $check.Size = New-Object System.Drawing.Size(34, 34)
      $check.Tag = $item
      $check.Add_Click({
        $current = $this.Tag
        try {
          Invoke-RestMethod -Method Post -Uri "$ApiBase/api/entities/$($current.id)/complete" -ContentType "application/json" -Body (@{ date = $current.occurrenceDate } | ConvertTo-Json) | Out-Null
          Refresh-Today
        } catch {
          [System.Windows.Forms.MessageBox]::Show("完成事项失败：$($_.Exception.Message)")
        }
      })
      $card.Controls.Add($check)

      $label = New-Object System.Windows.Forms.Label
      $label.Text = $item.title
      $label.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9.5, [System.Drawing.FontStyle]::Bold)
      $label.Location = New-Object System.Drawing.Point(54, 9)
      $label.Size = New-Object System.Drawing.Size(255, 24)
      $label.AutoEllipsis = $true
      $card.Controls.Add($label)

      $meta = New-Object System.Windows.Forms.Label
      $meta.Text = "$($item.module)  $($item.scheduledTime)  进度 $($item.effectiveProgress)%"
      $meta.ForeColor = [System.Drawing.Color]::FromArgb(116, 118, 110)
      $meta.Location = New-Object System.Drawing.Point(54, 36)
      $meta.Size = New-Object System.Drawing.Size(255, 20)
      $card.Controls.Add($meta)
      $list.Controls.Add($card)
    }
  } catch {
    $list.Controls.Clear()
    $errorLabel = New-Object System.Windows.Forms.Label
    $errorLabel.Text = "本地后台未连接，正在重试..."
    $errorLabel.ForeColor = [System.Drawing.Color]::FromArgb(168, 67, 54)
    $errorLabel.Size = New-Object System.Drawing.Size(320, 40)
    $list.Controls.Add($errorLabel)
  }
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$showItem = $menu.Items.Add("显示今日事项")
$showItem.Add_Click({ $form.Show(); $form.Activate() })
$openItem = $menu.Items.Add("打开主页面")
$openItem.Add_Click({ Start-Process "$ApiBase" })
$menu.Items.Add("-") | Out-Null
$smallWindow = $menu.Items.Add("紧凑大小")
$smallWindow.Add_Click({ $form.Size = New-Object System.Drawing.Size(280, 340); $list.Visible = $true })
$standardWindow = $menu.Items.Add("标准大小")
$standardWindow.Add_Click({ $form.Size = New-Object System.Drawing.Size(320, 420); $list.Visible = $true })
$largeWindow = $menu.Items.Add("宽屏大小")
$largeWindow.Add_Click({ $form.Size = New-Object System.Drawing.Size(430, 580); $list.Visible = $true })
$menu.Items.Add("-") | Out-Null
$exitItem = $menu.Items.Add("退出桌面助手")
$exitItem.Add_Click({ $notify.Visible = $false; $notify.Dispose(); [System.Windows.Forms.Application]::Exit() })
$notify.ContextMenuStrip = $menu
$notify.Add_DoubleClick({ $form.Show(); $form.Activate() })


function Refresh-StudyTimer {
  try {
    $data = Invoke-RestMethod -Uri "$ApiBase/api/timer/study" -TimeoutSec 2
    $seconds = [Math]::Max(0, [int]$data.elapsedSeconds)
    if ($data.timer -and $data.timer.running -and $data.timer.startedAt) {
      $started = [datetime]::Parse($data.timer.startedAt)
      $seconds += [Math]::Max(0, [int]((Get-Date) - $started).TotalSeconds)
    }
    $hours = [int]([Math]::Floor($seconds / 3600))
    $minutes = [int]([Math]::Floor(($seconds % 3600) / 60))
    $remain = [int]($seconds % 60)
    $state = if ($data.timer -and $data.timer.running) { "运行中" } elseif ($seconds -gt 0) { "已暂停" } else { "未开始" }
    $studyTimer.Text = "学习计时 {0:D2}:{1:D2}:{2:D2} · $state" -f $hours, $minutes, $remain
  } catch {
    $studyTimer.Text = "学习计时 --:--:--"
  }
}

function Check-OverlaySignal {
  try {
    $base = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $env:USERPROFILE "AppData\Local" }
    $signalPath = Join-Path $base "PersonalWorkLifeApp\show-overlay.signal"
    if (Test-Path -LiteralPath $signalPath) {
      $form.Show()
      $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
      $form.Activate()
      Remove-Item -LiteralPath $signalPath -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}$seenReminders = @{}
function Show-DueReminders {
  try {
    $due = Invoke-RestMethod -Uri "$ApiBase/api/reminders/due?includeNotified=true&recentMinutes=10" -TimeoutSec 3
    foreach ($item in @($due.items)) {
      if (-not $item -or $seenReminders.ContainsKey($item.key)) { continue }
      $seenReminders[$item.key] = $true
      $dialog = New-Object System.Windows.Forms.Form
      $dialog.Text = "事项提醒"
      $dialog.Size = New-Object System.Drawing.Size(430, 230)
      $dialog.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
      $dialog.TopMost = $true
      $dialog.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
      $dialog.MaximizeBox = $false
      $dialog.MinimizeBox = $false

      $heading = New-Object System.Windows.Forms.Label
      $heading.Text = $item.title
      $heading.Font = New-Object System.Drawing.Font("Microsoft YaHei UI", 13, [System.Drawing.FontStyle]::Bold)
      $heading.Location = New-Object System.Drawing.Point(22, 22)
      $heading.Size = New-Object System.Drawing.Size(380, 32)
      $dialog.Controls.Add($heading)

      $detail = New-Object System.Windows.Forms.Label
      $detail.Text = "$($item.occurrenceDate) $($item.scheduledTime) · 进度提醒"
      $detail.ForeColor = [System.Drawing.Color]::FromArgb(116, 118, 110)
      $detail.Location = New-Object System.Drawing.Point(22, 60)
      $detail.Size = New-Object System.Drawing.Size(380, 24)
      $dialog.Controls.Add($detail)

      $note = New-Object System.Windows.Forms.Label
      $note.Text = if ($item.notes) { $item.notes } else { "该事项已到提醒时间。" }
      $note.Location = New-Object System.Drawing.Point(22, 88)
      $note.Size = New-Object System.Drawing.Size(380, 48)
      $dialog.Controls.Add($note)

      $completeButton = New-Object System.Windows.Forms.Button
      $completeButton.Text = "完成"
      $completeButton.Location = New-Object System.Drawing.Point(22, 150)
      $completeButton.Size = New-Object System.Drawing.Size(105, 34)
      $completeButton.Tag = $item
      $completeButton.Add_Click({
        $current = $this.Tag
        try {
          Invoke-RestMethod -Method Post -Uri "$ApiBase/api/entities/$($current.entityId)/complete" -ContentType "application/json" -Body (@{ date = $current.occurrenceDate } | ConvertTo-Json) | Out-Null
          $dialog.Close()
          Refresh-Today
        } catch { [System.Windows.Forms.MessageBox]::Show("完成失败：$($_.Exception.Message)") }
      })
      $dialog.Controls.Add($completeButton)

      $snoozeButton = New-Object System.Windows.Forms.Button
      $snoozeButton.Text = "稍后 10 分钟"
      $snoozeButton.Location = New-Object System.Drawing.Point(135, 150)
      $snoozeButton.Size = New-Object System.Drawing.Size(125, 34)
      $snoozeButton.Tag = $item
      $snoozeButton.Add_Click({
        $current = $this.Tag
        try {
          Invoke-RestMethod -Method Post -Uri "$ApiBase/api/entities/$($current.entityId)/snooze" -ContentType "application/json" -Body (@{ date = $current.occurrenceDate; minutes = 10 } | ConvertTo-Json) | Out-Null
          $dialog.Close()
        } catch { [System.Windows.Forms.MessageBox]::Show("稍后提醒设置失败：$($_.Exception.Message)") }
      })
      $dialog.Controls.Add($snoozeButton)

      $detailButton = New-Object System.Windows.Forms.Button
      $detailButton.Text = "打开详情"
      $detailButton.Location = New-Object System.Drawing.Point(268, 150)
      $detailButton.Size = New-Object System.Drawing.Size(125, 34)
      $detailButton.Tag = $item
      $detailButton.Add_Click({
        $current = $this.Tag
        Start-Process "$ApiBase/#/$($current.module)"
        $dialog.Close()
      })
      $dialog.Controls.Add($detailButton)
      $dialog.ShowDialog() | Out-Null
    }
  } catch {}
}
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.Add_Tick({ Refresh-Today; Show-DueReminders })
$timer.Start()
$clockTimer = New-Object System.Windows.Forms.Timer
$clockTimer.Interval = 1000
$clockTimer.Add_Tick({ Refresh-StudyTimer; Check-OverlaySignal })
$clockTimer.Start()

Refresh-Today
[System.Windows.Forms.Application]::Run($form)

