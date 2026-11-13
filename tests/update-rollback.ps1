<#
.SYNOPSIS  1.0.0 o'rnatib, update.ps1 bilan 1.0.1 ga yangilash, so'ng rollback.ps1 bilan qaytarishni avtomatik tekshiradi.
.EXAMPLE   powershell -ExecutionPolicy Bypass -File tests\update-rollback.ps1 -OldZip dist\DronStream-1.0.0-win64.zip -NewZip dist\DronStream-1.0.1-win64.zip
#>
param([Parameter(Mandatory = $true)][string]$OldZip, [Parameter(Mandatory = $true)][string]$NewZip, [string]$Work = (Join-Path $env:TEMP "ds-update-test"))
$ErrorActionPreference = "Stop"
$results = [ordered]@{}
function Check($name, $cond) { $results[$name] = if ($cond) { "PASS" } else { "FAIL" }; Write-Host ("{0,-45} {1}" -f $name, $results[$name]) }
function Ver($root) { $e = "$root\app\$((Get-Content "$root\app\active.txt" -Raw).Trim())\dronstream.exe"; $ErrorActionPreference = "Continue"; $v = (& $e version 2>&1 | Select-Object -First 1); $ErrorActionPreference = "Stop"; return "$v" }

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory $Work | Out-Null
Expand-Archive $OldZip -DestinationPath "$Work\old"
Expand-Archive $NewZip -DestinationPath "$Work\new"
$oldPkg = (Get-ChildItem "$Work\old" -Directory)[0].FullName
$newPkg = (Get-ChildItem "$Work\new" -Directory)[0].FullName
$R = "$Work\root"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$oldPkg\scripts\install.ps1" -Root $R | Out-Null
$cfg = (Get-Content "$R\config\dronstream.yaml" -Raw).Replace('listen: ":8443"', 'listen: "127.0.0.1:38443"').Replace('"127.0.0.1:9180"', '"127.0.0.1:39180"').Replace('"127.0.0.1:9997"', '"127.0.0.1:39997"').Replace('"127.0.0.1:8889"', '"127.0.0.1:38889"').Replace('webrtc_udp_listen: ":8189"', 'webrtc_udp_listen: "127.0.0.1:38189"').Replace('rtmp_listen: ":1935"', 'rtmp_listen: "127.0.0.1:31935"')
Set-Content "$R\config\dronstream.yaml" $cfg -Encoding utf8
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\start.ps1" -Root $R | Out-Null
Check "1.0.0 running" ((Ver $R) -like "1.0.0*")

$env:DRONSTREAM_BACKUP_PASSPHRASE = "Update-Test-Passphrase-1"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\update.ps1" -Root $R -Package $newPkg | Out-Null
Check "update.ps1 exit 0" ($LASTEXITCODE -eq 0)
Check "1.0.1 active and running" (((Ver $R) -like "1.0.1*") -and ((Get-Content "$R\app\active.txt" -Raw).Trim() -eq "1.0.1"))
Check "old version kept for rollback" (Test-Path "$R\app\1.0.0\dronstream.exe")
Check "pre-update backup created" (@(Get-ChildItem "$R\data\backups" -Filter "pre-update-1.0.0-to-1.0.1-*.dsbak").Count -eq 1)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\rollback.ps1" -Root $R -ToVersion 1.0.0 | Out-Null
Check "rollback.ps1 exit 0" ($LASTEXITCODE -eq 0)
Check "1.0.0 active again" ((Get-Content "$R\app\active.txt" -Raw).Trim() -eq "1.0.0")
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\status.ps1" -Root $R | Out-Null
Check "healthy after rollback" ($LASTEXITCODE -eq 0)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\stop.ps1" -Root $R | Out-Null
Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE
$results | ConvertTo-Json | Set-Content (Join-Path (Split-Path $PSScriptRoot -Parent) "build\test-results\update-rollback.json")
if ($results.Values -contains "FAIL") { exit 1 }
