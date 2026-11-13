<#
.SYNOPSIS  Shifrlangan backupni tiklaydi. Server to'xtatilgan bo'lishi kerak.
           Tiklangan server KUTISH (standby) rejimida ishga tushadi; eski server o'chirilganini tekshirgach admin panelda faollashtiring.
.EXAMPLE   powershell -File scripts\restore.ps1 -In D:\usb\dronstream.dsbak
#>
param([string]$Root, [Parameter(Mandatory = $true)][string]$In, [switch]$Force)
. (Join-Path $PSScriptRoot "common.ps1")
$Root = Resolve-DsRoot $Root
$exe = Get-DsExe $Root
if (Test-DsRunning $exe $Root) {
  Write-Host "Server ishlayapti - to'xtatilmoqda..."
  & (Join-Path $PSScriptRoot "stop.ps1") -Root $Root
}
$pass = Read-DsPassphrase "Backup paroli"
$a = @("restore", "--root", $Root, "--in", $In)
if ($Force) { $a += "--force" }
exit (Invoke-DsWithPassphrase $exe $a $pass)
