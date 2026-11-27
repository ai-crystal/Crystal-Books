# 注册 Windows 计划任务：每天定时静默更新 Crystal Books
# 用法（在仓库根目录）：
#   powershell -ExecutionPolicy Bypass -File tools\sitegen\install_task.ps1
#   powershell -ExecutionPolicy Bypass -File tools\sitegen\install_task.ps1 -Time "21:00"
# 卸载：
#   Unregister-ScheduledTask -TaskName "CrystalBooks 站点同步" -Confirm:$false
param(
    [string]$Time = "22:30",
    [string]$TaskName = "CrystalBooks 站点同步"
)

$ErrorActionPreference = "Stop"
$bat = Join-Path $PSScriptRoot "update_silent.bat"
if (-not (Test-Path $bat)) { throw "找不到 $bat" }

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`""
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Description "重建 Crystal Books 页面并在有变化时推送到 GitHub Pages" -Force | Out-Null

Write-Host "已注册计划任务「$TaskName」，每天 $Time 运行。"
Write-Host "日志：$PSScriptRoot\update.log"
Write-Host "立即测试：Start-ScheduledTask -TaskName `"$TaskName`""
