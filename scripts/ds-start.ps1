<#
.SYNOPSIS  DronStreamStart: tekshiradi, kerak bo'lsa bir marta tayyorlaydi, ishga tushiradi va brauzerni ochadi.
.DESCRIPTION
  1) konfiguratsiya, fayllar, MediaMTX va portlar tekshiriladi (dronstream.exe check)
  2) server allaqachon sog'lom ishlayotgan bo'lsa ikkinchi nusxa ochilmaydi - brauzer ochiladi
  3) tuzatiladigan tayyorlash muammosi bo'lsa DronStreamTayyorla FAQAT BIR MARTA chaqiriladi
  4) server ishga tushiriladi, health-check kutiladi, brauzer ochiladi
  Band port, buzilgan baza, noto'g'ri TLS kabi holatlar "tuzatilmaydi" - aniq tashxis beriladi.
  Chiqish kodlari ds-prepare.ps1 bilan bir xil.
#>
param([switch]$NoBrowser, [switch]$NoPrepare)
. (Join-Path $PSScriptRoot "ds-common.ps1")
trap { Write-DsUnexpected $_; exit 1 }
if ($env:DS_NO_BROWSER -eq "1") { $NoBrowser = $true }
$ctx = Get-DsContext
Start-DsLog $ctx "start"
if ($ctx.Mode -eq "unknown") { Stop-DsWith $EX_MANUAL "Bu papka DronStream manba kodi ham, tarqatish paketi ham emas: $($ctx.Base)" }
$lock = Enter-DsLock $ctx "start"
if (-not $lock) { Stop-DsWith $EX_LOCKED "DronStreamStart allaqachon ishlamoqda (boshqa oynada). Ikkinchi nusxa ochilmadi." }

function Open-DsBrowser([string]$url) {
  if ($NoBrowser) { Write-DsLog "Manzil: $url"; return }
  Write-DsLog "Brauzer ochilmoqda: $url" "OK"
  Start-Process $url
}

function Get-Readiness {
  # returns @{ chk; fixable = @(...); manual = @(...) }
  $fix = @(); $man = @()
  if ($ctx.Mode -eq "package" -and -not (Test-Path (Join-Path $ctx.Base "app\active.txt"))) { $fix += "Faol versiya belgilanmagan (app\active.txt yo'q)" }
  if (-not (Test-Path $ctx.Exe)) {
    if ($ctx.Mode -eq "source") { $fix += "Dastur hali yig'ilmagan (build\dronstream.exe yo'q)" }
    else { $fix += "Faol versiya yoki dastur fayli topilmadi" }
    return @{ chk = $null; fixable = $fix; manual = $man }
  }
  if ($ctx.Mode -eq "source") {
    $newest = Get-DsNewestWrite (Get-ChildItem (Join-Path $ctx.Base "backend"), (Join-Path $ctx.Base "web\src") -Recurse -File -Include *.go, go.mod, go.sum, *.ts, *.tsx, *.css | Where-Object { $_.FullName -notlike "*\integration\*" -and $_.Name -notlike "*_test.go" })
    if ($newest -gt (Get-Item $ctx.Exe).LastWriteTimeUtc) { $fix += "Lokal build eskirgan (manba kod yangiroq)" }
  }
  $chk = Invoke-DsCheck $ctx
  if (-not $chk) {
    if ($ctx.Mode -eq "source") { $fix += "Lokal build eskirgan yoki ishlamaydi ($($ctx.Exe) check javob bermadi)" }
    else { $man += "Tayyorlik tekshiruvi ishlamadi ($($ctx.Exe) check). Paket buzilgan bo'lishi mumkin." }
    return @{ chk = $null; fixable = $fix; manual = $man }
  }
  foreach ($p in $chk.problems) { if ($p.fixable) { $fix += $p.message } else { $man += $p.message } }
  return @{ chk = $chk; fixable = $fix; manual = $man }
}

Write-DsLog "1/4 Tekshiruv" "STEP"
$st = Get-Readiness
$isRunning = $st.chk -and $st.chk.running
if (-not $isRunning -and $st.fixable.Count -gt 0 -and $st.manual.Count -eq 0) {
  $st.fixable | ForEach-Object { Write-DsLog ("  - " + $_) "WARN" }
  if ($NoPrepare -or $env:DS_PREPARE_ATTEMPTED -eq "1") { Stop-DsWith $EX_FAIL "Tayyorlash kerak, lekin avtomatik tayyorlash o'chirilgan. DronStreamTayyorla.bat ni ishga tushiring." }
  Write-DsLog "2/4 Avtomatik tayyorlash (bir marta): DronStreamTayyorla" "STEP"
  $env:DS_PREPARE_ATTEMPTED = "1"   # guards against start -> prepare -> start loops
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "ds-prepare.ps1")
  $pc = $LASTEXITCODE
  if ($pc -ne 0) { Stop-DsWith $pc "Tayyorlash muvaffaqiyatsiz (kod $pc). Qayta urinilmaydi. Tayyorlash logi: $(Join-Path $ctx.Root 'logs') (tayyorla-*.log)" }
  $ctx = Get-DsContext
  $st = Get-Readiness   # the one and only re-check
  $isRunning = $st.chk -and $st.chk.running
} else { Write-DsLog "2/4 Tayyorlash kerak emas" "STEP" }

$chk = $st.chk
if ($isRunning) {
  if ($chk.healthy) { Write-DsLog "Server allaqachon sog'lom ishlayapti - ikkinchi nusxa ochilmadi." "OK"; Open-DsBrowser $chk.url; exit $EX_OK }
  Stop-DsWith $EX_MANUAL "Server jarayoni bor, lekin sog'lom emas. Ikkinchi nusxa ochilmadi. Log: $(Join-Path $ctx.Root 'logs\dronstream.log'). To'xtatish: $($ctx.Exe) stop --root `"$($ctx.Root)`""
}
if ($chk -and @($chk.problems | Where-Object { $_.code -eq "port_busy" }).Count -gt 0) {
  foreach ($pt in $chk.ports) { if (-not $pt.free) { Write-DsLog ("  Band: {0} {1}/{2} -> {3}" -f $pt.name, $pt.addr, $pt.proto, (Get-DsPortOwner $pt.proto $pt.addr)) "ERR" } }
  Stop-DsWith $EX_PORT "Port band. Begona jarayon to'xtatilmaydi: uni o'zingiz yoping yoki $(Join-Path $ctx.Root 'config\dronstream.yaml') da portni o'zgartiring."
}
if ($st.manual.Count -gt 0) { $st.manual | ForEach-Object { Write-DsLog ("  - " + $_) "ERR" }; Stop-DsWith $EX_MANUAL "Qo'lda tuzatish kerak. Baza, parollar va TLS avtomatik o'zgartirilmaydi (BACKUP_RESTORE_UZ.md, INSTALL_UZ.md)." }
if ($st.fixable.Count -gt 0) { $st.fixable | ForEach-Object { Write-DsLog ("  - " + $_) "ERR" }; Stop-DsWith $EX_FAIL "Tayyorlashdan keyin ham muammo qoldi." }

Write-DsLog "3/4 Ishga tushirish" "STEP"
$svc = Get-CimInstance Win32_Service -Filter "Name='DronStream'" -ErrorAction SilentlyContinue
if ($svc -and $svc.PathName -and $svc.PathName -like ("*" + $ctx.Root + "*")) {
  Write-DsLog "Windows service o'rnatilgan: uni ishga tushirish uchun administrator ruxsati so'raladi (faqat shu amal uchun)." "WARN"
  Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList @("-NoProfile", "-Command", "Start-Service DronStream")
} else {
  Start-Process -FilePath $ctx.Exe -ArgumentList @("run", "--root", "`"$($ctx.Root)`"") -WindowStyle Hidden -WorkingDirectory (Split-Path $ctx.Exe)
}

Write-DsLog "4/4 Health-check" "STEP"
$ok = $false
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 1
  if ((Invoke-DsNative $ctx.Exe @("status", "--root", $ctx.Root) -Quiet).Code -eq 0) { $ok = $true; break }
}
if (-not $ok) {
  $sl = Join-Path $ctx.Root "logs\dronstream.log"
  if (Test-Path $sl) { Get-Content $sl -Tail 15 | ForEach-Object { Write-DsLog ("  " + $_) "WARN" } }
  Stop-DsWith $EX_FAIL "Server 45 soniyada sog'lom holatga kelmadi. Server logi: $sl"
}
Write-DsLog "DronStream ishlayapti." "OK"
$tok = Join-Path $ctx.Root "data\runtime\setup-token.txt"
if (Test-Path $tok) {
  Write-DsLog "Birinchi ishga tushirish: brauzerda administratorni yarating. Bir martalik kod faqat shu oynada ko'rsatiladi (logga yozilmaydi):" "WARN"
  Write-DsConsoleOnly ("    " + (Get-Content $tok -Raw).Trim()) "Yellow"
}
Write-DsLog "Eslatma: o'z-o'zidan imzolangan sertifikatda brauzer ogohlantiradi; bu kutilgan holat (INSTALL_UZ.md, 7-bo'lim)."
Open-DsBrowser $chk.url
exit $EX_OK
