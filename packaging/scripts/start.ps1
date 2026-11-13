<# .SYNOPSIS DronStream ni ishga tushiradi (service o'rnatilgan bo'lsa - service orqali, aks holda yashirin fon jarayoni). #>
param([string]$Root)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root
$svc = Get-DsService
if ($svc) {
  if ($svc.Status -ne "Running") { Start-Service DronStream }
  Write-Host "Windows service ishga tushirildi."
} else {
  if (Test-DsRunning $exe $Root) { Write-Host "Allaqachon ishlayapti."; exit 0 }
  # No output redirection: with redirection Start-Process makes the child
  # inherit the caller's handles (a pipe would never close). The server
  # writes its own logs to <ROOT>\logs\dronstream.log.
  Start-Process -FilePath $exe -ArgumentList @("run", "--root", "`"$Root`"") -WindowStyle Hidden
}
if (Wait-DsHealthy $exe $Root 30) {
  Write-Host "DronStream ishlayapti." -ForegroundColor Green
  Invoke-DsExe $exe @("status", "--root", $Root) | Out-Null
} else {
  Write-Warning "30 s ichida sog'lom holatga kelmadi. Loglar: $Root\logs"
  exit 1
}
$tok = Join-Path $Root "data\runtime\setup-token.txt"
if (Test-Path $tok) { Write-Host "Birinchi admin uchun bir martalik kod: $((Get-Content $tok -Raw).Trim())" -ForegroundColor Yellow }
