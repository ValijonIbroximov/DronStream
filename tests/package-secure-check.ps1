<#
.SYNOPSIS  Checks a built Windows package itself: contents, checksums, build manifest, and the secure-mode policy
           of the packaged binary with the packaged default configuration (clean folder, test ports).
.EXAMPLE   powershell -ExecutionPolicy Bypass -File tests\package-secure-check.ps1 -Zip dist\DronStream-1.3.0-win64.zip -ExpectCommit <sha>
#>
param([Parameter(Mandatory = $true)][string]$Zip, [string]$ExpectCommit = "", [string]$Work = (Join-Path $env:TEMP "ds-package-secure-test"))
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0
$results = [ordered]@{}
function Check($name, $cond) { $results[$name] = if ($cond) { "PASS" } else { "FAIL" }; Write-Host ("{0,-78} {1}" -f $name, $results[$name]) }

# Accept the self-signed certificate for this test process only.
Add-Type @"
using System.Net; using System.Security.Cryptography.X509Certificates;
public class DsTrustAllP : ICertificatePolicy { public bool CheckValidationResult(ServicePoint a, X509Certificate b, WebRequest c, int d) { return true; } }
"@
[Net.ServicePointManager]::CertificatePolicy = New-Object DsTrustAllP
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Totp([string]$b32) {
  $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  $bits = ""
  foreach ($ch in $b32.TrimEnd("=").ToUpper().ToCharArray()) { $bits += [Convert]::ToString($alphabet.IndexOf($ch), 2).PadLeft(5, "0") }
  $key = New-Object byte[] ([Math]::Floor($bits.Length / 8))
  for ($i = 0; $i -lt $key.Length; $i++) { $key[$i] = [Convert]::ToByte($bits.Substring($i * 8, 8), 2) }
  $step = [long][Math]::Floor(([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) / 30)
  $ctr = [BitConverter]::GetBytes($step); [Array]::Reverse($ctr)
  $mac = (New-Object System.Security.Cryptography.HMACSHA1 (, $key)).ComputeHash($ctr)
  $o = $mac[$mac.Length - 1] -band 15
  $n = (([int]($mac[$o] -band 0x7f)) -shl 24) -bor (([int]$mac[$o + 1]) -shl 16) -bor (([int]$mac[$o + 2]) -shl 8) -bor ([int]$mac[$o + 3])
  return ($n % 1000000).ToString("000000")
}
function ApiCode([scriptblock]$call) {
  try { & $call | Out-Null; return "ok" } catch {
    $resp = $_.Exception.Response
    if ($null -eq $resp) { return "noresponse" }
    $rd = New-Object IO.StreamReader($resp.GetResponseStream()); $body = $rd.ReadToEnd()
    try { return ($body | ConvertFrom-Json).code } catch { return "http" + [int]$resp.StatusCode }
  }
}

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory $Work | Out-Null
Expand-Archive $Zip -DestinationPath "$Work\pkg"
$pkg = (Get-ChildItem "$Work\pkg" -Directory | Select-Object -First 1).FullName

# ---- contents ----
$files = @(Get-ChildItem $pkg -Recurse -File)
$rel = @($files | ForEach-Object { $_.FullName.Substring($pkg.Length + 1) })
$sumsOk = $true
foreach ($line in (Get-Content "$pkg\SHA256SUMS.txt")) {
  if ($line.Trim() -eq "") { continue }
  $want = $line.Substring(0, 64); $name = $line.Substring(66)
  $p = Join-Path $pkg $name
  if (-not (Test-Path $p) -or ((Get-FileHash $p -Algorithm SHA256).Hash.ToLower() -ne $want)) { $sumsOk = $false }
}
Check "contents: every file matches SHA256SUMS.txt and every listed file exists" ($sumsOk -and (@(Get-Content "$pkg\SHA256SUMS.txt" | Where-Object { $_.Trim() -ne "" }).Count -eq ($files.Count - 1)))
$bi = Get-Content "$pkg\BUILD_INFO.txt" -Raw
$ver = (Get-Content "$pkg\VERSION" -Raw).Trim()
Check "BUILD_INFO: source commit recorded, tree clean, test release stated" (($bi -match "source_commit: [0-9a-f]{40}") -and ($bi -match "source_tree_dirty: no") -and ($bi -match "sinov relizi") -and ($bi -match "E2EE") -and ($bi -match "tasdiqlanmagan"))
if ($ExpectCommit -ne "") { Check "BUILD_INFO: source commit is the expected one" ($bi -match ("source_commit: " + [regex]::Escape($ExpectCommit))) }
$info = Get-Content "$pkg\info.html" -Raw
Check "info.html: this version, bundled three.js, no external resource" (($info -match ("v" + [regex]::Escape($ver))) -and ($info -match "three\.js") -and ($info -notmatch "<script[^>]+src=") -and ($info -notmatch "https?://[^\s""']+\.(js|css|woff2?)"))
Check "docs: security model, acceptance, install and DJI guides present" ((Test-Path "$pkg\docs\SECURITY_MODEL.md") -and (Test-Path "$pkg\docs\SECURITY_ACCEPTANCE.md") -and (Test-Path "$pkg\docs\SERVER_INSTALL_UZ.md") -and (Test-Path "$pkg\docs\DJI_SETUP_UZ.md") -and (Test-Path "$pkg\docs\TEST_REPORT.md"))
$cfgTpl = Get-Content "$pkg\config\dronstream.example.yaml" -Raw
Check "config template: secure mode, plain RTMP off, RTMPS off" (($cfgTpl -match 'mode: "secure"') -and ($cfgTpl -match 'rtmp_listen: ""') -and ($cfgTpl -match 'rtmps_listen: ""'))
$bad = @($rel | Where-Object { $_ -match '(?i)(\.db$|\.db-wal$|\.db-shm$|\.dsbak$|\.log$|master\.key|tls\.key|\.pem$|\.env$|TEST_CREDENTIALS|setup-token|ctl\.token|node_modules|^poc\\|\\poc\\|^data\\|^logs\\|^runtime\\|\.mp4$|\.mkv$)' })
Check "contents: no database, backup, log, key, credential, media or PoC file" ($bad.Count -eq 0)
if ($bad.Count -gt 0) { $bad | ForEach-Object { Write-Host "   unexpected: $_" } }
Check "contents: start/stop/backup/restore/update/rollback scripts present" ((Test-Path "$pkg\scripts\install.ps1") -and (Test-Path "$pkg\scripts\start.ps1") -and (Test-Path "$pkg\scripts\stop.ps1") -and (Test-Path "$pkg\scripts\backup.ps1") -and (Test-Path "$pkg\scripts\restore.ps1") -and (Test-Path "$pkg\scripts\update.ps1") -and (Test-Path "$pkg\scripts\rollback.ps1") -and (Test-Path "$pkg\DronStreamStart.bat"))

# ---- install into a clean folder; packaged default configuration (secure), only the ports are changed ----
$A = "$Work\server"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$pkg\scripts\install.ps1" -Root $A | Out-Null
$cfg = Get-Content "$A\config\dronstream.yaml" -Raw
$cfg = $cfg.Replace('listen: ":8443"', 'listen: "127.0.0.1:27443"').Replace('"127.0.0.1:9180"', '"127.0.0.1:27180"').Replace('"127.0.0.1:9997"', '"127.0.0.1:27997"').Replace('"127.0.0.1:8889"', '"127.0.0.1:27889"').Replace('webrtc_udp_listen: ":8189"', 'webrtc_udp_listen: "127.0.0.1:27189"')
Check "installed config: still secure mode with plain RTMP off" (($cfg -match 'mode: "secure"') -and ($cfg -match 'rtmp_listen: ""'))
$secureCfg = $cfg
Set-Content "$A\config\dronstream.yaml" $cfg -Encoding utf8
$exe = "$A\app\$((Get-Content "$A\app\active.txt" -Raw).Trim())\dronstream.exe"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\start.ps1" -Root $A | Out-Null
Check "start.ps1 (secure, packaged defaults): healthy" ($LASTEXITCODE -eq 0)

$base = "https://127.0.0.1:27443"
$ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h = @{ "X-DS-Request" = "1" }
$tok = (Get-Content "$A\data\runtime\setup-token.txt" -Raw).Trim()
$pw = "Pkg-" + [Guid]::NewGuid().ToString("N").Substring(0, 14) + "-9a"
$r = Invoke-RestMethod -Method Post -Uri "$base/api/setup" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ setupToken = $tok; username = "boss"; displayName = "Boss"; password = $pw } | ConvertTo-Json)
$h["X-CSRF-Token"] = $r.csrf
Check "secure: first administrator must enrol TOTP (mfaSetupRequired)" ($r.authenticated -and $r.mfaSetupRequired -and ($r.securityMode -eq "secure"))
Check "secure: admin API locked without TOTP (mfa_setup_required)" ((ApiCode { Invoke-RestMethod -Uri "$base/api/admin/users" -WebSession $ws -Headers $h }) -eq "mfa_setup_required")
$ts = Invoke-RestMethod -Method Post -Uri "$base/api/me/totp/setup" -WebSession $ws -Headers $h -ContentType "application/json" -Body "{}"
$en = Invoke-RestMethod -Method Post -Uri "$base/api/me/totp/enable" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ code = (Totp $ts.secret) } | ConvertTo-Json)
Check "secure: TOTP enabled, 10 one-time recovery codes" (@($en.recoveryCodes).Count -eq 10)
$ws2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h2 = @{ "X-DS-Request" = "1" }
Check "secure: password alone is refused (mfa_required)" ((ApiCode { Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $ws2 -Headers $h2 -ContentType "application/json" -Body (@{ username = "boss"; password = $pw } | ConvertTo-Json) }) -eq "mfa_required")
Start-Sleep -Seconds 31   # the enabling code's 30 s step is spent
$l = Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $ws2 -Headers $h2 -ContentType "application/json" -Body (@{ username = "boss"; password = $pw; otp = (Totp $ts.secret) } | ConvertTo-Json)
$h2["X-CSRF-Token"] = $l.csrf
Check "secure: login with password + TOTP" ($l.authenticated -and -not $l.mfaSetupRequired)
$ss = Invoke-RestMethod -Uri "$base/api/admin/security-status" -WebSession $ws2 -Headers $h2
$st = @{}; foreach ($i in $ss.items) { $st[$i.id] = $i.status }
Check "status: mode ok, plain RTMP off, links and admin MFA ok" (($ss.mode -eq "secure") -and ($st["mode"] -eq "ok") -and ($st["ingest_plain"] -eq "ok") -and ($st["links"] -eq "ok") -and ($st["admin_mfa"] -eq "ok"))
Check "status: honest about what is NOT there (server sees video, no E2EE, RTMPS off)" (($st["server_sees_video"] -eq "not_implemented") -and ($st["e2ee"] -eq "not_implemented") -and ($st["ingest_rtmps"] -eq "not_implemented") -and (@($ss.summary).Count -eq 4))
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\stop.ps1" -Root $A | Out-Null

# ---- secure mode refuses unencrypted RTMP on any network address (packaged binary) ----
foreach ($case in @(@(":1935", "barcha interfeyslarda"), @("192.168.1.10:1935", "xususiy IP shifrlash emas"), @("10.8.0.1:1935", "xususiy IP shifrlash emas"), @("localhost:1935", "host nomi qabul qilinmaydi"))) {
  Set-Content "$A\config\dronstream.yaml" ($secureCfg.Replace('rtmp_listen: ""', ('rtmp_listen: "' + $case[0] + '"'))) -Encoding utf8
  $ErrorActionPreference = "Continue"
  $out = (& $exe run --root $A 2>&1 | Out-String)
  $rc = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  Check ("secure: rtmp_listen `"" + $case[0] + "`" -> does not start, reason given") (($rc -ne 0) -and ($out -match "security.mode=secure") -and ($out -match [regex]::Escape($case[1])))
}
# the only exception: loopback
Set-Content "$A\config\dronstream.yaml" ($secureCfg.Replace('rtmp_listen: ""', 'rtmp_listen: "127.0.0.1:27935"')) -Encoding utf8
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\start.ps1" -Root $A | Out-Null
Check "secure: rtmp_listen 127.0.0.1:27935 -> starts" ($LASTEXITCODE -eq 0)
$lis = @(Get-NetTCPConnection -State Listen -LocalPort 27935 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalAddress)
Check "secure: plain RTMP listens on 127.0.0.1 only" (($lis.Count -ge 1) -and (@($lis | Where-Object { $_ -ne "127.0.0.1" }).Count -eq 0))
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\stop.ps1" -Root $A | Out-Null
Start-Sleep -Seconds 2
Check "stop.ps1: no process left from the test folder" (@(Get-Process dronstream, mediamtx -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Work*" }).Count -eq 0)

$fail = @($results.Values | Where-Object { $_ -ne "PASS" }).Count
Write-Host ("`n{0} tekshiruv, {1} o'tmadi" -f $results.Count, $fail)
if ($fail -gt 0) { exit 1 }
