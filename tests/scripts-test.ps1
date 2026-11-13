<#
.SYNOPSIS  DronStreamStart/Tayyorla/pull/push skriptlarining avtomatik testlari (lokal, GitHub'ga tegmaydi).
.EXAMPLE   powershell -ExecutionPolicy Bypass -File tests\scripts-test.ps1 -PackageZip dist\DronStream-1.1.0-win64.zip -Work "C:\temp\ds scripts test"
  Paket testlari bo'sh joy va Unicode belgili papkada bajariladi. Git testlari lokal bare repozitoriy bilan.
#>
param([Parameter(Mandatory = $true)][string]$PackageZip, [Parameter(Mandatory = $true)][string]$Work, [switch]$SkipFreshClone)
$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$results = [ordered]@{}
function Check($name, $cond, $detail = "") { $results[$name] = if ($cond) { "PASS" } else { "FAIL $detail" }; Write-Host ("{0,-62} {1}" -f $name, $results[$name]) }
function RunBat([string]$bat, [string]$argsLine = "") {
  $env:DS_NO_PAUSE = "1"; $env:DS_NO_BROWSER = "1"
  $out = cmd /c "`"$bat`" $argsLine 2>&1"
  return [pscustomobject]@{ Code = $LASTEXITCODE; Out = ($out -join "`n") }
}
function DsProcs([string]$root) { @(Get-Process dronstream -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$root*" }).Count }
$ports = @{ web = 48443; int = 49180; api = 49997; whep = 48889; udp = 48189; rtmp = 41935 }
function TestConfig([string]$root) {
  $p = Join-Path $root "config\dronstream.yaml"
  $c = Get-Content $p -Raw
  $c = $c.Replace('listen: ":8443"', "listen: `"127.0.0.1:$($ports.web)`"").Replace('"127.0.0.1:9180"', "`"127.0.0.1:$($ports.int)`"").Replace('"127.0.0.1:9997"', "`"127.0.0.1:$($ports.api)`"").Replace('"127.0.0.1:8889"', "`"127.0.0.1:$($ports.whep)`"").Replace('webrtc_udp_listen: ":8189"', "webrtc_udp_listen: `"127.0.0.1:$($ports.udp)`"").Replace('rtmp_listen: ":1935"', "rtmp_listen: `"127.0.0.1:$($ports.rtmp)`"")
  Set-Content $p $c -Encoding utf8
}

function Stop-TestServers { Get-Process dronstream -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Work*" } | ForEach-Object { $root = Split-Path (Split-Path (Split-Path $_.Path)); if ($_.Path -like "*\build\dronstream.exe") { $root = Join-Path (Split-Path (Split-Path $_.Path)) "runtime" }; & $_.Path stop --root $root 2>$null | Out-Null } }
trap { Stop-TestServers; throw }
if (Test-Path $Work) { Stop-TestServers; Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory $Work | Out-Null

# ================= package mode, path with spaces + Unicode =================
$uni = Join-Path $Work ("Yangi papka " + [char]0x045E + [char]0x0437 + [char]0x0431 + "ek")
New-Item -ItemType Directory $uni | Out-Null
Expand-Archive $PackageZip -DestinationPath $uni
$pkg = (Get-ChildItem $uni -Directory)[0].FullName
Write-Host "Paket: $pkg"
# first preparation creates config; set test ports, then Start must start it
$r = RunBat (Join-Path $pkg "DronStreamTayyorla.bat")
Check "tayyorla: paket rejimi, bo'sh joy+Unicode papka, kompilyatorsiz" ($r.Code -eq 0 -and (Test-Path (Join-Path $pkg "config\dronstream.yaml"))) $r.Out
TestConfig $pkg
$cfgHash = (Get-FileHash (Join-Path $pkg "config\dronstream.yaml")).Hash
$r = RunBat (Join-Path $pkg "DronStreamTayyorla.bat")
Check "tayyorla: qayta ishga tushirish mavjud konfiguratsiyani buzmaydi" ($r.Code -eq 0 -and (Get-FileHash (Join-Path $pkg "config\dronstream.yaml")).Hash -eq $cfgHash)
Remove-Item (Join-Path $pkg "app\active.txt")
$r = RunBat (Join-Path $pkg "DronStreamStart.bat")
Check "start: yetishmagan fayl -> avtomatik tayyorlash -> ishga tushdi" ($r.Code -eq 0 -and $r.Out -match "Avtomatik tayyorlash" -and $r.Out -match "ishlayapti") $r.Out
Check "start: birinchi ishga tushirishda setup kodi konsolda" ($r.Out -match "Bir martalik kod")
$logs = Get-ChildItem (Join-Path $pkg "logs") -Filter "start-*.log" | Sort-Object LastWriteTime | Select-Object -Last 1
$tok = (Get-Content (Join-Path $pkg "data\runtime\setup-token.txt") -Raw).Trim()
Check "start: setup kodi logga yozilmagan" (-not (Select-String -Path $logs.FullName -SimpleMatch $tok -Quiet))
$n1 = DsProcs $pkg
$r = RunBat (Join-Path $pkg "DronStreamStart.bat")
$n2 = DsProcs $pkg
Check "start: ikkinchi bosishda takroriy jarayon yaratilmaydi" ($r.Code -eq 0 -and $n1 -eq 1 -and $n2 -eq 1 -and $r.Out -match "allaqachon") "procs $n1 -> $n2"
# parallel start lock
$p1 = Start-Process cmd -ArgumentList "/c", "`"$(Join-Path $pkg 'DronStreamStart.bat')`"" -PassThru -WindowStyle Hidden
$r = RunBat (Join-Path $pkg "DronStreamStart.bat")
$p1.WaitForExit(60000) | Out-Null
Check "start: parallel ishga tushirishda bittasi kutadi/rad etadi" ((DsProcs $pkg) -eq 1)
& (Join-Path $pkg ("app\" + (Get-Content (Join-Path $pkg "app\active.txt") -Raw).Trim() + "\dronstream.exe")) stop --root $pkg | Out-Null

# busy port: another program listens on the HTTPS port
$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse("127.0.0.1"), $ports.web)
$listener.Start()
$r = RunBat (Join-Path $pkg "DronStreamStart.bat")
$stillMine = $listener.Server.IsBound
$listener.Stop()
Check "start: band port aniq tashxis, begona jarayon to'xtatilmaydi (kod 2)" ($r.Code -eq 2 -and $r.Out -match "Band" -and $stillMine -and (DsProcs $pkg) -eq 0) $r.Out

# prepare failure => exactly one attempt, no loop
$mtx = Get-ChildItem $pkg -Recurse -Filter mediamtx.exe | Select-Object -First 1
Rename-Item $mtx.FullName "mediamtx.exe.bak"
$before = @(Get-ChildItem (Join-Path $pkg "logs") -Filter "tayyorla-*.log").Count
$sw = [Diagnostics.Stopwatch]::StartNew()
$r = RunBat (Join-Path $pkg "DronStreamStart.bat")
$sw.Stop()
$after = @(Get-ChildItem (Join-Path $pkg "logs") -Filter "tayyorla-*.log").Count
Check "start: tayyorlash xatosida bitta urinish, cheksiz sikl yo'q" ($r.Code -ne 0 -and ($after - $before) -eq 1 -and $r.Out -match "Qayta urinilmaydi" -and $sw.Elapsed.TotalSeconds -lt 120) ("prepare runs: " + ($after - $before) + "`n" + $r.Out)
Rename-Item (Join-Path $mtx.DirectoryName "mediamtx.exe.bak") "mediamtx.exe"

# ================= git: pull / push with a local bare remote =================
$g = Join-Path $Work "git"
New-Item -ItemType Directory $g | Out-Null
$bare = Join-Path $g "remote.git"
git clone -q --bare $repo $bare
$A = Join-Path $g "kompyuter A"; $B = Join-Path $g "kompyuter B"
git clone -q $bare $A; git clone -q $bare $B
foreach ($c in $A, $B) { git -C $c config user.name "Test"; git -C $c config user.email "test@example.invalid" }

# pull with local changes keeps them
Add-Content (Join-Path $B "PROGRESS.md") "`nlokal o'zgarish"
$r = RunBat (Join-Path $B "pull.bat")
Check "pull: lokal o'zgarish bor -> to'xtaydi, o'zgarish saqlanadi (stash yo'q)" ($r.Code -eq 4 -and (Get-Content (Join-Path $B "PROGRESS.md") -Raw) -match "lokal o'zgarish" -and -not (git -C $B stash list)) $r.Out
git -C $B checkout -q -- PROGRESS.md

# secret detection: nothing committed, file untouched
Set-Content (Join-Path $A "eslatma.txt") ("-----BEGIN " + "RSA PRIVATE KEY-----`nMIIEow`n-----END RSA PRIVATE KEY-----")
$head0 = (git -C $A rev-parse HEAD)
$r = RunBat (Join-Path $A "push.bat") "-Message `"sir sinovi`" -NoChecks"
Check "push: sir topildi -> to'xtadi, qiymat chiqmadi, commit yo'q" ($r.Code -eq 4 -and $r.Out -match "eslatma.txt:1" -and $r.Out -notmatch "MIIEow" -and (git -C $A rev-parse HEAD) -eq $head0 -and (Test-Path (Join-Path $A "eslatma.txt"))) $r.Out
Remove-Item (Join-Path $A "eslatma.txt")
# data files are ignored / refused
Set-Content (Join-Path $A "baza.db") "SQLite format 3"
New-Item -ItemType Directory (Join-Path $A "runtime\config") -Force | Out-Null
Set-Content (Join-Path $A "runtime\config\dronstream.yaml") "web: {}"
Add-Content (Join-Path $A "PROGRESS.md") "`nA dan hujjat o'zgarishi"
$r = RunBat (Join-Path $A "push.bat") "-Message `"hujjat: A`" -NoChecks"
$pushedFiles = git -C $bare ls-tree -r --name-only HEAD
Check "push: o'zgarish commit+push, SHA mos, baza/runtime yuborilmadi" ($r.Code -eq 0 -and $r.Out -match "Lokal SHA = remote SHA" -and -not ($pushedFiles -match "baza\.db|^runtime/")) $r.Out

# remote ahead -> push stops (no force), local commit kept
Add-Content (Join-Path $B "README_UZ.md") "`nB"
git -C $B commit -qam "B o'zgarishi"
Add-Content (Join-Path $B "ARCHITECTURE.md") "`nB2"
$r = RunBat (Join-Path $B "push.bat") "-Message `"B ikkinchi`" -NoChecks"
Check "push: remote oldinda -> force'siz to'xtaydi, lokal commitlar saqlanadi" ($r.Code -eq 4 -and $r.Out -match "pull" -and (git -C $B log --oneline -2) -match "B ikkinchi") $r.Out
# diverged -> pull refuses to reset
$r = RunBat (Join-Path $B "pull.bat")
Check "pull: tarixlar ajralgan -> reset/force yo'q, aniq xabar" ($r.Code -eq 4 -and $r.Out -match "ajralgan" -and (git -C $B log --oneline -1) -match "B ikkinchi") $r.Out

# push failure (unreachable remote) keeps the local commit
git -C $A remote set-url origin (Join-Path $g "yoq-remote.git")
Add-Content (Join-Path $A "PROGRESS.md") "`ntarmoq xatosi sinovi"
$r = RunBat (Join-Path $A "push.bat") "-Message `"tarmoq yo'q`" -NoChecks"
Check "push: remote'ga ulanib bo'lmasa lokal commit saqlanadi va aytiladi" ($r.Code -ne 0 -and $r.Out -match "SAQLANGAN" -and (git -C $A log --oneline -1) -match "tarmoq yo'q") $r.Out
git -C $A remote set-url origin $bare

# pull in a clean checkout: fast-forward, docs-only change => no build
$C = Join-Path $g "kompyuter C"
git clone -q $bare $C
git -C $C reset -q --hard HEAD~1
$r = RunBat (Join-Path $C "pull.bat") "-NoPrepare"
Check "pull: toza papkada fast-forward, olingan commit ko'rsatiladi" ($r.Code -eq 0 -and $r.Out -match "Yangilandi") $r.Out

# bootstrap: only pull.bat in a new folder; busy target is never overwritten
$fresh = Join-Path $g ("Yangi kompyuter " + [char]0x011F)
New-Item -ItemType Directory $fresh | Out-Null
Copy-Item (Join-Path $repo "pull.bat") $fresh
New-Item -ItemType Directory (Join-Path $fresh "DronStream") | Out-Null
Set-Content (Join-Path $fresh "DronStream\muhim.txt") "begona fayl"
$env:DS_REPO_URL = $bare
$r = RunBat (Join-Path $fresh "pull.bat")
Check "pull (yangi kompyuter): band papka ustidan yozilmaydi" ($r.Code -eq 4 -and (Get-Content (Join-Path $fresh "DronStream\muhim.txt")) -eq "begona fayl") $r.Out
Remove-Item (Join-Path $fresh "DronStream") -Recurse -Force
if (-not $SkipFreshClone) {
  $r = RunBat (Join-Path $fresh "pull.bat")
  $ok = (Test-Path (Join-Path $fresh "DronStream\.git")) -and (Test-Path (Join-Path $fresh "DronStream\build\dronstream.exe")) -and $r.Out -match "DronStreamStart.bat"
  Check "pull (yangi kompyuter): clone + DronStreamTayyorla (Go/Node/MediaMTX .tools ga, build)" ($ok -and $r.Code -eq 0) ($r.Out.Substring([Math]::Max(0, $r.Out.Length - 3000)))
  Check "yangi clone'da sir/baza yo'q (runtime faqat shablondan)" (-not (Test-Path (Join-Path $fresh "DronStream\runtime\data\dronstream.db")) -and -not (Test-Path (Join-Path $fresh "DronStream\runtime\config\secrets\master.key")))
  # offline with tools present: works from local tools
  $r = RunBat (Join-Path $fresh "DronStream\DronStreamTayyorla.bat") "-Offline"
  Check "tayyorla -Offline: mavjud lokal vositalar bilan ishlaydi, qayta yuklamaydi" ($r.Code -eq 0 -and $r.Out -notmatch "Yuklab olinmoqda") $r.Out
}
Remove-Item Env:DS_REPO_URL
# offline without tools: clear message, exit 6
$D = Join-Path $g "offline"
git clone -q $bare $D
$r = RunBat (Join-Path $D "DronStreamTayyorla.bat") "-Offline"
Check "tayyorla -Offline, vositalar yo'q: tushunarli xabar (kod 6)" ($r.Code -eq 6 -and $r.Out -match "internet yo'q") $r.Out

$out = Join-Path $repo "build\test-results"
New-Item -ItemType Directory -Force $out | Out-Null
$results | ConvertTo-Json | Set-Content (Join-Path $out "scripts-test.json") -Encoding utf8
if (@($results.Values | Where-Object { $_ -ne "PASS" }).Count -gt 0) { exit 1 }
