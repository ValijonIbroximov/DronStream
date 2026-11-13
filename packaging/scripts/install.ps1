<#
.SYNOPSIS  DronStream ni o'rnatadi yoki yangi versiya fayllarini qo'shadi.
           Dastur (app), sozlama (config), ma'lumotlar (data) va loglar (logs) alohida papkalarda.
.EXAMPLE   powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Root C:\DronStream
#>
param([string]$Root = "C:\DronStream")
. (Join-Path $PSScriptRoot "common.ps1")
$pkg = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $pkg "VERSION") -Raw).Trim()

Write-Host "DronStream $version -> $Root"
# Paket yaxlitligini tekshirish
$bad = 0
Get-Content (Join-Path $pkg "SHA256SUMS.txt") | ForEach-Object {
  $h, $rel = $_ -split "  ", 2
  $p = Join-Path $pkg $rel
  if (-not (Test-Path $p) -or (Get-FileHash $p -Algorithm SHA256).Hash.ToLower() -ne $h) { Write-Warning "Buzilgan fayl: $rel"; $bad++ }
}
if ($bad -gt 0) { throw "Paket yaxlitligi buzilgan ($bad fayl). O'rnatish to'xtatildi." }

foreach ($d in "app", "config", "config\secrets", "data", "data\media", "data\backups", "data\runtime", "logs", "scripts", "docs") {
  New-Item -ItemType Directory -Force (Join-Path $Root $d) | Out-Null
}
if (Test-Path (Join-Path $Root "app\$version")) { Write-Host "app\$version allaqachon mavjud - fayllar yangilanadi" }
Copy-Item (Join-Path $pkg "app\$version") (Join-Path $Root "app") -Recurse -Force
Copy-Item (Join-Path $pkg "scripts\*") (Join-Path $Root "scripts") -Force
foreach ($b in "DronStreamStart.bat", "DronStreamTayyorla.bat") { if (Test-Path (Join-Path $pkg $b)) { Copy-Item (Join-Path $pkg $b) $Root -Force } }
Copy-Item (Join-Path $pkg "docs\*") (Join-Path $Root "docs") -Force -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $pkg "info.html")) { Copy-Item (Join-Path $pkg "info.html") $Root -Force }   # offline qo'llanma
Copy-Item (Join-Path $pkg "config\dronstream.example.yaml") (Join-Path $Root "config") -Force
$cfg = Join-Path $Root "config\dronstream.yaml"
if (-not (Test-Path $cfg)) {
  Copy-Item (Join-Path $Root "config\dronstream.example.yaml") $cfg
  Write-Host "Yaratildi: $cfg (publish_host, public_hosts, webrtc_additional_hosts ni sozlang)"
}
$active = Join-Path $Root "app\active.txt"
if (-not (Test-Path $active)) {
  Set-Content $active $version -Encoding ascii
  Write-Host "Faol versiya: $version"
} else {
  Write-Host "Faol versiya o'zgartirilmadi ($((Get-Content $active -Raw).Trim())). Yangilash uchun update.ps1 dan foydalaning."
}

# Sirlar, ma'lumotlar va loglarga faqat Administrators, SYSTEM va o'rnatuvchi foydalanuvchi kira oladi.
foreach ($d in "config\secrets", "data", "logs") {
  $p = Join-Path $Root $d
  & icacls $p /inheritance:r /grant:r "*S-1-5-32-544:(OI)(CI)F" "*S-1-5-18:(OI)(CI)F" "$($env:USERDOMAIN)\$($env:USERNAME):(OI)(CI)F" | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Warning "icacls $p muvaffaqiyatsiz - ruxsatlarni qo'lda tekshiring" }
}
Write-Host ""
Write-Host "Keyingi qadamlar:" -ForegroundColor Green
Write-Host "  1) $cfg ni tahrirlang (docs\INSTALL_UZ.md)."
Write-Host "  2) Ishga tushirish: powershell -ExecutionPolicy Bypass -File $Root\scripts\start.ps1"
Write-Host "  3) Brauzer: https://localhost:8443 - bir martalik kod: $Root\data\runtime\setup-token.txt"
Write-Host "  4) Ixtiyoriy: service-install.ps1 va firewall-rules.ps1 (administrator huquqi bilan)."
