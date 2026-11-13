<# .SYNOPSIS DronStream ni Windows service sifatida o'rnatadi (administrator huquqi kerak): avtomatik start, qulaganda qayta ishga tushirish. #>
param([string]$Root)
. (Join-Path $PSScriptRoot "common.ps1")
if (-not (Test-DsAdmin)) { throw "Administrator sifatida ishga tushiring" }
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root
if (Get-DsService) { throw "DronStream service allaqachon mavjud (avval service-uninstall.ps1)" }
if (Test-DsRunning $exe $Root) { Invoke-DsExe $exe @("stop", "--root", $Root) | Out-Null }
$bin = "`"$exe`" run --root `"$Root`""
New-Service -Name "DronStream" -BinaryPathName $bin -DisplayName "DronStream server" -Description "DronStream: DJI jonli video, faqat ruxsat bilan ko'rish (MediaMTX)" -StartupType Automatic | Out-Null
& sc.exe failure DronStream reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null
Start-Service DronStream
if (Wait-DsHealthy $exe $Root 30) { Write-Host "Service o'rnatildi va ishlayapti." -ForegroundColor Green }
else { Write-Warning "Service ishga tushdi, lekin sog'lom emas - $Root\logs ni tekshiring" }
Write-Host "Eslatma: service LocalSystem hisobida ishlaydi. Master kalit DPAPI (LocalMachine) bilan himoyalangan, shuning uchun konsol va service rejimi bir xil kalitni o'qiy oladi."
