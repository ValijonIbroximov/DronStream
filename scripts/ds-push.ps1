<#
.SYNOPSIS  push: o'zgarishlarni tekshirib commit qiladi va GitHub'ga yuboradi (force'siz).
.DESCRIPTION
  - Git, repozitoriy, remote, branch va kirish (Git Credential Manager) tekshiriladi; token so'ralmaydi.
  - user.name / user.email bo'lmasa foydalanuvchidan so'raladi va faqat shu repozitoriyga yoziladi.
  - Yuboriladigan fayllar va yangi commitlar tarixi sir/ma'lumot fayllari bo'yicha tekshiriladi;
    topilsa qiymat ko'rsatilmasdan fayl:qator chiqariladi va push to'xtatiladi.
  - Remote'da yangi commit bo'lsa to'xtaydi (avval pull). Push muvaffaqiyatsiz bo'lsa lokal commit saqlanadi.
  - Muvaffaqiyatdan so'ng lokal va remote SHA solishtiriladi, commit havolasi chiqariladi.
.EXAMPLE   push.bat -Message "Hujjatlar yangilandi"
#>
param([string]$Message, [switch]$NoChecks)
. (Join-Path $PSScriptRoot "ds-common.ps1")
$ctx = Get-DsContext
Start-DsLog $ctx "push"
$lock = Enter-DsLock $ctx "git"
if (-not $lock) { Stop-DsWith $EX_LOCKED "Boshqa pull/push jarayoni ishlamoqda." }
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) { Stop-DsWith $EX_MANUAL "Git topilmadi. O'rnating: https://git-scm.com/download/win (yoki: winget install --id Git.Git -e)" }
$git = $gitCmd.Source
function G([string[]]$a, [switch]$Quiet) { return Invoke-DsNative $git (@("-C", $ctx.Base) + $a) -Quiet:$Quiet }

if ((G @("rev-parse", "--is-inside-work-tree") -Quiet).Out.Trim() -ne "true") { Stop-DsWith $EX_MANUAL "Bu papka Git repozitoriy emas: $($ctx.Base)" }
$branch = (G @("symbolic-ref", "--quiet", "--short", "HEAD") -Quiet).Out.Trim()
if (-not $branch) { Stop-DsWith $EX_MANUAL "HEAD biror branchda emas (detached)." }
$remote = (G @("config", "--get", "branch.$branch.remote") -Quiet).Out.Trim()
if (-not $remote) { $remote = "origin" }
$rurl = G @("remote", "get-url", $remote) -Quiet
if ($rurl.Code -ne 0) { Stop-DsWith $EX_MANUAL "Remote '$remote' yo'q. Masalan: git remote add origin https://github.com/ValijonIbroximov/DronStream.git" }
$url = $rurl.Out.Trim()
if ($url -match '://[^/@]+@') { Stop-DsWith $EX_MANUAL "Remote URL ichida login/token bor. Xavfsizlik uchun uni olib tashlang: git remote set-url $remote https://github.com/<egasi>/<repo>.git" }
Write-DsLog ("Repozitoriy: {0} | branch: {1} | remote: {2}" -f $ctx.Base, $branch, $url) "STEP"

# identity (local only, never guessed)
foreach ($k in "user.name", "user.email") {
  if (-not (G @("config", "--get", $k) -Quiet).Out.Trim()) {
    $v = Read-Host ("Git {0} sozlanmagan. Shu repozitoriy uchun kiriting" -f $k)
    if (-not $v) { Stop-DsWith $EX_MANUAL "$k kiritilmadi." }
    G @("config", "--local", $k, $v) -Quiet | Out-Null
  }
}

# ---------------- secret / data scanner ----------------
$forbidden = @(
  '(^|/)\.env(\..*)?$', '\.(key|pem|pfx|p12|crt|cer|der|jks|kdbx)$', '(^|/)secrets?/', '(^|/)credentials?(\.|/|$)', 'id_(rsa|ed25519|ecdsa)',
  '\.(db|sqlite|sqlite3|db-wal|db-shm)$', '\.dsbak$', '(^|/)(data|runtime|devroot|logs)/', '\.log$', '(^|/)\.tools/', '(^|/)node_modules/',
  '(^|/)(dist|build)/', '\.(zip|7z|rar|exe|msi)$', '\.(mp4|mov|mkv|webm|avi)$', 'setup-token\.txt$', 'ctl\.token$', 'master\.key$', 'DEV_CREDENTIALS'
)
$allowed = @('^config/dronstream\.example\.yaml$', '^backend/internal/webui/dist/\.keep$','^backend/internal/demo/assets/demo_[ab]\.h264$', '^\.env\.example$')
$patterns = @(
  @{ n = "maxfiy kalit (PEM)"; r = '-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----' },
  @{ n = "GitHub token"; r = '\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})' },
  @{ n = "AWS kalit"; r = '\bAKIA[0-9A-Z]{16}\b' },
  @{ n = "Slack token"; r = '\bxox[baprs]-[A-Za-z0-9-]{10,}' },
  @{ n = "Google API kalit"; r = '\bAIza[0-9A-Za-z_-]{35}\b' },
  @{ n = "URL ichida parol"; r = '://[^/\s:@"]+:[^/\s@"]{6,}@' },
  @{ n = "DronStream backup"; r = '^DSBAK[12]' },
  @{ n = "SQLite baza"; r = '^SQLite format 3' }
)
function Test-PathBad([string]$p) {
  foreach ($a in $allowed) { if ($p -match $a) { return $false } }
  foreach ($f in $forbidden) { if ($p -match $f) { return $true } }
  return $false
}
$script:findings = @()
function Scan-Blob([string]$where, [string]$text) {
  $lines = $text -split "`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($p in $patterns) { if ($lines[$i] -match $p.r) { $script:findings += ("{0}:{1} - {2}" -f $where, ($i + 1), $p.n) } }
  }
}
function Scan-Rev([string]$rev, [string[]]$paths) {
  foreach ($p in $paths) {
    if (-not $p) { continue }
    if (Test-PathBad $p) { $script:findings += ("{0} - taqiqlangan fayl turi/joyi (sir, baza, log, media, build yoki vosita)" -f $p); continue }
    $size = (G @("cat-file", "-s", "${rev}:$p") -Quiet)
    if ($size.Code -eq 0 -and [int64]$size.Out.Trim() -gt 5MB) { $script:findings += ("{0} - juda katta fayl ({1} MB)" -f $p, [math]::Round([int64]$size.Out.Trim() / 1MB, 1)); continue }
    $c = G @("show", "${rev}:$p") -Quiet
    if ($c.Code -eq 0) { Scan-Blob $p $c.Out }
  }
}

$status = (G @("status", "--porcelain") -Quiet).Out.Trim()
$committed = $false
if ($status) {
  Write-DsLog "O'zgarishlar:" "STEP"
  $status -split "`n" | Select-Object -First 60 | ForEach-Object { Write-DsLog ("  " + $_) }
  if (-not $NoChecks) {
    $changedFiles = ($status -split "`n" | ForEach-Object { $_.Substring(3) })
    $goFiles = @($changedFiles | Where-Object { $_ -like "backend/*" }).Count
    $webFiles = @($changedFiles | Where-Object { $_ -like "web/*" }).Count
    $go = Join-Path $ctx.Base ".tools\go\bin\go.exe"
    if ($goFiles -gt 0 -and (Test-Path $go)) {
      $env:GOROOT = Join-Path $ctx.Base ".tools\go"; $env:GOPATH = Join-Path $ctx.Base ".tools\gopath"; $env:GOCACHE = Join-Path $ctx.Base ".tools\gocache"; $env:GOTOOLCHAIN = "local"; $env:CGO_ENABLED = "0"
      Write-DsLog "Tezkor tekshiruv: go vet" "STEP"
      if ((Invoke-DsNative $go @("vet", "./...") -WorkDir (Join-Path $ctx.Base "backend")).Code -ne 0) { Stop-DsWith $EX_FAIL "go vet xato topdi - commit qilinmadi." }
    }
    $tsc = Join-Path $ctx.Base "web\node_modules\.bin\tsc.cmd"
    if ($webFiles -gt 0 -and (Test-Path $tsc)) {
      $nd = Join-Path $ctx.Base ".tools\node"; if (Test-Path $nd) { $env:PATH = "$nd;$env:PATH" }
      Write-DsLog "Tezkor tekshiruv: TypeScript" "STEP"
      if ((Invoke-DsNative $tsc @("-b") -WorkDir (Join-Path $ctx.Base "web")).Code -ne 0) { Stop-DsWith $EX_FAIL "TypeScript xato topdi - commit qilinmadi." }
    }
  }
  G @("add", "-A") -Quiet | Out-Null
  $staged = (G @("diff", "--cached", "--name-only", "--diff-filter=ACMR") -Quiet).Out -split "`n"
  Scan-Rev ":0" $staged   # index content
  if ($script:findings.Count -gt 0) {
    G @("reset", "-q") -Quiet | Out-Null   # unstage only; files are untouched
    $script:findings | Select-Object -Unique | ForEach-Object { Write-DsLog ("  " + $_) "ERR" }
    Stop-DsWith $EX_MANUAL "Push to'xtatildi: sir yoki ma'lumot fayli topildi (qiymatlar ko'rsatilmadi). Faylni olib tashlang yoki .gitignore ga qo'shing. Hech narsa commit qilinmadi."
  }
  if (-not $Message) { $Message = Read-Host "Commit xabari" }
  if (-not $Message.Trim()) { G @("reset", "-q") -Quiet | Out-Null; Stop-DsWith $EX_MANUAL "Commit xabari bo'sh - commit qilinmadi." }
  $cm = G @("commit", "-q", "-m", $Message)
  if ($cm.Code -ne 0) { Stop-DsWith $EX_FAIL "Commit bajarilmadi." }
  $committed = $true
  Write-DsLog ("Lokal commit: " + (G @("log", "-1", "--oneline") -Quiet).Out.Trim()) "OK"
} else { Write-DsLog "Ishchi papkada yangi o'zgarish yo'q." }

# reach remote (uses Git Credential Manager / normal GitHub sign-in)
Write-DsLog "Remote bilan aloqa (fetch)..." "STEP"
$f = G @("fetch", $remote)
if ($f.Code -ne 0) {
  $msg = "Remote'ga ulanib bo'lmadi (internet yoki GitHub kirishi)."
  if ($committed) { $msg += " Lokal commit SAQLANGAN; keyinroq push.bat ni qayta ishga tushiring." }
  Stop-DsWith $EX_FAIL $msg
}
$up = "$remote/$branch"
$hasUp = (G @("rev-parse", "--verify", "--quiet", $up) -Quiet).Code -eq 0
if ($hasUp) {
  $counts = ((G @("rev-list", "--left-right", "--count", "HEAD...$up") -Quiet).Out.Trim() -split "\s+")
  $ahead = [int]$counts[0]; $behind = [int]$counts[1]
  if ($behind -gt 0) { Stop-DsWith $EX_MANUAL "Remote'da sizda yo'q $behind ta yangi commit bor. Force push ishlatilmaydi: avval pull.bat (lokal commitlaringiz saqlanadi)." }
  if ($ahead -eq 0) { Write-DsLog "Yuboriladigan narsa yo'q - lokal va remote bir xil." "OK"; exit $EX_OK }
  $range = "$up..HEAD"
} else { $range = "HEAD"; Write-DsLog "Remote'da '$branch' hali yo'q - birinchi push." "WARN" }

# scan history of every commit about to be pushed
$revs = (G @("rev-list", "--reverse", $range) -Quiet).Out -split "`n" | Where-Object { $_ }
Write-DsLog ("Yuboriladigan {0} ta commit sirlar bo'yicha tekshirilmoqda" -f $revs.Count) "STEP"
foreach ($rv in $revs) {
  $files = (G @("diff-tree", "--no-commit-id", "--name-only", "-r", "--root", "--diff-filter=ACMR", $rv) -Quiet).Out -split "`n"
  $before = $script:findings.Count
  Scan-Rev $rv $files
  if ($script:findings.Count -gt $before) { $script:findings += ("  ^ commit " + $rv.Substring(0, 10)) }
}
if ($script:findings.Count -gt 0) {
  $script:findings | Select-Object -Unique | ForEach-Object { Write-DsLog ("  " + $_) "ERR" }
  Stop-DsWith $EX_MANUAL "Push to'xtatildi: yuboriladigan commitlar tarixida sir/ma'lumot fayli bor (qiymatlar ko'rsatilmadi). Lokal commitlar saqlandi; tarixni tozalash qo'lda qilinadi."
}

Write-DsLog "push..." "STEP"
$pushArgs = @("push", $remote, $branch)
if (-not $hasUp) { $pushArgs = @("push", "-u", $remote, $branch) }
$p = G $pushArgs
if ($p.Code -ne 0) {
  Stop-DsWith $EX_FAIL ("Push bajarilmadi (tarmoq, ruxsat yoki remote rad etdi). Lokal commitlar SAQLANGAN: {0}. Keyinroq push.bat ni qayta ishga tushiring." -f (G @("rev-parse", "--short", "HEAD") -Quiet).Out.Trim())
}
G @("fetch", $remote) -Quiet | Out-Null
$local = (G @("rev-parse", "HEAD") -Quiet).Out.Trim()
$rem = (G @("rev-parse", $up) -Quiet).Out.Trim()
if ($local -ne $rem) { Stop-DsWith $EX_FAIL "Push'dan keyin lokal ($local) va remote ($rem) SHA mos emas." }
$web = $url -replace '\.git$', '' -replace '^git@github\.com:', 'https://github.com/'
Write-DsLog ("Yuborildi. Lokal SHA = remote SHA = {0}" -f $local) "OK"
if ($web -like "https://github.com/*") { Write-DsLog ("Commit: {0}/commit/{1}" -f $web, $local) "OK" }
exit $EX_OK
