<# .SYNOPSIS DronStream ni to'xtatadi (service yoki fon jarayoni). #>
param([string]$Root)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$svc = Get-DsService
if ($svc -and $svc.Status -eq "Running") { Stop-Service DronStream; Write-Host "Service to'xtatildi."; exit 0 }
$exe = Get-DsExe $Root
exit (Invoke-DsExe $exe @("stop", "--root", $Root))
