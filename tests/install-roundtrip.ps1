<#
.SYNOPSIS  Paketni toza papkaga o'rnatish, ishga tushirish, ma'lumot yaratish, backup, boshqa "toza" ROOT ga
           tiklash, standby tekshiruvi, faollashtirish va ma'lumotlar saqlanganini tekshiradigan avtomatik test.
           (Bir kompyuter ichida ikki xil ROOT. Haqiqiy boshqa kompyuter alohida qo'lda tekshiriladi.)
.EXAMPLE   powershell -ExecutionPolicy Bypass -File tests\install-roundtrip.ps1 -Zip dist\DronStream-1.0.0-win64.zip
#>
param([Parameter(Mandatory = $true)][string]$Zip, [string]$Work = (Join-Path $env:TEMP "ds-install-test"))
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0
$results = [ordered]@{}
function Check($name, $cond) { $results[$name] = if ($cond) { "PASS" } else { "FAIL" }; Write-Host ("{0,-50} {1}" -f $name, $results[$name]) }

# Accept the self-signed certificate for this test process only.
Add-Type @"
using System.Net; using System.Security.Cryptography.X509Certificates;
public class DsTrustAll : ICertificatePolicy { public bool CheckValidationResult(ServicePoint a, X509Certificate b, WebRequest c, int d) { return true; } }
"@
[Net.ServicePointManager]::CertificatePolicy = New-Object DsTrustAll
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory $Work | Out-Null
Expand-Archive $Zip -DestinationPath "$Work\pkg"
$pkg = (Get-ChildItem "$Work\pkg" -Directory | Select-Object -First 1).FullName
$A = "$Work\serverA"; $B = "$Work\serverB"

& powershell -NoProfile -ExecutionPolicy Bypass -File "$pkg\scripts\install.ps1" -Root $A | Out-Null
Check "install: layout created" ((Test-Path "$A\app\active.txt") -and (Test-Path "$A\config\dronstream.yaml") -and (Test-Path "$A\data") -and (Test-Path "$A\logs"))
# use non-default ports so a developer instance does not collide
$cfg = Get-Content "$A\config\dronstream.yaml" -Raw
$cfg = $cfg.Replace('listen: ":8443"', 'listen: "127.0.0.1:28443"').Replace('"127.0.0.1:9180"', '"127.0.0.1:29180"').Replace('"127.0.0.1:9997"', '"127.0.0.1:29997"').Replace('"127.0.0.1:8889"', '"127.0.0.1:28889"').Replace('webrtc_udp_listen: ":8189"', 'webrtc_udp_listen: "127.0.0.1:28189"').Replace('rtmp_listen: ":1935"', 'rtmp_listen: "127.0.0.1:21935"')
Set-Content "$A\config\dronstream.yaml" $cfg -Encoding utf8
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\start.ps1" -Root $A | Out-Null
Check "start.ps1: healthy" ($LASTEXITCODE -eq 0)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\status.ps1" -Root $A | Out-Null
Check "status.ps1: exit 0" ($LASTEXITCODE -eq 0)

$base = "https://127.0.0.1:28443"
$ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h = @{ "X-DS-Request" = "1" }
$tok = (Get-Content "$A\data\runtime\setup-token.txt" -Raw).Trim()
$r = Invoke-RestMethod -Method Post -Uri "$base/api/setup" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ setupToken = $tok; username = "boss"; displayName = "Boss"; password = "Install-Test-Pass-1" } | ConvertTo-Json)
$h["X-CSRF-Token"] = $r.csrf
Check "setup: admin created" ($r.authenticated)
Invoke-RestMethod -Method Post -Uri "$base/api/admin/users" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ username = "viewer1"; displayName = "Viewer 1"; password = "Viewer-Pass-12345"; role = "user" } | ConvertTo-Json) | Out-Null
$st = Invoke-RestMethod -Method Post -Uri "$base/api/admin/streams" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ name = "Pult X"; slug = "pultx" } | ConvertTo-Json)
$key = $st.key
$uid = ((Invoke-RestMethod -Uri "$base/api/admin/users" -WebSession $ws -Headers $h) | Where-Object { $_.username -eq "viewer1" }).id
Invoke-RestMethod -Method Post -Uri "$base/api/admin/permissions" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ subjectType = "user"; subjectId = $uid; streamIds = @($st.stream.id) } | ConvertTo-Json) | Out-Null

# backup while running (consistent snapshot), migrate-out
$env:DRONSTREAM_BACKUP_PASSPHRASE = "Install-Backup-Passphrase-1"
$exeA = "$A\app\$((Get-Content "$A\app\active.txt" -Raw).Trim())\dronstream.exe"
& $exeA backup --root $A --out "$Work\move.dsbak" --migrate-out | Out-Null
Check "backup: created while running" ((Test-Path "$Work\move.dsbak") -and $LASTEXITCODE -eq 0)
Start-Sleep -Seconds 2
$sys = Invoke-RestMethod -Uri "$base/api/admin/system" -WebSession $ws -Headers $h
Check "migrate-out: old server stops serving" ($sys.state.instanceState -eq "migrated")
$raw = [IO.File]::ReadAllBytes("$Work\move.dsbak")
$txt = [Text.Encoding]::ASCII.GetString($raw)
Check "backup: encrypted (no plaintext key/db)" ((-not $txt.Contains($key)) -and (-not $txt.Contains("SQLite format")))
& powershell -NoProfile -ExecutionPolicy Bypass -File "$A\scripts\stop.ps1" -Root $A | Out-Null

# wrong passphrase
& powershell -NoProfile -ExecutionPolicy Bypass -File "$pkg\scripts\install.ps1" -Root $B | Out-Null
Set-Content "$B\config\dronstream.yaml" $cfg -Encoding utf8
$exeB = "$B\app\$((Get-Content "$B\app\active.txt" -Raw).Trim())\dronstream.exe"
$env:DRONSTREAM_BACKUP_PASSPHRASE = "wrong-passphrase-xyz"
$ErrorActionPreference = "Continue"
& $exeB restore --root $B --in "$Work\move.dsbak" 2>&1 | Out-Null
$rc = $LASTEXITCODE
$ErrorActionPreference = "Stop"
Check "restore: wrong passphrase rejected" ($rc -ne 0)
$env:DRONSTREAM_BACKUP_PASSPHRASE = "Install-Backup-Passphrase-1"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$B\scripts\restore.ps1" -Root $B -In "$Work\move.dsbak" | Out-Null
Check "restore: into clean root" ($LASTEXITCODE -eq 0)
Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE
& powershell -NoProfile -ExecutionPolicy Bypass -File "$B\scripts\start.ps1" -Root $B | Out-Null
$ws2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h2 = @{ "X-DS-Request" = "1" }
$r2 = Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $ws2 -Headers $h2 -ContentType "application/json" -Body (@{ username = "boss"; password = "Install-Test-Pass-1" } | ConvertTo-Json)
$h2["X-CSRF-Token"] = $r2.csrf
Check "restore: admin login works (users restored)" ($r2.authenticated)
$sys2 = Invoke-RestMethod -Uri "$base/api/admin/system" -WebSession $ws2 -Headers $h2
Check "restore: starts in STANDBY" ($sys2.state.instanceState -eq "standby")
$streams = Invoke-RestMethod -Uri "$base/api/admin/streams" -WebSession $ws2 -Headers $h2
$perms = Invoke-RestMethod -Uri "$base/api/admin/permissions" -WebSession $ws2 -Headers $h2
Check "restore: streams restored" (@($streams | Where-Object { $_.slug -eq "pultx" }).Count -eq 1)
# 1.0.x answers with "streamName", 1.1+ with "objectTitle": read whichever exists (strict mode forbids a missing property)
function PermTitle($p) { foreach ($n in "objectTitle", "streamName") { $x = $p.PSObject.Properties[$n]; if ($x) { return $x.Value } }; return $null }
Check "restore: permissions restored" (@($perms | Where-Object { (PermTitle $_) -eq "Pult X" }).Count -eq 1)
$k2 = Invoke-RestMethod -Uri "$base/api/admin/streams/$($st.stream.id)/key" -WebSession $ws2 -Headers $h2
Check "restore: publish key re-bound (DPAPI) and readable" ($k2.key -eq $key)
$vw = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$rv = Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $vw -Headers @{ "X-DS-Request" = "1" } -ContentType "application/json" -Body (@{ username = "viewer1"; password = "Viewer-Pass-12345" } | ConvertTo-Json)
# The watch status says whether this viewer is authorised, independently of the source being on air.
# (The test stream has no publisher, and since 1.2 no ticket is issued for a source that is off air.)
$vh = @{ "X-DS-Request" = "1"; "X-CSRF-Token" = $rv.csrf }
$statusUrl = "$base/api/watch/$($st.stream.id)/status"
$sb = Invoke-RestMethod -Uri $statusUrl -WebSession $vw -Headers $vh
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/watch/$($st.stream.id)/ticket" -WebSession $vw -Headers $vh -ContentType "application/json" -Body "{}" | Out-Null
  Check "standby: viewing refused" $false
} catch { Check "standby: viewing refused" (($_.Exception.Response.StatusCode.value__ -eq 403) -and (-not $sb.ok) -and ($sb.code -eq "instance_standby")) }
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/admin/system/instance" -WebSession $ws2 -Headers $h2 -ContentType "application/json" -Body (@{ state = "active"; confirm = "wrong" } | ConvertTo-Json) | Out-Null
  Check "activate: requires exact confirmation" $false
} catch { Check "activate: requires exact confirmation" $true }
Invoke-RestMethod -Method Post -Uri "$base/api/admin/system/instance" -WebSession $ws2 -Headers $h2 -ContentType "application/json" -Body (@{ state = "active"; confirm = "ESKI SERVER O'CHIRILDI" } | ConvertTo-Json) | Out-Null
$sa = Invoke-RestMethod -Uri $statusUrl -WebSession $vw -Headers $vh
Check "activate: viewing allowed again" ([bool]$sa.ok)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$B\scripts\stop.ps1" -Root $B | Out-Null
Check "stop.ps1: stopped" ($LASTEXITCODE -eq 0)
Start-Sleep -Seconds 1
Check "no mediamtx left running" (-not (Get-Process mediamtx -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Work*" }))

$results | ConvertTo-Json | Set-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "build\test-results\install-roundtrip.json")
if ($results.Values -contains "FAIL") { exit 1 }

