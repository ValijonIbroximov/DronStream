<#
.SYNOPSIS  DronStream ni yangi versiyaga yangilaydi; muvaffaqiyatsiz bo'lsa avtomatik qaytaradi (rollback).
.DESCRIPTION
  1) yangi paket SHA256SUMS bo'yicha tekshiriladi
  2) yangilashdan oldin shifrlangan backup olinadi (data\backups\pre-update-*.dsbak)
  3) server to'xtatiladi, app\<yangi> o'rnatiladi, app\active.txt almashtiriladi
  4) server ishga tushiriladi va sog'lomligi tekshiriladi
  5) 60 s ichida sog'lom bo'lmasa: eski versiya qaytariladi
  Eski versiya fayllari app\<eski> da qoladi (rollback.ps1 uchun).
.EXAMPLE   powershell -File C:\DronStream\scripts\update.ps1 -Package D:\DronStream-1.1.0-win64
#>
param([string]$Root, [Parameter(Mandatory = $true)][string]$Package)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
if ($Package -like "*.zip") {
  $tmp = Join-Path $env:TEMP ("ds-update-" + [guid]::NewGuid())
  Expand-Archive $Package -DestinationPath $tmp
  $Package = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName
}
$newVer = (Get-Content (Join-Path $Package "VERSION") -Raw).Trim()
$oldVer = Get-DsActiveVersion $Root
if ($newVer -eq $oldVer) { throw "Bu versiya ($newVer) allaqachon faol" }
$oldExe = Get-DsExe $Root $oldVer
Write-Host "Yangilash: $oldVer -> $newVer"

Write-Host "1/5 Paket tekshirilmoqda"
Get-Content (Join-Path $Package "SHA256SUMS.txt") | ForEach-Object {
  $h, $rel = $_ -split "  ", 2
  $p = Join-Path $Package $rel
  if (-not (Test-Path $p) -or (Get-FileHash $p -Algorithm SHA256).Hash.ToLower() -ne $h) { throw "Paket buzilgan: $rel" }
}

Write-Host "2/5 Yangilashdan oldingi backup"
$pass = Read-DsPassphrase "Backup paroli (yangilashdan oldingi nusxa uchun)" -Confirm
$bk = Join-Path $Root ("data\backups\pre-update-$oldVer-to-$newVer-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dsbak")
if ((Invoke-DsWithPassphrase $oldExe @("backup", "--root", $Root, "--out", $bk) $pass) -ne 0) { throw "Backup muvaffaqiyatsiz - yangilash to'xtatildi" }

Write-Host "3/5 To'xtatish va fayllarni o'rnatish"
& (Join-Path $PSScriptRoot "stop.ps1") -Root $Root
Copy-Item (Join-Path $Package "app\$newVer") (Join-Path $Root "app") -Recurse -Force
Copy-Item (Join-Path $Package "scripts\*") (Join-Path $Root "scripts") -Force
Copy-Item (Join-Path $Package "docs\*") (Join-Path $Root "docs") -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $Package "config\dronstream.example.yaml") (Join-Path $Root "config") -Force
Set-Content (Join-Path $Root "app\active.txt") $newVer -Encoding ascii
$svc = Get-DsService
$newExe = Get-DsExe $Root $newVer
if ($svc) { & sc.exe config DronStream binPath= "`"$newExe`" run --root `"$Root`"" | Out-Null }

Write-Host "4/5 Ishga tushirish"
& (Join-Path $PSScriptRoot "start.ps1") -Root $Root
$ok = Wait-DsHealthy $newExe $Root 60

if (-not $ok) {
  Write-Warning "5/5 Yangi versiya sog'lom emas - ROLLBACK $oldVer ga"
  & (Join-Path $PSScriptRoot "rollback.ps1") -Root $Root -ToVersion $oldVer -Backup $bk -Passphrase $pass
  exit 1
}
Write-Host "5/5 Tayyor: $newVer ishlayapti. Oldingi versiya: app\$oldVer, backup: $bk" -ForegroundColor Green
