<# .SYNOPSIS Holatni ko'rsatadi. Chiqish kodi: 0 = sog'lom, 1 = ishlamayapti yoki nosog'lom. #>
param([string]$Root)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root
$svc = Get-DsService
if ($svc) { Write-Host "Service: $($svc.Status)" } else { Write-Host "Service: o'rnatilmagan" }
Write-Host "Faol versiya: $(Get-DsActiveVersion $Root)"
& $exe status --root $Root
exit $LASTEXITCODE
