<#
.SYNOPSIS  pull: mavjud Git checkout'ni xavfsiz yangilaydi (faqat fast-forward).
.DESCRIPTION
  Lokal o'zgarishlar bo'lsa ularni o'chirmaydi va yashirin stash qilmaydi - to'xtaydi.
  Tarixlar ajralgan bo'lsa reset/force/taxminiy merge qilmaydi - holatni tushuntiradi.
  Yangilanishdan keyin build kerak bo'lsa DronStreamTayyorla'ni ishga tushiradi; server ishlayotgan
  bo'lsa uni to'xtatmaydi va binary ustidan yozmaydi - avval to'xtatishni so'raydi.
  Chiqish kodlari: 0 ok/yangi narsa yo'q, 1 xato, 4 qo'lda harakat kerak, 7 server ishlayapti.
#>
param([switch]$NoPrepare)
. (Join-Path $PSScriptRoot "ds-common.ps1")
trap { Write-DsUnexpected $_; exit 1 }
$ctx = Get-DsContext
Start-DsLog $ctx "pull"
$lock = Enter-DsLock $ctx "git"
if (-not $lock) { Stop-DsWith $EX_LOCKED "Boshqa pull/push jarayoni ishlamoqda." }
$git = (Get-Command git -ErrorAction SilentlyContinue)
if (-not $git) { Stop-DsWith $EX_MANUAL "Git topilmadi. O'rnating: https://git-scm.com/download/win (yoki: winget install --id Git.Git -e)" }
$git = $git.Source
function G([string[]]$a, [switch]$Quiet) { return Invoke-DsNative $git (@("-C", $ctx.Base) + $a) -Quiet:$Quiet }

if ((G @("rev-parse", "--is-inside-work-tree") -Quiet).Out.Trim() -ne "true") { Stop-DsWith $EX_MANUAL "Bu papka Git repozitoriy emas: $($ctx.Base)" }
$branch = (G @("symbolic-ref", "--quiet", "--short", "HEAD") -Quiet).Out.Trim()
if (-not $branch) { Stop-DsWith $EX_MANUAL "HEAD biror branchda emas (detached). Avval branchga o'ting: git switch main" }
$remote = (G @("config", "--get", "branch.$branch.remote") -Quiet).Out.Trim()
if (-not $remote) { $remote = "origin" }
$rurl = (G @("remote", "get-url", $remote) -Quiet)
if ($rurl.Code -ne 0) { Stop-DsWith $EX_MANUAL "Remote '$remote' sozlanmagan. Masalan: git remote add origin https://github.com/ValijonIbroximov/DronStream.git" }
Write-DsLog ("Repozitoriy: {0} | branch: {1} | remote: {2} ({3})" -f $ctx.Base, $branch, $remote, (Protect-DsText $rurl.Out.Trim())) "STEP"

$dirty = (G @("status", "--porcelain") -Quiet).Out.Trim()
if ($dirty) {
  Write-DsLog "Lokal o'zgarishlar bor - ular o'chirilmaydi va yashirilmaydi:" "WARN"
  $dirty -split "`n" | Select-Object -First 30 | ForEach-Object { Write-DsLog ("  " + $_) "WARN" }
  Stop-DsWith $EX_MANUAL "Avval o'zgarishlarni saqlang: push.bat bilan commit/push qiling yoki keraksizlarini o'zingiz bekor qiling, so'ng pull.bat ni qayta ishga tushiring."
}
$before = (G @("rev-parse", "HEAD") -Quiet).Out.Trim()
Write-DsLog "fetch..." "STEP"
$f = G @("fetch", "--prune", $remote)
if ($f.Code -ne 0) { Stop-DsWith $EX_FAIL "fetch muvaffaqiyatsiz (internet yoki GitHub kirishini tekshiring). Lokal holat o'zgarmadi." }
$up = "$remote/$branch"
if ((G @("rev-parse", "--verify", "--quiet", $up) -Quiet).Code -ne 0) { Stop-DsWith $EX_MANUAL "Remote'da '$branch' branchi yo'q. Avval push.bat bilan yuboring." }
$counts = ((G @("rev-list", "--left-right", "--count", "HEAD...$up") -Quiet).Out.Trim() -split "\s+")
$ahead = [int]$counts[0]; $behind = [int]$counts[1]
if ($behind -eq 0) {
  if ($ahead -gt 0) { Write-DsLog "Remote'da yangi commit yo'q. Sizda yuborilmagan $ahead ta lokal commit bor - push.bat bilan yuboring." "OK" }
  else { Write-DsLog "Allaqachon eng yangi holatda ($($before.Substring(0,10)))." "OK" }
  exit $EX_OK
}
if ($ahead -gt 0) {
  Stop-DsWith $EX_MANUAL ("Tarixlar ajralgan: lokalda {0} ta, remote'da {1} ta alohida commit. Avtomatik reset/force/merge qilinmaydi. Qo'lda hal qiling: git log --oneline --graph HEAD {2} (yoki ishlab chiquvchiga murojaat qiling)." -f $ahead, $behind, $up)
}
$m = G @("merge", "--ff-only", $up)
if ($m.Code -ne 0) { Stop-DsWith $EX_FAIL "Fast-forward yangilash bajarilmadi. Lokal holat o'zgarmadi." }
$after = (G @("rev-parse", "HEAD") -Quiet).Out.Trim()
Write-DsLog ("Yangilandi: {0} -> {1}" -f $before.Substring(0, 10), $after.Substring(0, 10)) "OK"
(G @("log", "--oneline", "$before..$after") -Quiet).Out -split "`n" | Select-Object -First 20 | ForEach-Object { Write-DsLog ("  " + $_) }

$changed = (G @("diff", "--name-only", $before, $after) -Quiet).Out -split "`n"
$needBuild = @($changed | Where-Object { $_ -match '^(backend/|web/|config/|scripts/ds-prepare)' }).Count -gt 0
if (-not $needBuild) { Write-DsLog "Build talab qilinmaydi." "OK"; exit $EX_OK }
Write-DsLog "Kod o'zgargan: build/tayyorlash kerak." "WARN"
if ($NoPrepare) { Write-DsLog "DronStreamTayyorla.bat ni ishga tushiring." "WARN"; exit $EX_OK }
$chk = Invoke-DsCheck $ctx
if ($chk -and $chk.running) {
  Stop-DsWith $EX_RUNNING ("Server ishlayapti: u to'xtatilmaydi va dastur fayli ustidan yozilmaydi. Qulay paytda to'xtating ({0} stop --root `"{1}`"), so'ng DronStreamTayyorla.bat va DronStreamStart.bat." -f $ctx.Exe, $ctx.Root)
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "ds-prepare.ps1")
exit $LASTEXITCODE
