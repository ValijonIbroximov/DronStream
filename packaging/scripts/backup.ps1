<#
.SYNOPSIS  Izchil, shifrlangan backup (server ishlayotganda ham). Parol so'raladi.
.PARAMETER MigrateOut  Backupdan so'ng bu serverni "migrated" holatiga o'tkazadi (publish va tomosha to'xtaydi) -
           boshqa kompyuterga ko'chirishda ikki server bir vaqtda ishlamasligi uchun.
.EXAMPLE   powershell -File scripts\backup.ps1
.EXAMPLE   powershell -File scripts\backup.ps1 -Out D:\usb\dronstream.dsbak -MigrateOut
#>
param([string]$Root, [string]$Out, [switch]$MigrateOut)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root
$pass = Read-DsPassphrase "Backup paroli (kamida 12 belgi; yo'qotsangiz backupni ochib bo'lmaydi)" -Confirm
$a = @("backup", "--root", $Root)
if ($Out) { $a += @("--out", $Out) }
if ($MigrateOut) { $a += "--migrate-out" }
exit (Invoke-DsWithPassphrase $exe $a $pass)
