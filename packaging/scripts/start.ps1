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
  $log = Join-Path $Root "logs\console.log"
  Start-Process -FilePath $exe -ArgumentList @("run", "--root", "`"$Root`"") -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
}
if (Wait-DsHealthy $exe $Root 30) {
  Write-Host "DronStream ishlayapti." -ForegroundColor Green
  & $exe status --root $Root
} else {
  Write-Warning "30 s ichida sog'lom holatga kelmadi. Loglar: $Root\logs"
  exit 1
}
$tok = Join-Path $Root "data\runtime\setup-token.txt"
if (Test-Path $tok) { Write-Host "Birinchi admin uchun bir martalik kod: $((Get-Content $tok -Raw).Trim())" -ForegroundColor Yellow }
