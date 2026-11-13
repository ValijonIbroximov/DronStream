# DronStream: shared helpers for DronStreamStart / DronStreamTayyorla / push / pull.
# Windows PowerShell 5.1 compatible. ASCII only (PS 5.1 reads BOM-less files as ANSI).
# All paths are derived from this file's location; nothing is hard-coded.
$ErrorActionPreference = "Stop"

# ---- pinned toolchain (source checkout only; a release package needs none) ----
$script:DS_GO_VERSION = "1.27.4"
$script:DS_GO_SHA256 = "178ab98950ac69ab25069307dc6ade79f3816e414cce95b4da166a115cde1e7e"   # go1.27.4.windows-amd64.zip (go.dev)
$script:DS_NODE_VERSION = "22.23.5"
$script:DS_NODE_SHA256 = "4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3" # node-v22.23.5-win-x64.zip (nodejs.org SHASUMS256)
$script:DS_MTX_VERSION = "v1.21.3"
$script:DS_MTX_SHA256 = "b2f5246b07cb72961df03b8d5e8cad43dc657bcf3f49a87bb031bdf22721af74"  # mediamtx_v1.21.3_windows_amd64.zip (GitHub release checksums.sha256)

# exit codes
$script:EX_OK = 0; $script:EX_FAIL = 1; $script:EX_PORT = 2; $script:EX_LOCKED = 3; $script:EX_MANUAL = 4
$script:EX_PLATFORM = 5; $script:EX_OFFLINE = 6; $script:EX_RUNNING = 7

function Get-DsContext {
  $base = Split-Path $PSScriptRoot -Parent
  $c = [ordered]@{ Base = $base; Mode = ""; Root = ""; Exe = ""; Version = "" }
  if (Test-Path (Join-Path $base "backend\go.mod")) {
    $c.Mode = "source"
    $c.Root = Join-Path $base "runtime"
    $c.Exe = Join-Path $base "build\dronstream.exe"
  } elseif ((Test-Path (Join-Path $base "app")) -and ((Test-Path (Join-Path $base "VERSION")) -or (Test-Path (Join-Path $base "app\active.txt")))) {
    $c.Mode = "package"
    $c.Root = $base
    $act = Join-Path $base "app\active.txt"
    if (Test-Path $act) { $c.Version = (Get-Content $act -Raw).Trim() }
    elseif (Test-Path (Join-Path $base "VERSION")) { $c.Version = (Get-Content (Join-Path $base "VERSION") -Raw).Trim() }
    $c.Exe = Join-Path $base ("app\" + $c.Version + "\dronstream.exe")
  } else {
    $c.Mode = "unknown"
  }
  return [pscustomobject]$c
}

# ---- logging (console + file; secrets masked; setup codes are never logged) ----
$script:DsLogFile = $null
function Start-DsLog($ctx, [string]$name) {
  $dir = if ($ctx.Root) { Join-Path $ctx.Root "logs" } else { Join-Path $env:TEMP "DronStream-logs" }
  New-Item -ItemType Directory -Force $dir | Out-Null
  $script:DsLogFile = Join-Path $dir ("{0}-{1}.log" -f $name, (Get-Date -Format "yyyyMMdd-HHmmss"))
  Write-DsLog ("DronStream {0} | rejim: {1} | papka: {2}" -f $name, $ctx.Mode, $ctx.Base)
}
function Protect-DsText([string]$s) {
  $s = $s -replace '(?i)((?:key|token|pass|password|secret|ticket)=)[^&\s"'']+', '$1***'
  $s = $s -replace '(?i)(bearer\s+)\S+', '$1***'
  $s = $s -replace '(https?://)[^/@\s:]+:[^/@\s]+@', '$1***@'
  $s = $s -replace '#[A-Za-z0-9_-]{20,}', '#***'
  return $s
}
function Write-DsLog([string]$msg, [string]$level = "INFO") {
  $line = "{0} {1} {2}" -f (Get-Date -Format "HH:mm:ss"), $level, (Protect-DsText $msg)
  if ($script:DsLogFile) { Add-Content -Path $script:DsLogFile -Value $line -Encoding UTF8 }
  $color = @{ INFO = "Gray"; OK = "Green"; WARN = "Yellow"; ERR = "Red"; STEP = "Cyan" }[$level]
  if (-not $color) { $color = "Gray" }
  Write-Host $msg -ForegroundColor $color
}
function Write-DsConsoleOnly([string]$msg, [string]$color = "Yellow") { Write-Host $msg -ForegroundColor $color }
function Stop-DsWith([int]$code, [string]$msg) {
  Write-DsLog $msg "ERR"
  if ($script:DsLogFile) { Write-Host ("Log: " + $script:DsLogFile) -ForegroundColor DarkGray }
  exit $code
}

# ---- single-instance lock (released automatically when the process exits) ----
function Enter-DsLock($ctx, [string]$name) {
  $dir = Join-Path $env:TEMP "DronStream-locks"
  New-Item -ItemType Directory -Force $dir | Out-Null
  $sha = New-Object Security.Cryptography.SHA1Managed
  $id = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($ctx.Base.ToLowerInvariant())))).Replace("-", "").Substring(0, 12)
  $p = Join-Path $dir "$id-$name.lock"
  try { return [IO.File]::Open($p, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) } catch { return $null }
}

# ---- native calls (PS 5.1 turns stderr into errors under Stop) ----
function Invoke-DsNative([string]$exe, [string[]]$argv, [switch]$Quiet, [string]$WorkDir) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  if ($WorkDir) { Push-Location $WorkDir }
  try {
    $out = & $exe @argv 2>&1 | ForEach-Object { "$_" }
    $code = $LASTEXITCODE
  } finally {
    if ($WorkDir) { Pop-Location }
    $ErrorActionPreference = $old
  }
  if (-not $Quiet) { $out | ForEach-Object { Write-DsLog ("  " + $_) } }
  return [pscustomobject]@{ Code = $code; Out = ($out -join "`n") }
}

function Invoke-DsCheck($ctx) {
  if (-not (Test-Path $ctx.Exe)) { return $null }
  $r = Invoke-DsNative $ctx.Exe @("check", "--root", $ctx.Root, "--json") -Quiet
  try { return ($r.Out | ConvertFrom-Json) } catch { return $null }
}

function Get-DsPortOwner([string]$proto, [string]$addr) {
  $port = [int]($addr -replace '.*:', '')
  try {
    if ($proto -eq "udp") { $e = Get-NetUDPEndpoint -LocalPort $port -ErrorAction Stop | Select-Object -First 1 }
    else { $e = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1 }
    $p = Get-Process -Id $e.OwningProcess -ErrorAction Stop
    return ("{0} (PID {1})" -f $p.ProcessName, $p.Id)
  } catch { return "noma'lum jarayon" }
}

function Test-DsOnline([string]$url = "https://go.dev") {
  try { Invoke-WebRequest -UseBasicParsing -Method Head -Uri $url -TimeoutSec 8 | Out-Null; return $true } catch { return $false }
}

function Get-DsFile([string]$url, [string]$out, [string]$sha256) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Write-DsLog ("Yuklab olinmoqda: " + $url) "STEP"
  $ProgressPreference = "SilentlyContinue"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out
  $h = (Get-FileHash $out -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($h -ne $sha256) { Remove-Item $out -Force; throw ("Checksum mos emas: " + $url) }
  Write-DsLog "  checksum (SHA256) tekshirildi" "OK"
}

# Toolchain directory: <project>\.tools when the path is short enough for the
# deepest archive entries (Windows PowerShell 5.1 cannot extract paths longer
# than 260 characters); otherwise a short per-project folder under LOCALAPPDATA.
function Get-DsToolsDir($ctx) {
  $local = Join-Path $ctx.Base ".tools"
  if (($local.Length + 140) -le 250 -or (Test-Path (Join-Path $local "go\bin\go.exe"))) { return $local }
  $sha = New-Object Security.Cryptography.SHA1Managed
  $id = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($ctx.Base.ToLowerInvariant())))).Replace("-", "").Substring(0, 8)
  return (Join-Path $env:LOCALAPPDATA ("DronStream\t-" + $id))
}

# Report unexpected errors with their reason and the log path (never silent).
function Write-DsUnexpected($err) {
  Write-DsLog ("Kutilmagan xato: " + $err.Exception.Message + " (" + $err.InvocationInfo.PositionMessage.Split("`n")[0].Trim() + ")") "ERR"
  if ($script:DsLogFile) { Write-Host ("Log: " + $script:DsLogFile) -ForegroundColor DarkGray }
}
