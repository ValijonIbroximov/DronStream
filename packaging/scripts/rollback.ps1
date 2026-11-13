<#
.SYNOPSIS  Oldingi versiyaga qaytaradi.
.DESCRIPTION
  Yangi versiya bazani yangi sxemaga o'tkazgan bo'lsa (masalan 1.0.x -> 1.1.0: sxema v1 -> v2),
  eski dastur bu bazani OCHMAYDI ("schema is newer"). Shuning uchun eski binary yangi sxemaga
  bevosita ulanmaydi: yangilashdan oldingi mos backup tiklanadi.
  -Backup berilmasa, data\backups\pre-update-<ToVersion>-to-*.dsbak dan eng yangisi avtomatik tanlanadi
  (-SameSchema bilan bu qadam o'tkazib yuboriladi: faqat sxema o'zgarmagan versiyalar orasida).
  Backupdan keyingi o'zgarishlar (yangi foydalanuvchilar, havolalar, media) yo'qoladi.
.EXAMPLE   powershell -File scripts\rollback.ps1 -ToVersion 1.0.1
.EXAMPLE   powershell -File scripts\rollback.ps1 -ToVersion 1.0.1 -Backup C:\DronStream\data\backups\pre-update-1.0.1-to-1.1.0-....dsbak
#>
param([string]$Root, [Parameter(Mandatory = $true)][string]$ToVersion, [string]$Backup, [string]$Passphrase, [switch]$SameSchema)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root $ToVersion
$current = Get-DsActiveVersion $Root

if (-not $Backup -and -not $SameSchema) {
  $cand = Get-ChildItem (Join-Path $Root "data\backups") -Filter "pre-update-$ToVersion-to-*.dsbak" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($cand) {
    Write-Host "Yangilashdan oldingi backup topildi va tiklanadi: $($cand.Name)"
    $Backup = $cand.FullName
  }
}
& (Join-Path $PSScriptRoot "stop.ps1") -Root $Root 2>$null
Set-Content (Join-Path $Root "app\active.txt") $ToVersion -Encoding ascii
$svc = Get-DsService
if ($svc) { & sc.exe config DronStream binPath= "`"$exe`" run --root `"$Root`"" | Out-Null }
if ($Backup) {
  if (-not $Passphrase) { $Passphrase = Read-DsPassphrase "Backup paroli" }
  if ((Invoke-DsWithPassphrase $exe @("restore", "--root", $Root, "--in", $Backup, "--force") $Passphrase) -ne 0) {
    Set-Content (Join-Path $Root "app\active.txt") $current -Encoding ascii
    throw "Backup tiklanmadi - faol versiya $current ga qaytarildi"
  }
  # Same-machine rollback: the "old server" is this one, so re-activate immediately.
  Invoke-DsExe $exe @("activate", "--root", $Root) | Out-Null
}
& (Join-Path $PSScriptRoot "start.ps1") -Root $Root
if (Wait-DsHealthy $exe $Root 60) {
  Write-Host "Rollback tayyor: $ToVersion ishlayapti" -ForegroundColor Green
} else {
  Write-Warning "Rollbackdan keyin sog'lom emas. Agar logda 'schema ... is newer' bo'lsa, baza yangi sxemada: mos -Backup bilan qayta urining (yoki faol versiyani $current ga qaytaring)."
  exit 1
}
