<#
.SYNOPSIS  CI (Windows runner): haqiqiy Windows'da server ishga tushiradi, sinov ma'lumotlari yaratadi va shifrlangan backup oladi.
.DESCRIPTION
  Backup keyin Linux ishiga (job) uzatiladi va u yerda tiklanadi: Windows -> Linux ko'chirish sinovi.
  Master kalit Windows'da DPAPI bilan o'ralgan; backup ichida u parol bilan shifrlangan holda bo'ladi.
  Faqat bir martalik sinov ma'lumotlari ishlatiladi (haqiqiy sir yo'q). PowerShell 7 (pwsh) kerak.
.EXAMPLE   pwsh -File tests\ci\make-windows-backup.ps1 -Exe ci\dronstream.exe -Out ci\out
#>
param([Parameter(Mandatory = $true)][string]$Exe, [Parameter(Mandatory = $true)][string]$Out)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0
$Exe = (Resolve-Path $Exe).Path
$root = Join-Path $env:RUNNER_TEMP "ds-win-root"
if (Test-Path $root) { Remove-Item $root -Recurse -Force }
New-Item -ItemType Directory -Force $root, $Out | Out-Null
$Out = (Resolve-Path $Out).Path
$base = "https://127.0.0.1:8443"
$adminPass = "Ci-Admin-Password-1"
$bkPass = "Ci-Backup-Passphrase-123"

$proc = Start-Process -FilePath $Exe -ArgumentList @("run", "--root", $root) -PassThru -WindowStyle Hidden
try {
  $ok = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try { Invoke-RestMethod -Uri "$base/api/health" -SkipCertificateCheck | Out-Null; $ok = $true; break } catch { }
  }
  if (-not $ok) { throw "Windows server did not become healthy" }
  $h = @{ "X-DS-Request" = "1" }
  $ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $tok = (Get-Content (Join-Path $root "data\runtime\setup-token.txt") -Raw).Trim()
  $r = Invoke-RestMethod -Method Post -Uri "$base/api/setup" -WebSession $ws -Headers $h -ContentType "application/json" -SkipCertificateCheck -Body (@{ setupToken = $tok; username = "boss"; password = $adminPass } | ConvertTo-Json)
  $h["X-CSRF-Token"] = $r.csrf
  function Api([string]$method, [string]$path, $body) {
    if ($null -eq $body) { return Invoke-RestMethod -Method $method -Uri "$base$path" -WebSession $ws -Headers $h -SkipCertificateCheck }
    return Invoke-RestMethod -Method $method -Uri "$base$path" -WebSession $ws -Headers $h -ContentType "application/json" -SkipCertificateCheck -Body ($body | ConvertTo-Json)
  }
  Api "Post" "/api/admin/users" @{ username = "viewer1"; password = "Viewer-Pass-12345"; role = "user" } | Out-Null
  $st = Api "Post" "/api/admin/streams" @{ name = "Pult X"; slug = "pultx" }
  $uid = @(Api "Get" "/api/admin/users" $null | Where-Object { $_.username -eq "viewer1" })[0].id
  Api "Post" "/api/admin/permissions" @{ subjectType = "user"; subjectId = $uid; streamIds = @($st.stream.id) } | Out-Null
  $txt = Api "Post" "/api/admin/contents/text" @{ title = "Brifing"; body = "Windows'dan ko'chirilgan matn" }
  # a small valid PNG (1x1) as uploaded media
  $png = Join-Path $Out "pixel.png"
  [IO.File]::WriteAllBytes($png, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="))
  $img = Invoke-RestMethod -Method Post -Uri "$base/api/admin/contents/upload" -WebSession $ws -Headers $h -SkipCertificateCheck -Form @{ kind = "image"; title = "Xarita"; file = (Get-Item $png) }
  $mk = [IO.File]::ReadAllBytes((Join-Path $root "config\secrets\master.key"))
  $mkFormat = [Text.Encoding]::ASCII.GetString($mk, 0, 4)
  if ($mkFormat -ne "DSK1") { throw "expected a DPAPI-wrapped master key (DSK1) on Windows, got $mkFormat" }

  $env:DRONSTREAM_BACKUP_PASSPHRASE = $bkPass
  $bk = Join-Path $Out "win.dsbak"
  & $Exe backup --root $root --out $bk
  if ($LASTEXITCODE -ne 0) { throw "backup failed" }
  Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE
  $expect = [ordered]@{
    os = "windows"; masterKeyFormat = $mkFormat; adminPassword = $adminPass; backupPassphrase = $bkPass
    streamId = $st.stream.id; streamKey = $st.key; imageId = $img.id; imageSha256 = (Get-FileHash $png -Algorithm SHA256).Hash.ToLower()
    textId = $txt.id; version = ((& $Exe version) -split " ")[0]
  }
  $expect | ConvertTo-Json | Set-Content (Join-Path $Out "expect.json") -Encoding utf8
  Remove-Item $png
  Write-Host "Windows backup: $bk ($((Get-Item $bk).Length) bayt), master kalit formati: $mkFormat"
} catch {
  # GitHub annotation: the public run page shows the reason without needing the full log.
  Write-Host ("::error title=make-windows-backup::{0} (qator {1})" -f $_.Exception.Message, $_.InvocationInfo.ScriptLineNumber)
  $sl = Join-Path $root "logsdronstream.log"
  if (Test-Path $sl) { Get-Content $sl -Tail 8 | ForEach-Object { Write-Host ("::warning title=dronstream.log::" + $_) } }
  else { Write-Host "::warning title=dronstream.log::server logi yaratilmagan (jarayon ishga tushmagan bo'lishi mumkin)" }
  throw
} finally {
  & $Exe stop --root $root 2>$null | Out-Null
  if (-not $proc.WaitForExit(15000)) { $proc.Kill() }
}
