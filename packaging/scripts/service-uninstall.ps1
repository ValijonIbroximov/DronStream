<# .SYNOPSIS DronStream Windows service ni olib tashlaydi (dastur va ma'lumotlar o'chirilmaydi). #>
. (Join-Path $PSScriptRoot "common.ps1")
if (-not (Test-DsAdmin)) { throw "Administrator sifatida ishga tushiring" }
$svc = Get-DsService
if (-not $svc) { Write-Host "Service o'rnatilmagan."; exit 0 }
if ($svc.Status -eq "Running") { Stop-Service DronStream }
& sc.exe delete DronStream | Out-Null
Write-Host "Service olib tashlandi. Dastur, sozlama va ma'lumotlar joyida qoldi."
