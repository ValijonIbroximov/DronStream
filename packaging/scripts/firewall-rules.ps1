<#
.SYNOPSIS  Windows Firewall qoidalarini ko'rsatadi yoki (-Apply bilan) qo'shadi. Administrator huquqi kerak.
.DESCRIPTION
  Ochiladi:   HTTPS (TCP), WebRTC ICE (UDP, ixtiyoriy TCP), ixtiyoriy RTMPS, ixtiyoriy TURN.
  RTMP:       FAQAT -RtmpRemote da ko'rsatilgan manbalardan (VPN tarmog'i / tunnel IP lari).
  Ochilmaydi: MediaMTX API (9997), WebRTC signalling (8889), ichki port (9180) - ular 127.0.0.1 da.
  Default: faqat nima qilinishini ko'rsatadi. Haqiqatan qo'shish uchun -Apply.
.EXAMPLE   powershell -File scripts\firewall-rules.ps1 -RtmpRemote 10.8.0.0/24
.EXAMPLE   powershell -File scripts\firewall-rules.ps1 -RtmpRemote 10.8.0.0/24 -Apply
#>
param(
  [int]$HttpsPort = 8443,
  [int]$WebRtcUdpPort = 8189,
  [int]$WebRtcTcpPort = 0,
  [int]$RtmpPort = 1935,
  [string[]]$RtmpRemote = @(),
  [int]$RtmpsPort = 0,
  [int]$TurnPort = 0,
  [string]$TurnRelayRange = "50000-50100",
  [switch]$Apply,
  [switch]$Remove
)
. (Join-Path $PSScriptRoot "common.ps1")
$prefix = "DronStream"
if ($Remove) {
  if (-not (Test-DsAdmin)) { throw "Administrator sifatida ishga tushiring" }
  Get-NetFirewallRule -DisplayName "$prefix *" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Write-Host "DronStream qoidalari olib tashlandi."
  exit 0
}
$rules = @(
  @{ n = "$prefix HTTPS"; p = "TCP"; port = "$HttpsPort"; r = "Any" },
  @{ n = "$prefix WebRTC UDP"; p = "UDP"; port = "$WebRtcUdpPort"; r = "Any" }
)
if ($WebRtcTcpPort) { $rules += @{ n = "$prefix WebRTC TCP"; p = "TCP"; port = "$WebRtcTcpPort"; r = "Any" } }
if ($RtmpRemote.Count -gt 0) { $rules += @{ n = "$prefix RTMP (faqat VPN)"; p = "TCP"; port = "$RtmpPort"; r = $RtmpRemote } }
else { Write-Warning "RTMP uchun qoida qo'shilmaydi: -RtmpRemote (masalan VPN tarmog'i 10.8.0.0/24) ko'rsatilmagan. RTMP ni internetga ochmang." }
if ($RtmpsPort) { $rules += @{ n = "$prefix RTMPS"; p = "TCP"; port = "$RtmpsPort"; r = "Any" } }
if ($TurnPort) {
  $rules += @{ n = "$prefix TURN UDP"; p = "UDP"; port = "$TurnPort"; r = "Any" }
  $rules += @{ n = "$prefix TURN TCP"; p = "TCP"; port = "$TurnPort"; r = "Any" }
  $rules += @{ n = "$prefix TURN relay"; p = "UDP"; port = $TurnRelayRange; r = "Any" }
}
foreach ($x in $rules) { Write-Host ("{0,-28} {1} {2,-12} manba: {3}" -f $x.n, $x.p, $x.port, ($x.r -join ",")) }
if (-not $Apply) { Write-Host "`nHech narsa o'zgartirilmadi. Qo'shish uchun -Apply bilan qayta ishga tushiring." -ForegroundColor Yellow; exit 0 }
if (-not (Test-DsAdmin)) { throw "Administrator sifatida ishga tushiring" }
foreach ($x in $rules) {
  Get-NetFirewallRule -DisplayName $x.n -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName $x.n -Direction Inbound -Action Allow -Protocol $x.p -LocalPort $x.port -RemoteAddress $x.r -Profile Any | Out-Null
}
Write-Host "Qoidalar qo'shildi." -ForegroundColor Green
