# Shared helpers for DronStream scripts. ROOT defaults to the parent of this
# scripts folder (installed layout: <ROOT>\scripts\*.ps1).
$ErrorActionPreference = "Stop"

function Resolve-DsRoot([string]$Root) {
  if ($Root) { return (Resolve-Path $Root).Path }
  return (Split-Path $PSScriptRoot -Parent)
}

function Get-DsActiveVersion([string]$Root) {
  $f = Join-Path $Root "app\active.txt"
  if (-not (Test-Path $f)) { throw "Faol versiya topilmadi: $f (avval install.ps1 ni ishga tushiring)" }
  return (Get-Content $f -Raw).Trim()
}

function Get-DsExe([string]$Root, [string]$Version) {
  if (-not $Version) { $Version = Get-DsActiveVersion $Root }
  $exe = Join-Path $Root "app\$Version\dronstream.exe"
  if (-not (Test-Path $exe)) { throw "Topilmadi: $exe" }
  return $exe
}

function Test-DsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DsService { Get-Service -Name "DronStream" -ErrorAction SilentlyContinue }

function ConvertFrom-DsSecure([Security.SecureString]$s) {
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

function Read-DsPassphrase([string]$Prompt, [switch]$Confirm) {
  $p1 = ConvertFrom-DsSecure (Read-Host -AsSecureString $Prompt)
  if ($Confirm) {
    $p2 = ConvertFrom-DsSecure (Read-Host -AsSecureString "Qayta kiriting")
    if ($p1 -ne $p2) { throw "Parollar mos emas" }
  }
  if ($p1.Length -lt 12) { throw "Backup paroli kamida 12 belgi bo'lishi kerak" }
  return $p1
}

# Runs dronstream.exe with the passphrase in a process-scoped environment
# variable (never on the command line, so it does not appear in process lists).
function Invoke-DsWithPassphrase([string]$Exe, [string[]]$DsArgs, [string]$Pass) {
  $env:DRONSTREAM_BACKUP_PASSPHRASE = $Pass
  try { & $Exe @DsArgs; return $LASTEXITCODE } finally { Remove-Item Env:DRONSTREAM_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue }
}

function Wait-DsHealthy([string]$Exe, [string]$Root, [int]$Seconds = 30) {
  for ($i = 0; $i -lt $Seconds; $i++) {
    & $Exe status --root $Root *> $null
    if ($LASTEXITCODE -eq 0) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Test-DsRunning([string]$Exe, [string]$Root) {
  & $Exe status --root $Root *> $null
  return ($LASTEXITCODE -eq 0)
}
