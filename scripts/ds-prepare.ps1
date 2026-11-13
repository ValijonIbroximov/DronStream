<#
.SYNOPSIS  DronStreamTayyorla: kompyuterni DronStream'ni ishga tushirishga tayyorlaydi.
.DESCRIPTION
  Tarqatish paketi (app\<versiya>\dronstream.exe bor): kompilyator talab qilinmaydi; papkalar,
    faol versiya va sirsiz konfiguratsiya shabloni tayyorlanadi, paket yaxlitligi tekshiriladi.
  Git'dan olingan manba kod: mahkamlangan Go/Node/MediaMTX .tools ichiga (checksum bilan) tayyorlanadi,
    lock fayllar bo'yicha bog'liqliklar o'rnatiladi, frontend va backend kerak bo'lsa yig'iladi,
    lokal runtime papkasi (runtime\) tayyorlanadi.
  Mavjud konfiguratsiya, ma'lumotlar va sirlar hech qachon ustidan yozilmaydi.
  Firewall, Windows service va sertifikatni ishonch omboriga qo'shish bu yerda QILINMAYDI
  (alohida: scripts\firewall-rules.ps1, scripts\service-install.ps1 - administrator bilan).
  Chiqish kodlari: 0 tayyor, 1 xato, 2 port band, 3 boshqa jarayon ishlamoqda, 4 qo'lda tuzatish kerak,
  5 platforma qo'llanmaydi, 6 internet yo'q va vosita yetishmaydi, 7 server ishlayapti (qayta build mumkin emas).
#>
param([switch]$Offline)
. (Join-Path $PSScriptRoot "ds-common.ps1")
trap { Write-DsUnexpected $_; exit 1 }
$ctx = Get-DsContext
Start-DsLog $ctx "tayyorla"
if ($ctx.Mode -eq "unknown") { Stop-DsWith $EX_MANUAL "Bu papka DronStream manba kodi ham, tarqatish paketi ham emas: $($ctx.Base)" }
$lock = Enter-DsLock $ctx "prepare"
if (-not $lock) { Stop-DsWith $EX_LOCKED "DronStreamTayyorla allaqachon ishlamoqda (boshqa oynada). Uning tugashini kuting." }

# ---- platform ----
$arch = $env:PROCESSOR_ARCHITECTURE
if ($env:PROCESSOR_ARCHITEW6432) { $arch = $env:PROCESSOR_ARCHITEW6432 }
$osv = [Environment]::OSVersion.Version
Write-DsLog ("Windows {0}.{1} build {2}, arxitektura {3}, PowerShell {4}" -f $osv.Major, $osv.Minor, $osv.Build, $arch, $PSVersionTable.PSVersion) "STEP"
if ($osv.Major -lt 10) { Stop-DsWith $EX_PLATFORM "Windows 10 yoki 11 kerak (topildi: $($osv.ToString()))." }
if ($arch -ne "AMD64") {
  Stop-DsWith $EX_PLATFORM "Qo'llab-quvvatlanmaydigan protsessor arxitekturasi: $arch. Faqat x64 (AMD64) Windows sinalgan (MediaMTX windows_amd64). ARM64 va 32-bit hozircha qo'llanmaydi."
}

function Ensure-Dirs([string]$root) {
  foreach ($d in "config", "config\secrets", "data", "data\backups", "data\runtime", "data\media", "logs") {
    $p = Join-Path $root $d
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force $p | Out-Null; Write-DsLog "Papka yaratildi: $p" }
  }
}
function Ensure-Config([string]$root, [string]$example) {
  $cfg = Join-Path $root "config\dronstream.yaml"
  if (Test-Path $cfg) { Write-DsLog "Konfiguratsiya mavjud (o'zgartirilmaydi): $cfg"; return }
  if (-not (Test-Path $example)) { Stop-DsWith $EX_MANUAL "Konfiguratsiya namunasi topilmadi: $example" }
  Copy-Item $example $cfg
  Write-DsLog "Birinchi sozlash: sirsiz namunadan konfiguratsiya yaratildi: $cfg" "OK"
}

# ======================= release package =======================
if ($ctx.Mode -eq "package") {
  Write-DsLog "Rejim: tarqatish paketi (kompilyator kerak emas)" "STEP"
  $sums = Join-Path $ctx.Base "SHA256SUMS.txt"
  if (Test-Path $sums) {
    $bad = @()
    Get-Content $sums | ForEach-Object {
      $h, $rel = $_ -split "  ", 2
      $p = Join-Path $ctx.Base $rel
      if (-not (Test-Path $p)) { $bad += "yo'q: $rel" }
      elseif ((Get-FileHash $p -Algorithm SHA256).Hash.ToLowerInvariant() -ne $h) {
        if ($rel -notlike "scripts\*" -and $rel -notlike "*.bat") { $bad += "o'zgargan: $rel" }
      }
    }
    if ($bad.Count -gt 0) { $bad | ForEach-Object { Write-DsLog ("  " + $_) "ERR" }; Stop-DsWith $EX_MANUAL "Paket fayllari buzilgan yoki yetishmaydi. Paketni rasmiy manbadan qayta yuklab oling." }
    Write-DsLog "Paket yaxlitligi (SHA256SUMS) tekshirildi" "OK"
  }
  $active = Join-Path $ctx.Base "app\active.txt"
  if (-not (Test-Path $active)) {
    $ver = (Get-Content (Join-Path $ctx.Base "VERSION") -Raw).Trim()
    Set-Content $active $ver -Encoding ascii
    Write-DsLog "Faol versiya belgilandi: $ver" "OK"
    $ctx = Get-DsContext
  }
  if (-not (Test-Path $ctx.Exe)) { Stop-DsWith $EX_MANUAL "Dastur fayli topilmadi: $($ctx.Exe)" }
  if (-not (Test-Path (Join-Path (Split-Path $ctx.Exe) "mediamtx\mediamtx.exe"))) { Stop-DsWith $EX_MANUAL "MediaMTX paket ichida topilmadi. Paketni qayta yuklab oling." }
  Ensure-Dirs $ctx.Root
  Ensure-Config $ctx.Root (Join-Path $ctx.Base "config\dronstream.example.yaml")
}

# ======================= source checkout =======================
if ($ctx.Mode -eq "source") {
  Write-DsLog "Rejim: Git'dan olingan manba kod" "STEP"
  $tools = Get-DsToolsDir $ctx
  if ($tools -ne (Join-Path $ctx.Base ".tools")) { Write-DsLog ("Loyiha yo'li juda uzun (Windows 260 belgi chegarasi): vositalar qisqa papkaga o'rnatiladi: " + $tools) "WARN" }
  New-Item -ItemType Directory -Force (Join-Path $tools "dl") | Out-Null
  $online = $null
  function Online { if ($script:Offline) { return $false }; if ($null -eq $script:online) { $script:online = Test-DsOnline }; return $script:online }

  # --- Go ---
  $go = Join-Path $tools "go\bin\go.exe"
  $goOk = (Test-Path $go) -and ((Invoke-DsNative $go @("version") -Quiet).Out -match ("go" + [regex]::Escape($DS_GO_VERSION) + " "))
  if (-not $goOk) {
    if (-not (Online)) { Stop-DsWith $EX_OFFLINE "Go $DS_GO_VERSION topilmadi va internet yo'q. go$DS_GO_VERSION.windows-amd64.zip ni .tools\go ga qo'ying yoki internetga ulanib qayta urining." }
    $zip = Join-Path $tools "dl\go.zip"
    Get-DsFile "https://go.dev/dl/go$DS_GO_VERSION.windows-amd64.zip" $zip $DS_GO_SHA256
    if (Test-Path (Join-Path $tools "go")) { Remove-Item (Join-Path $tools "go") -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tools -Force
  }
  Write-DsLog "Go $DS_GO_VERSION tayyor (.tools\go)" "OK"
  $env:GOROOT = Join-Path $tools "go"; $env:GOPATH = Join-Path $tools "gopath"; $env:GOCACHE = Join-Path $tools "gocache"
  $env:GOTOOLCHAIN = "local"; $env:CGO_ENABLED = "0"; $env:GOTELEMETRY = "off"; $env:GOFLAGS = "-mod=readonly"

  # --- Node ---
  $nodeDir = Join-Path $tools "node"
  $node = Join-Path $nodeDir "node.exe"
  $nodeOk = (Test-Path $node) -and ((Invoke-DsNative $node @("--version") -Quiet).Out.Trim() -eq "v$DS_NODE_VERSION")
  if (-not $nodeOk) {
    if (Online) {
      $zip = Join-Path $tools "dl\node.zip"
      Get-DsFile "https://nodejs.org/dist/v$DS_NODE_VERSION/node-v$DS_NODE_VERSION-win-x64.zip" $zip $DS_NODE_SHA256
      $tmp = Join-Path $tools "node-extract"
      if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
      Expand-Archive $zip -DestinationPath $tmp -Force
      if (Test-Path $nodeDir) { Remove-Item $nodeDir -Recurse -Force }
      Move-Item (Join-Path $tmp "node-v$DS_NODE_VERSION-win-x64") $nodeDir
      Remove-Item $tmp -Recurse -Force
    } else {
      $sys = Get-Command node -ErrorAction SilentlyContinue
      if ($sys -and ((Invoke-DsNative $sys.Source @("--version") -Quiet).Out -match '^v22\.(1[2-9]|[2-9][0-9])')) {
        Write-DsLog "Internet yo'q: tizimdagi Node $((Invoke-DsNative $sys.Source @('--version') -Quiet).Out.Trim()) ishlatiladi (mahkamlangan v$DS_NODE_VERSION emas)" "WARN"
        $nodeDir = Split-Path $sys.Source
      } else {
        Stop-DsWith $EX_OFFLINE "Node.js v$DS_NODE_VERSION topilmadi va internet yo'q. node-v$DS_NODE_VERSION-win-x64.zip ni .tools\node ga oching yoki internetga ulaning."
      }
    }
  }
  $env:PATH = $nodeDir + ";" + $env:PATH
  $npm = Join-Path $nodeDir "npm.cmd"
  Write-DsLog "Node tayyor ($nodeDir)" "OK"

  # --- MediaMTX ---
  $mtxDir = Join-Path $tools "mediamtx"
  $mtx = Join-Path $mtxDir "mediamtx.exe"
  $mtxOk = (Test-Path $mtx) -and ((Invoke-DsNative $mtx @("--version") -Quiet).Out.Trim() -eq $DS_MTX_VERSION)
  if (-not $mtxOk) {
    if (-not (Online)) { Stop-DsWith $EX_OFFLINE "MediaMTX $DS_MTX_VERSION topilmadi va internet yo'q." }
    $zip = Join-Path $tools "dl\mediamtx.zip"
    Get-DsFile "https://github.com/bluenviron/mediamtx/releases/download/$DS_MTX_VERSION/mediamtx_${DS_MTX_VERSION}_windows_amd64.zip" $zip $DS_MTX_SHA256
    Expand-Archive $zip -DestinationPath $mtxDir -Force
  }
  Write-DsLog "MediaMTX $DS_MTX_VERSION tayyor" "OK"

  # --- is the built server running? never overwrite a running binary ---
  $running = $false
  if (Test-Path $ctx.Exe) {
    $chk = Invoke-DsCheck $ctx
    if ($chk -and $chk.running) { $running = $true }
  }

  # --- frontend ---
  $web = Join-Path $ctx.Base "web"
  $lockFile = Join-Path $web "package-lock.json"
  $nmStamp = Join-Path $web "node_modules\.package-lock.json"
  if (-not (Test-Path $nmStamp) -or ((Get-Item $lockFile).LastWriteTimeUtc -gt (Get-Item $nmStamp).LastWriteTimeUtc)) {
    Write-DsLog "Frontend bog'liqliklari o'rnatilmoqda (npm ci, package-lock.json bo'yicha)" "STEP"
    $args2 = @("ci", "--no-audit", "--no-fund")
    if (-not (Online)) { $args2 += "--offline" }
    $r = Invoke-DsNative $npm $args2 -WorkDir $web
    if ($r.Code -ne 0) { Stop-DsWith $(if (Online) { $EX_FAIL } else { $EX_OFFLINE }) "npm ci muvaffaqiyatsiz (internet yo'q bo'lsa npm keshida paketlar bo'lmasligi mumkin)." }
  }
  $dist = Join-Path $web "dist\index.html"
  $srcNewest = Get-DsNewestWrite (Get-ChildItem (Join-Path $web "src"), (Join-Path $web "index.html"), (Join-Path $web "public"), $lockFile, (Join-Path $web "vite.config.ts") -Recurse -File)
  if (-not (Test-Path $dist) -or $srcNewest -gt (Get-Item $dist).LastWriteTimeUtc) {
    Write-DsLog "Frontend yig'ilmoqda" "STEP"
    $r = Invoke-DsNative $npm @("run", "build") -WorkDir $web
    if ($r.Code -ne 0) { Stop-DsWith $EX_FAIL "Frontend build muvaffaqiyatsiz." }
  }
  $embed = Join-Path $ctx.Base "backend\internal\webui\dist"
  $embIdx = Join-Path $embed "index.html"
  if (-not (Test-Path $embIdx) -or (Get-Item $dist).LastWriteTimeUtc -gt (Get-Item $embIdx).LastWriteTimeUtc) {
    Get-ChildItem $embed -Exclude ".keep" | Remove-Item -Recurse -Force
    Copy-Item (Join-Path $web "dist\*") $embed -Recurse -Force
    Write-DsLog "Frontend backend ichiga joylandi" "OK"
  }

  # --- backend ---
  $be = Join-Path $ctx.Base "backend"
  $newest = Get-DsNewestWrite (Get-ChildItem $be -Recurse -File -Include *.go, go.mod, go.sum, *.h264 | Where-Object { $_.FullName -notlike "*\integration\*" })
  $embNewest = (Get-Item $embIdx).LastWriteTimeUtc
  if ($embNewest -gt $newest) { $newest = $embNewest }
  $stale = -not (Test-Path $ctx.Exe) -or $newest -gt (Get-Item $ctx.Exe).LastWriteTimeUtc
  if ($stale) {
    if ($running) { Stop-DsWith $EX_RUNNING "Server ishlayapti; uning dastur fayli ustidan yozilmaydi. Avval serverni to'xtating (build\dronstream.exe stop --root runtime), so'ng qayta tayyorlang." }
    Write-DsLog "Backend yig'ilmoqda (go.sum bo'yicha modullar)" "STEP"
    $ver = "dev"
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) { $gv = Invoke-DsNative $git.Source @("-C", $ctx.Base, "describe", "--tags", "--always", "--dirty") -Quiet; if ($gv.Code -eq 0) { $ver = $gv.Out.Trim() } }
    New-Item -ItemType Directory -Force (Split-Path $ctx.Exe) | Out-Null
    $tmpExe = $ctx.Exe + ".new"
    $r = Invoke-DsNative $go @("build", "-trimpath", "-ldflags", "-X main.version=$ver", "-o", $tmpExe, "./cmd/dronstream") -WorkDir $be
    if ($r.Code -ne 0) {
      if (-not (Online)) { Stop-DsWith $EX_OFFLINE "Backend build muvaffaqiyatsiz: internet yo'q va Go modullari keshda yo'q bo'lishi mumkin." }
      Stop-DsWith $EX_FAIL "Backend build muvaffaqiyatsiz."
    }
    Move-Item $tmpExe $ctx.Exe -Force
    Write-DsLog "Backend tayyor: $($ctx.Exe) ($ver)" "OK"
  } else { Write-DsLog "Backend build eskirmagan" "OK" }
  $bm = Join-Path (Split-Path $ctx.Exe) "mediamtx\mediamtx.exe"
  if (-not (Test-Path $bm) -or (Get-FileHash $bm).Hash -ne (Get-FileHash $mtx).Hash) {
    if ($running) { Write-DsLog "Server ishlayapti: MediaMTX nusxasi yangilanmadi" "WARN" }
    else {
      New-Item -ItemType Directory -Force (Split-Path $bm) | Out-Null
      Copy-Item $mtx $bm -Force
      Copy-Item (Join-Path $mtxDir "LICENSE") (Join-Path (Split-Path $bm) "LICENSE-mediamtx.txt") -Force -ErrorAction SilentlyContinue
    }
  }
  Ensure-Dirs $ctx.Root
  Ensure-Config $ctx.Root (Join-Path $ctx.Base "config\dronstream.example.yaml")
}

# ======================= readiness =======================
$chk = Invoke-DsCheck $ctx
if (-not $chk) { Stop-DsWith $EX_FAIL "Tayyorlik tekshiruvini bajarib bo'lmadi ($($ctx.Exe) check)." }
if ($chk.db.needsMigration) {
  Write-DsLog ("Baza sxemasi v{0}: birinchi ishga tushishda yangi sxemaga o'tkaziladi. Undan oldin dastur avtomatik izchil nusxa oladi: data\backups\pre-migration-schema-v{0}-*.db" -f $chk.db.version) "WARN"
}
if ($chk.running) { Write-DsLog ("Server allaqachon ishlayapti (sog'lom: {0})" -f $chk.healthy) "OK"; exit $EX_OK }
$manual = @($chk.problems | Where-Object { -not $_.fixable })
$fixable = @($chk.problems | Where-Object { $_.fixable })
foreach ($p in $chk.problems) { Write-DsLog ("  - " + $p.message) $(if ($p.fixable) { "WARN" } else { "ERR" }) }
if (@($chk.problems | Where-Object { $_.code -eq "port_busy" }).Count -gt 0) {
  foreach ($pt in $chk.ports) { if (-not $pt.free) { Write-DsLog ("  {0} {1}/{2}: {3}" -f $pt.name, $pt.addr, $pt.proto, (Get-DsPortOwner $pt.proto $pt.addr)) "ERR" } }
  Stop-DsWith $EX_PORT "Kerakli port boshqa dastur tomonidan band. U dastur avtomatik to'xtatilmaydi: uni o'zingiz yoping yoki config\dronstream.yaml da portni o'zgartiring."
}
if ($manual.Count -gt 0) { Stop-DsWith $EX_MANUAL "Qo'lda tuzatish kerak (yuqoridagi sabablar). Ma'lumotlar, parollar va TLS sozlamalari avtomatik o'zgartirilmaydi." }
if ($fixable.Count -gt 0) { Stop-DsWith $EX_FAIL "Tayyorlashdan keyin ham muammo qoldi." }
Write-DsLog "Tayyor. Ishga tushirish: DronStreamStart.bat" "OK"
exit $EX_OK
