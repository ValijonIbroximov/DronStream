<#
.SYNOPSIS  Oldingi versiyaga qaytaradi. Agar yangi versiya bazani yangi sxemaga o'tkazgan bo'lsa,
           yangilashdan oldingi backup (-Backup) ham tiklanadi (shundan keyingi o'zgarishlar yo'qoladi).
.EXAMPLE   powershell -File scripts\rollback.ps1 -ToVersion 1.0.0
.EXAMPLE   powershell -File scripts\rollback.ps1 -ToVersion 1.0.0 -Backup C:\DronStream\data\backups\pre-update-1.0.0-to-1.1.0-....dsbak
#>
param([string]$Root, [Parameter(Mandatory = $true)][string]$ToVersion, [string]$Backup, [string]$Passphrase)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root $ToVersion
& (Join-Path $PSScriptRoot "stop.ps1") -Root $Root 2>$null
Set-Content (Join-Path $Root "app\active.txt") $ToVersion -Encoding ascii
$svc = Get-DsService
if ($svc) { & sc.exe config DronStream binPath= "`"$exe`" run --root `"$Root`"" | Out-Null }
if ($Backup) {
  if (-not $Passphrase) { $Passphrase = Read-DsPassphrase "Backup paroli" }
  if ((Invoke-DsWithPassphrase $exe @("restore", "--root", $Root, "--in", $Backup, "--force") $Passphrase) -ne 0) { throw "Backup tiklanmadi" }
  # Same machine rollback: the old server is this one, so re-activate immediately.
  & $exe activate --root $Root
}
& (Join-Path $PSScriptRoot "start.ps1") -Root $Root
if (Wait-DsHealthy $exe $Root 60) { Write-Host "Rollback tayyor: $ToVersion ishlayapti" -ForegroundColor Green }
else { Write-Warning "Rollbackdan keyin ham sog'lom emas. Loglar: $Root\logs. Agar 'schema is newer' xatosi bo'lsa -Backup bilan qayta urining." ; exit 1 }
