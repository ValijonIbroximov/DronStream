<#
.SYNOPSIS  Eski paketni o'rnatib, update.ps1 bilan yangisiga yangilash, so'ng rollback.ps1 bilan qaytarishni avtomatik tekshiradi.
           Sxema o'zgargan bo'lsa (1.0.x -> 1.1.0) rollback yangilashdan oldingi backupni tiklashi va eski versiyada ma'lumot saqlanishi tekshiriladi.
.EXAMPLE   powershell -ExecutionPolicy Bypass -File tests\update-rollback.ps1 -OldZip dist\DronStream-1.0.1-win64.zip -NewZip dist\DronStream-1.1.0-win64.zip
#>
param([Parameter(Mandatory = $true)][string]$OldZip, [Parameter(Mandatory = $true)][string]$NewZip, [string]$Work = (Join-Path $env:TEMP "ds-update-test"))
$ErrorActionPreference = "Stop"
$results = [ordered]@{}
function Check($name, $cond) { $results[$name] = if ($cond) { "PASS" } else { "FAIL" }; Write-Host ("{0,-50} {1}" -f $name, $results[$name]) }
function Ver($root) { $e = "$root\app\$((Get-Content "$root\app\active.txt" -Raw).Trim())\dronstream.exe"; $ErrorActionPreference = "Continue"; $v = (& $e version 2>&1 | Select-Object -First 1); $ErrorActionPreference = "Stop"; return "$v" }

Add-Type @"
using System.Net; using System.Security.Cryptography.X509Certificates;
public class DsTrustAll2 : ICertificatePolicy { public bool CheckValidationResult(ServicePoint a, X509Certificate b, WebRequest c, int d) { return true; } }
"@
[Net.ServicePointManager]::CertificatePolicy = New-Object DsTrustAll2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory $Work | Out-Null
Expand-Archive $OldZip -DestinationPath "$Work\old"
Expand-Archive $NewZip -DestinationPath "$Work\new"
$oldPkg = (Get-ChildItem "$Work\old" -Directory)[0].FullName
$newPkg = (Get-ChildItem "$Work\new" -Directory)[0].FullName
$oldV = (Get-Content "$oldPkg\VERSION" -Raw).Trim()
$newV = (Get-Content "$newPkg\VERSION" -Raw).Trim()
$R = "$Work\root"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$oldPkg\scripts\install.ps1" -Root $R | Out-Null
$cfg = (Get-Content "$R\config\dronstream.yaml" -Raw).Replace('listen: ":8443"', 'listen: "127.0.0.1:38443"').Replace('"127.0.0.1:9180"', '"127.0.0.1:39180"').Replace('"127.0.0.1:9997"', '"127.0.0.1:39997"').Replace('"127.0.0.1:8889"', '"127.0.0.1:38889"').Replace('webrtc_udp_listen: ":8189"', 'webrtc_udp_listen: "127.0.0.1:38189"').Replace('rtmp_listen: ":1935"', 'rtmp_listen: "127.0.0.1:31935"')
Set-Content "$R\config\dronstream.yaml" $cfg -Encoding utf8
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\start.ps1" -Root $R | Out-Null
Check "$oldV running" ((Ver $R) -like "$oldV*")

# data created on the old version
$base = "https://127.0.0.1:38443"
$ws = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h = @{ "X-DS-Request" = "1" }
$tok = (Get-Content "$R\data\runtime\setup-token.txt" -Raw).Trim()
$setupResp = Invoke-RestMethod -Method Post -Uri "$base/api/setup" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ setupToken = $tok; username = "boss"; password = "Update-Test-Pass-1" } | ConvertTo-Json)
$h["X-CSRF-Token"] = $setupResp.csrf
Invoke-RestMethod -Method Post -Uri "$base/api/admin/users" -WebSession $ws -Headers $h -ContentType "application/json" -Body (@{ username = "olduser"; password = "Old-User-Pass-12"; role = "user" } | ConvertTo-Json) | Out-Null

$env:DRONSTREAM_BACKUP_PASSPHRASE = "Update-Test-Passphrase-1"
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\update.ps1" -Root $R -Package $newPkg | Out-Null
Check "update.ps1 exit 0" ($LASTEXITCODE -eq 0)
Check "$newV active and running" (((Ver $R) -like "$newV*") -and ((Get-Content "$R\app\active.txt" -Raw).Trim() -eq $newV))
Check "old version kept for rollback" (Test-Path "$R\app\$oldV\dronstream.exe")
Check "pre-update backup created" (@(Get-ChildItem "$R\data\backups" -Filter "pre-update-$oldV-to-$newV-*.dsbak").Count -eq 1)
$ws2 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$u = Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $ws2 -Headers @{ "X-DS-Request" = "1" } -ContentType "application/json" -Body (@{ username = "olduser"; password = "Old-User-Pass-12" } | ConvertTo-Json)
Check "old data available on $newV" ([bool]$u.authenticated)

& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\rollback.ps1" -Root $R -ToVersion $oldV | Out-Null
Check "rollback.ps1 exit 0" ($LASTEXITCODE -eq 0)
Check "$oldV active again" ((Get-Content "$R\app\active.txt" -Raw).Trim() -eq $oldV)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\status.ps1" -Root $R | Out-Null
Check "healthy after rollback" ($LASTEXITCODE -eq 0)
$ws3 = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$u3 = Invoke-RestMethod -Method Post -Uri "$base/api/login" -WebSession $ws3 -Headers @{ "X-DS-Request" = "1" } -ContentType "application/json" -Body (@{ username = "olduser"; password = "Old-User-Pass-12" } | ConvertTo-Json)
Check "data intact after rollback" ([bool]$u3.authenticated)
& powershell -NoProfile -ExecutionPolicy Bypass -File "$R\scripts\stop.ps1" -Root $R | Out-Null
Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE
$results | ConvertTo-Json | Set-Content (Join-Path (Split-Path $PSScriptRoot -Parent) ("build\test-results\update-rollback-" + $oldV + "-to-" + $newV + ".json"))
if ($results.Values -contains "FAIL") { exit 1 }
